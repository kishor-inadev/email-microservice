const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    this.transporter = null;
    this.templateCache = new Map();
    this.initializeTransporter();
  }

  /**
   * Initialize nodemailer transporter
   */
  initializeTransporter() {
    const config = {
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT) || 1025,
      secure: process.env.SMTP_SECURE === 'true'
    };

    // Add authentication if credentials are provided
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      config.auth = {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      };
    }

    this.transporter = nodemailer.createTransport(config);
    logger.info('Email transporter initialized', {
      host: config.host,
      port: config.port,
      secure: config.secure,
      hasAuth: !!config.auth
    });
  }

  /**
   * Load and cache template
   */
  async loadTemplate(templateName) {
    if (this.templateCache.has(templateName)) {
      return this.templateCache.get(templateName);
    }

    const templateDir = process.env.TEMPLATE_DIR || 'src/templates';
    const templatePath = path.join(process.cwd(), templateDir, `${templateName}.js`);

    try {
      // Check if template file exists
      await fs.access(templatePath);

      // Clear require cache to allow hot reloading
      delete require.cache[require.resolve(templatePath)];

      // Load template
      const template = require(templatePath);

      if (typeof template !== 'function') {
        throw new Error(`Template ${templateName} must export a function`);
      }

      // Cache template
      this.templateCache.set(templateName, template);

      logger.debug('Template loaded and cached', { templateName, templatePath });
      return template;
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`Template not found: ${templateName}`);
      }
      throw new Error(`Failed to load template ${templateName}: ${error.message}`);
    }
  }

  /**
   * Render email template
   */
  async renderTemplate(templateName, data) {
    try {
      const template = await this.loadTemplate(templateName);
      const rendered = template(data);

      // Validate rendered output
      if (!rendered || typeof rendered !== 'object') {
        throw new Error('Template must return an object');
      }

      const { subject, html, text } = rendered;

      if (!subject || !html) {
        throw new Error('Template must return object with subject and html properties');
      }

      return { subject, html, text: text || '' };
    } catch (error) {
      logger.error('Template rendering failed', {
        templateName,
        error: error.message,
        data: this.sanitizeLogData(data)
      });
      throw error;
    }
  }

  /**
   * Send email
   */
  async sendEmail(emailPayload) {
    const {
      to,
      from,
      template,
      templateId,
      data = {},
      cc,
      bcc,
      attachments,
      requestId
    } = emailPayload;

    // Use templateId if provided, otherwise fall back to template
    const templateName = templateId || template;

    if (!templateName) {
      throw new Error('Either template or templateId must be provided');
    }

    try {
      // Render template
      const { subject, html, text } = await this.renderTemplate(templateName, data);

      // Prepare email options
      const mailOptions = {
        from:
          from ||
          `${process.env.DEFAULT_FROM_NAME || 'Company'} <${process.env.DEFAULT_FROM_EMAIL}>`,
        to,
        subject,
        html,
        text,
        cc,
        bcc,
        attachments
      };

      // Send email
      const info = await this.transporter.sendMail(mailOptions);

      logger.info('Email sent successfully', {
        requestId,
        messageId: info.messageId,
        to: this.sanitizeEmailForLog(to),
        template: templateName,
        accepted: info.accepted?.length || 0,
        rejected: info.rejected?.length || 0
      });

      return {
        success: true,
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected
      };
    } catch (error) {
      logger.error('Email sending failed', {
        requestId,
        error: error.message,
        to: this.sanitizeEmailForLog(to),
        template: templateName,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Verify transporter connection
   */
  async verifyConnection() {
    try {
      await this.transporter.verify();
      logger.info('Email transporter connection verified');
      return true;
    } catch (error) {
      logger.error('Email transporter verification failed', { error: error.message });
      return false;
    }
  }

  /**
   * Clear template cache
   */
  clearTemplateCache() {
    this.templateCache.clear();
    logger.info('Template cache cleared');
  }

  /**
   * Sanitize email addresses for logging (privacy)
   */
  sanitizeEmailForLog(email) {
    if (!email) return email;
    if (typeof email === 'string') {
      const [user, domain] = email.split('@');
      return `${user.substring(0, 2)}***@${domain}`;
    }
    if (Array.isArray(email)) {
      return email.map(e => this.sanitizeEmailForLog(e));
    }
    return email;
  }

  /**
   * Sanitize data for logging (remove sensitive information)
   */
  sanitizeLogData(data) {
    if (!data || typeof data !== 'object') return data;

    const sanitized = { ...data };

    // Remove common sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth', 'credential'];

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}

// Export singleton instance
const emailService = new EmailService();
module.exports = emailService;
