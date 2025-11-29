const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../utils/logger');
const { OAuth2Client } = require('google-auth-library');

const metrics = {
  connectionAttempts: 0,
  connectionSuccesses: 0,
  connectionFailures: 0,
  emailsSent: 0,
  emailsFailed: 0
};

class EmailService {
  constructor() {
    this.transporter = null;
    this.templateCache = new Map();
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

    /** Base SMTP config */
    const config = {
      ...(options.service || process.env.EMAIL_SERVICE
        ? { service: options.service || process.env.EMAIL_SERVICE }
        : {}),
      host: options.host || process.env.EMAIL_HOST,
      port: parseInt(options.port || process.env.EMAIL_PORT) || 587,
      secure: options.secure || process.env.EMAIL_SECURE === 'true' || false,
      pool: true,
      maxConnections: parseInt(process.env.EMAIL_MAX_CONNECTIONS) || 5,
      maxMessages: parseInt(process.env.EMAIL_MAX_MESSAGES) || 100,
      tls: {
        rejectUnauthorized: process.env.EMAIL_TLS_REJECT_UNAUTHORIZED !== 'false',
        minVersion: process.env.EMAIL_TLS_MIN_VERSION || 'TLSv1.2'
      },
      logger: process.env.EMAIL_DEBUG === 'true' ? console : false,
      debug: process.env.EMAIL_DEBUG === 'true'
    };

    /** AUTH CONFIG */

    // OAuth2 ONLY for Gmail
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

      // Generate access token on the fly
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
      // NORMAL SMTP LOGIN
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
    metrics.connectionAttempts++;

    while (attempts < retries) {
      try {
        await this.transporter.verify();
        metrics.connectionSuccesses++;
        return { success: true, message: '✅ Email service is ready', metrics };
      } catch (error) {
        attempts++;
        metrics.connectionFailures++;

        if (attempts === retries) {
          const fallback = this.createFallbackTransporter();

          if (fallback) {
            try {
              await fallback.verify();
              return {
                success: true,
                message: 'Fallback email service verified',
                metrics
              };
            } catch (fallbackError) {
              return {
                success: false,
                error: fallbackError.message,
                metrics
              };
            }
          }

          return {
            success: false,
            error: error.message,
            metrics
          };
        }

        await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, attempts - 1)));
      }
    }
  }

  /** Load template */
  async loadTemplate(templateName) {
    try {
      if (this.templateCache.has(templateName)) return this.templateCache.get(templateName);

      const templateFile = process.env.TEMPLATE_FILE || 'src/templates/emailTemplate.js';
      const templatePath = path.join(process.cwd(), templateFile);

      await fs.access(templatePath);

      delete require.cache[require.resolve(templatePath)];

      const templates = require(templatePath);

      const template = templates[templateName];

      if (!template) {
        throw new Error(`Template not found: ${templateName}`);
      }

      this.templateCache.set(templateName, template);
      return template;
    } catch (error) {
      logger.error('Template load failed', { templateName, error: error.message });
      throw error;
    }
  }

  /** Render template */
  async renderTemplate(templateName, data) {
    const template = await this.loadTemplate(templateName);
    const rendered = template(data);

    if (!rendered.subject || !rendered.html) {
      throw new Error('Template must return subject & html');
    }

    return rendered;
  }

  /** Send email */
  async sendEmail(payload) {
    const { to, from, templateId,type, data = {}, cc, bcc, attachments } = payload;

    const templateName = templateId||type;

    const { subject, html, text } = await this.renderTemplate(templateName, data);

    const mailOptions = {
      from:
        from || `${process.env.DEFAULT_FROM_NAME || 'Company'} <${process.env.DEFAULT_FROM_EMAIL}>`,
      to,
      subject,
      html,
      text,
      cc,
      bcc,
      attachments
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);

      logger.info('Email sent', {
        to: this.sanitizeEmailForLog(to),
        template: templateName
      });

      return {
        success: true,
        messageId: info.messageId
      };
    } catch (error) {
      logger.error('Email sending failed', {
        to: this.sanitizeEmailForLog(to),
        error: error.message
      });
      throw error;
    }
  }

  /** Verify */
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
