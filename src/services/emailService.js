const nodemailer = require('nodemailer');
const logger = require('../utils/logger');
const { OAuth2Client } = require('google-auth-library');
const { circuitBreakers } = require('../utils/circuitBreaker');
const { metrics } = require('../utils/metrics');
const { EmailDeliveryError, TemplateError, ServiceUnavailableError } = require('../utils/errors');
const env = require('../config/env');

// O(1) retryable SMTP code lookup
const RETRYABLE_SMTP_CODES = new Set([421, 450, 451, 452]);

class EmailService {
  constructor() {
    this.transporter = null;
    this.templateCache = new Map();
    this.circuitBreaker = circuitBreakers.email;
    this._oauth2Client = null; // Cached OAuth2 client
    this.initializeTransporter();
    this._preloadTemplates();
  }

  /** Pre-load ALL templates into cache at startup — zero I/O on hot path */
  _preloadTemplates() {
    try {
      const templates = require('../templates/emailTemplate');
      let count = 0;
      for (const [name, fn] of Object.entries(templates)) {
        if (typeof fn === 'function') {
          this.templateCache.set(name, fn);
          count++;
        }
      }
      logger.info(`Pre-loaded ${count} email templates into cache`);
    } catch (error) {
      logger.error('Failed to pre-load templates', { error: error.message });
    }
  }

  /** Validate ENV variables */
  validateEnvVariables(options = {}) {
    const requiredVars = ['EMAIL_USER', 'EMAIL_HOST', 'EMAIL_PORT'];
    if (options.service && !options.host && !options.port) return;

    const missingVars = requiredVars.filter(v => !env[v] && !options[v.toLowerCase()]);
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
  }

  /** Get or create OAuth2 client (cached singleton) */
  _getOAuth2Client() {
    if (!this._oauth2Client) {
      this._oauth2Client = new OAuth2Client(
        env.OAUTH2_CLIENT_ID,
        env.OAUTH2_CLIENT_SECRET,
        env.OAUTH2_REDIRECT_URI
      );
      this._oauth2Client.setCredentials({
        refresh_token: env.OAUTH2_REFRESH_TOKEN
      });
    }
    return this._oauth2Client;
  }

  /** Initialize transporter */
  initializeTransporter(options = {}) {
    this.validateEnvVariables(options);

    const isGmail = options.service === 'gmail' || env.EMAIL_SERVICE === 'gmail';

    // Optimized SMTP config for high throughput
    const config = {
      ...(options.service || env.EMAIL_SERVICE
        ? { service: options.service || env.EMAIL_SERVICE }
        : {}),
      host: options.host || env.EMAIL_HOST,
      port: parseInt(options.port) || env.EMAIL_PORT,
      secure: options.secure || env.EMAIL_SECURE,
      pool: true,
      maxConnections: env.EMAIL_MAX_CONNECTIONS,
      maxMessages: env.EMAIL_MAX_MESSAGES,
      rateDelta: env.EMAIL_RATE_DELTA,
      rateLimit: env.EMAIL_RATE_LIMIT,
      tls: {
        rejectUnauthorized: env.EMAIL_TLS_REJECT_UNAUTHORIZED,
        minVersion: env.EMAIL_TLS_MIN_VERSION
      },
      logger: env.EMAIL_DEBUG ? console : false,
      debug: env.EMAIL_DEBUG,
      greetingTimeout: 10000,
      connectionTimeout: 10000,
      socketTimeout: 30000
    };

    /** AUTH CONFIG */
    if (
      isGmail &&
      env.OAUTH2_CLIENT_ID &&
      env.OAUTH2_CLIENT_SECRET &&
      env.OAUTH2_REFRESH_TOKEN
    ) {
      config.auth = {
        type: 'OAuth2',
        user: options.user || env.EMAIL_USER,
        clientId: env.OAUTH2_CLIENT_ID,
        clientSecret: env.OAUTH2_CLIENT_SECRET,
        refreshToken: env.OAUTH2_REFRESH_TOKEN
      };

      // Reuse cached OAuth2 client instead of creating one per token refresh
      config.auth.accessToken = async () => {
        const client = this._getOAuth2Client();
        const { token } = await client.getAccessToken();
        return token;
      };
    } else {
      config.auth = {
        user: options.user || env.EMAIL_USER,
        pass: options.pass || env.EMAIL_PASS
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
    if (!env.FALLBACK_EMAIL_HOST && !env.FALLBACK_EMAIL_SERVICE) return null;

    return (this.transporter = nodemailer.createTransport({
      service: env.FALLBACK_EMAIL_SERVICE,
      host: env.FALLBACK_EMAIL_HOST,
      port: env.FALLBACK_EMAIL_PORT,
      secure: env.FALLBACK_EMAIL_SECURE,
      auth: {
        user: env.FALLBACK_EMAIL_USER,
        pass: env.FALLBACK_EMAIL_PASS
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

  /** Load template — cache-first, no filesystem I/O on hot path */
  loadTemplate(templateName) {
    const cached = this.templateCache.get(templateName);
    if (cached) return cached;

    // Fallback: try to load dynamically (should never happen after pre-load)
    const templates = require('../templates/emailTemplate');
    const template = templates[templateName];

    if (!template) {
      throw new TemplateError(`Template not found: ${templateName}`, templateName);
    }

    this.templateCache.set(templateName, template);
    return template;
  }

  /** Render template — synchronous, no async overhead */
  renderTemplate(templateName, data) {
    const template = this.loadTemplate(templateName);
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
        const { subject, html, text } = this.renderTemplate(templateName, data);

        const mailOptions = {
          from: from || `${env.DEFAULT_FROM_NAME} <${env.DEFAULT_FROM_EMAIL}>`,
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
          RETRYABLE_SMTP_CODES.has(error.responseCode)
        );
      }

      throw error;
    }
  }

  /** Check if SMTP error is retryable — O(1) Set lookup */
  isRetryableSmtpError(code) {
    return RETRYABLE_SMTP_CODES.has(code);
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
    if (Array.isArray(email)) {
      return email.map(e => this.sanitizeEmailForLog(e));
    }
    if (typeof email === 'string') {
      const atIdx = email.indexOf('@');
      if (atIdx < 0) return email;
      return `${email.slice(0, 2)}***${email.slice(atIdx)}`;
    }
    return email;
  }
}

// Export singleton instance
const emailService = new EmailService();
module.exports = emailService;
