const Joi = require('joi');
const logger = require('../utils/logger');
const emailService = require('../services/emailService');
const { publishToKafka } = require('../kafka/producer');
const idempotency = require('../utils/idempotency');
const validator = require('../utils/validator');

// In-memory metrics (replace with Redis/Prometheus in production)
const metrics = {
  emailsSent: 0,
  emailsFailed: 0,
  emailsRetried: 0,
  emailsProcessed: 0,
  startTime: Date.now()
};

/**
 * Send email via Kafka queue (async)
 */
async function sendEmail(req, res) {
  const requestId = req.requestId;

  try {
    // Validate request payload
    const { error, value } = validator.validateEmailPayload(req.body);
    if (error) {
      logger.warn('Email validation failed', { requestId, error: error.details });
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details,
        requestId
      });
    }

    const emailPayload = value;
    emailPayload.requestId = requestId;
    emailPayload.timestamp = new Date().toISOString();

    // Check idempotency
    if (emailPayload.idempotencyKey) {
      const isDuplicate = await idempotency.checkDuplicate(emailPayload.idempotencyKey);
      if (isDuplicate) {
        logger.info('Duplicate email request detected', {
          requestId,
          idempotencyKey: emailPayload.idempotencyKey
        });
        return res.status(202).json({
          message: 'Email already processed',
          idempotencyKey: emailPayload.idempotencyKey,
          requestId
        });
      }

      await idempotency.markAsProcessed(emailPayload.idempotencyKey);
    }

    // Send to Kafka
    await publishToKafka(process.env.KAFKA_TOPIC_SEND || 'email.send', emailPayload);

    const templateName = emailPayload.templateId || emailPayload.template;
    logger.info('Email queued successfully', {
      requestId,
      to: emailPayload.to,
      template: templateName
    });

    res.status(202).json({
      message: 'Email queued for processing',
      requestId
    });
  } catch (error) {
    logger.error('Failed to queue email', { requestId, error: error.message, stack: error.stack });
    res.status(500).json({
      error: 'Internal server error',
      requestId
    });
  }
}

/**
 * Send email synchronously (for testing)
 */
async function sendEmailSync(req, res) {
  const requestId = req.requestId;

  try {
    // Validate request payload
    const { error, value } = validator.validateEmailPayload(req.body);
    if (error) {
      logger.warn('Email validation failed', { requestId, error: error.details });
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details,
        requestId
      });
    }

    const emailPayload = value;
    emailPayload.requestId = requestId;
    emailPayload.timestamp = new Date().toISOString();

    // Check idempotency
    if (emailPayload.idempotencyKey) {
      const isDuplicate = await idempotency.checkDuplicate(emailPayload.idempotencyKey);
      if (isDuplicate) {
        logger.info('Duplicate email request detected', {
          requestId,
          idempotencyKey: emailPayload.idempotencyKey
        });
        return res.status(200).json({
          message: 'Email already processed',
          idempotencyKey: emailPayload.idempotencyKey,
          requestId
        });
      }

      await idempotency.markAsProcessed(emailPayload.idempotencyKey);
    }

    // Send email directly
    const result = await emailService.sendEmail(emailPayload);

    const templateName = emailPayload.templateId || emailPayload.template;

    metrics.emailsSent++;
    metrics.emailsProcessed++;

    logger.info('Email sent successfully (sync)', {
      requestId,
      to: emailPayload.to,
      template: templateName,
      messageId: result.messageId
    });

    res.status(200).json({
      message: 'Email sent successfully',
      messageId: result.messageId,
      requestId
    });
  } catch (error) {
    metrics.emailsFailed++;
    metrics.emailsProcessed++;

    logger.error('Failed to send email (sync)', {
      requestId,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Failed to send email',
      message: error.message,
      requestId
    });
  }
}

/**
 * Get service metrics
 */
function getMetrics(req, res) {
  const uptime = Date.now() - metrics.startTime;

  res.status(200).json({
    metrics: {
      emails_sent_total: metrics.emailsSent,
      emails_failed_total: metrics.emailsFailed,
      emails_retried_total: metrics.emailsRetried,
      emails_processed_total: metrics.emailsProcessed,
      service_uptime_ms: uptime,
      service_uptime_seconds: Math.floor(uptime / 1000)
    },
    timestamp: new Date().toISOString()
  });
}

// Export metrics for use by Kafka consumer
function incrementMetric(metric) {
  if (metrics.hasOwnProperty(metric)) {
    metrics[metric]++;
  }
}

module.exports = {
  sendEmail,
  sendEmailSync,
  getMetrics,
  incrementMetric
};
