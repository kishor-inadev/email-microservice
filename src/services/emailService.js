const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../utils/logger');
const { OAuth2Client } = require('google-auth-library');
const { circuitBreakers } = require('../utils/circuitBreaker');
const { metrics } = require('../utils/metrics');
const { EmailDeliveryError, TemplateError, ServiceUnavailableError } = require('../utils/errors');

class EmailService {
  constructor() {
    this.transporter = null;
    this.templateCache = new Map();
    this.circuitBreaker = circuitBreakers.email;
    this.initializeTransporter();
  }

  /** Validate ENV variables */
  validateEnvVariables(options = {}) {
    const requiredVars = ['EMAIL_USER', 'EMAIL_HOST', 'EMAIL_PORT'];

    if (options.service && !options.host && !options.port) return;

    const missingVars = requiredVars.filter(v => !process.env[v] && !options[v.toLowerCase()]);

    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
  }

  /** Initialize transporter */
  initializeTransporter(options = {}) {
    this.validateEnvVariables(options);

    const isGmail = options.service === 'gmail' || process.env.EMAIL_SERVICE === 'gmail';

    // Optimized SMTP config for high throughput
    const config = {
      ...(options.service || process.env.EMAIL_SERVICE
        ? { service: options.service || process.env.EMAIL_SERVICE }
        : {}),
      host: options.host || process.env.EMAIL_HOST,
      port: parseInt(options.port || process.env.EMAIL_PORT) || 587,
      secure: options.secure || process.env.EMAIL_SECURE === 'true' || false,
      pool: true,
      maxConnections: parseInt(process.env.EMAIL_MAX_CONNECTIONS) || 20, // Increased for high throughput
      maxMessages: parseInt(process.env.EMAIL_MAX_MESSAGES) || 500, // Increased for high throughput
      rateDelta: parseInt(process.env.EMAIL_RATE_DELTA) || 1000,
      rateLimit: parseInt(process.env.EMAIL_RATE_LIMIT) || 50, // Max emails per rateDelta
      tls: {
        rejectUnauthorized: process.env.EMAIL_TLS_REJECT_UNAUTHORIZED !== 'false',
        minVersion: process.env.EMAIL_TLS_MIN_VERSION || 'TLSv1.2'
      },
      logger: process.env.EMAIL_DEBUG === 'true' ? console : false,
      debug: process.env.EMAIL_DEBUG === 'true',
      // Connection pool optimizations
      greetingTimeout: 10000,
      connectionTimeout: 10000,
      socketTimeout: 30000
    };

    /** AUTH CONFIG */
    if (
      isGmail &&
      process.env.OAUTH2_CLIENT_ID &&
      process.env.OAUTH2_CLIENT_SECRET &&
      process.env.OAUTH2_REFRESH_TOKEN
    ) {
      config.auth = {
        type: 'OAuth2',
        user: options.user || process.env.EMAIL_USER,
        clientId: process.env.OAUTH2_CLIENT_ID,
        clientSecret: process.env.OAUTH2_CLIENT_SECRET,
        refreshToken: process.env.OAUTH2_REFRESH_TOKEN
      };

      config.auth.accessToken = async () => {
        const oauth2Client = new OAuth2Client(
          process.env.OAUTH2_CLIENT_ID,
          process.env.OAUTH2_CLIENT_SECRET,
          process.env.OAUTH2_REDIRECT_URI || 'https://developers.google.com/oauthplayground'
        );

        oauth2Client.setCredentials({
          refresh_token: process.env.OAUTH2_REFRESH_TOKEN
        });

        const { token } = await oauth2Client.getAccessToken();
        return token;
      };
    } else {
      config.auth = {
        user: options.user || process.env.EMAIL_USER,
        pass: options.pass || process.env.EMAIL_PASS
      };
    }

    this.transporter = nodemailer.createTransport(config);

    logger.info('Email transporter initialized', {
      host: config.host,
      port: config.port,
      secure: config.secure,
      maxConnections: config.maxConnections,
      isGmailOAuth2: isGmail
    });
  }

  /** Fallback transporter (optional) */
  createFallbackTransporter() {
    if (!process.env.FALLBACK_EMAIL_HOST && !process.env.FALLBACK_EMAIL_SERVICE) return null;

    return (this.transporter = nodemailer.createTransport({
      service: process.env.FALLBACK_EMAIL_SERVICE,
      host: process.env.FALLBACK_EMAIL_HOST,
      port: process.env.FALLBACK_EMAIL_PORT,
      secure: process.env.FALLBACK_EMAIL_SECURE === 'true',
      auth: {
        user: process.env.FALLBACK_EMAIL_USER,
        pass: process.env.FALLBACK_EMAIL_PASS
      }
    }));
  }

  /** Verify transporter */
  async verifyEmailConnection(retries = 3, baseDelay = 2000) {
    let attempts = 0;

    while (attempts < retries) {
      try {
        await this.transporter.verify();
        logger.info('Email service connection verified');
        return { success: true, message: '✅ Email service is ready' };
      } catch (error) {
        attempts++;

        if (attempts === retries) {
          const fallback = this.createFallbackTransporter();

          if (fallback) {
            try {
              await fallback.verify();
              return { success: true, message: 'Fallback email service verified' };
            } catch (fallbackError) {
              logger.error('Fallback email verification failed', { error: fallbackError.message });
              return { success: false, error: fallbackError.message };
            }
          }

          logger.error('Email verification failed after retries', { error: error.message });
          return { success: false, error: error.message };
        }

        await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, attempts - 1)));
      }
    }
  }

  /** Load template - optimized caching */
  async loadTemplate(templateName) {
    // Check cache first
    if (this.templateCache.has(templateName)) {
      return this.templateCache.get(templateName);
    }

    try {
      const templateFile = 'src/templates/emailTemplate.js';
      const templatePath = path.join(process.cwd(), templateFile);

      await fs.access(templatePath);

      // Only invalidate cache in development
      if (process.env.NODE_ENV === 'development') {
        delete require.cache[require.resolve(templatePath)];
      }

      const templates = require(templatePath);
      const template = templates[templateName];

      if (!template) {
        throw new TemplateError(`Template not found: ${templateName}`, templateName);
      }

      this.templateCache.set(templateName, template);
      return template;
    } catch (error) {
      if (error instanceof TemplateError) throw error;

      logger.error('Template load failed', { templateName, error: error.message });
      throw new TemplateError(`Failed to load template: ${templateName}`, templateName);
    }
  }

  /** Render template */
  async renderTemplate(templateName, data) {
    const template = await this.loadTemplate(templateName);
    const rendered = template(data);

    if (!rendered.subject || !rendered.html) {
      throw new TemplateError('Template must return subject & html', templateName);
    }

    return rendered;
  }

  /** Send email with circuit breaker protection */
  async sendEmail(payload) {
    const { to, from, templateId, template, data = {}, cc, bcc, attachments } = payload;
    const templateName = templateId || template;

    if (!templateName) {
      throw new TemplateError('Either template or templateId must be provided');
    }

    // Check circuit breaker availability
    if (!this.circuitBreaker.isAvailable()) {
      throw new ServiceUnavailableError('Email service temporarily unavailable', 'email');
    }

    const startTime = Date.now();

    try {
      // Execute through circuit breaker
      const result = await this.circuitBreaker.execute(async () => {
        const { subject, html, text } = await this.renderTemplate(templateName, data);

        const mailOptions = {
          from: from || `${process.env.DEFAULT_FROM_NAME || 'Company'} <${process.env.DEFAULT_FROM_EMAIL}>`,
          to,
          subject,
          html,
          text,
          cc,
          bcc,
          attachments
        };

        return await this.transporter.sendMail(mailOptions);
      });

      const duration = Date.now() - startTime;
      metrics.recordEmailSent(duration, { template: templateName });

      logger.info('Email sent', {
        to: this.sanitizeEmailForLog(to),
        template: templateName,
        messageId: result.messageId,
        duration
      });

      return {
        success: true,
        messageId: result.messageId,
        accepted: result.accepted,
        rejected: result.rejected
      };
    } catch (error) {
      metrics.recordEmailFailed({ template: templateName, error: error.code || 'UNKNOWN' });

      logger.error('Email sending failed', {
        to: this.sanitizeEmailForLog(to),
        template: templateName,
        error: error.message,
        code: error.code
      });

      // Wrap SMTP errors
      if (error.responseCode) {
        throw new EmailDeliveryError(
          `SMTP error: ${error.message}`,
          error.responseCode,
          this.isRetryableSmtpError(error.responseCode)
        );
      }

      throw error;
    }
  }

  /** Check if SMTP error is retryable */
  isRetryableSmtpError(code) {
    const retryableCodes = [421, 450, 451, 452];
    return retryableCodes.includes(code);
  }

  /** Verify connection */
  async verifyConnection() {
    try {
      await this.transporter.verify();
      return true;
    } catch (e) {
      return false;
    }
  }

  /** Clear template cache */
  clearTemplateCache() {
    this.templateCache.clear();
  }

  /** Get circuit breaker status */
  getCircuitBreakerStatus() {
    return this.circuitBreaker.getStatus();
  }

  /** Utility */
  sanitizeEmailForLog(email) {
    if (!email) return '';
    if (typeof email === 'string') {
      const [user, domain] = email.split('@');
      return `${user.slice(0, 2)}***@${domain}`;
    }
    return email;
  }
}

// Export singleton instance
const emailService = new EmailService();
module.exports = emailService;
