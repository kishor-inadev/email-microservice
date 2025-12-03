const Joi = require('joi');
const logger = require('../utils/logger');
const emailService = require('../services/emailService');
const idempotency = require('../utils/idempotency');
const validator = require('../utils/validator');
const mongoService = require('../services/mongoService');

const ENABLE_KAFKA = process.env.ENABLE_KAFKA === 'true';
let publishToKafka = null;

if (ENABLE_KAFKA) {
  publishToKafka = require('../kafka/producer').publishToKafka;
}

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

    // Save to MongoDB
    if (mongoService.isConnected()) {
      await mongoService.saveEmailLog({
        ...emailPayload,
        status: 'queued'
      });
    }

    // Send to Kafka if enabled, otherwise process directly
    if (ENABLE_KAFKA) {
      await publishToKafka(process.env.KAFKA_TOPIC_SEND || 'email.send', emailPayload);

      const templateName = emailPayload.templateId || emailPayload.template;
      logger.info('Email queued to Kafka successfully', {
        requestId,
        to: emailPayload.to,
        template: templateName
      });

      res.status(202).json({
        message: 'Email queued for processing',
        requestId
      });
    } else {
      // Process email directly without Kafka
      try {
        const result = await emailService.sendEmail(emailPayload);

        if (mongoService.isConnected()) {
          await mongoService.updateEmailLog(requestId, {
            status: 'sent',
            messageId: result.messageId,
            sentAt: new Date(),
            metadata: {
              accepted: result.accepted,
              rejected: result.rejected
            }
          });
        }

        metrics.emailsSent++;
        metrics.emailsProcessed++;

        const templateName = emailPayload.templateId || emailPayload.template;
        logger.info('Email sent successfully (HTTP mode)', {
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
        if (mongoService.isConnected()) {
          await mongoService.updateEmailLog(requestId, {
            status: 'failed',
            failedAt: new Date(),
            error: {
              message: error.message,
              code: error.code
            }
          });
        }

        metrics.emailsFailed++;
        metrics.emailsProcessed++;

        throw error;
      }
    }
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

    // Save to MongoDB
    if (mongoService.isConnected()) {
      await mongoService.saveEmailLog({
        ...emailPayload,
        status: 'queued'
      });
    }

    // Send email directly
    const result = await emailService.sendEmail(emailPayload);

    // Update MongoDB with success
    if (mongoService.isConnected()) {
      await mongoService.updateEmailLog(requestId, {
        status: 'sent',
        messageId: result.messageId,
        sentAt: new Date(),
        metadata: {
          accepted: result.accepted,
          rejected: result.rejected
        }
      });
    }

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
    // Update MongoDB with failure
    if (mongoService.isConnected()) {
      await mongoService.updateEmailLog(req.requestId, {
        status: 'failed',
        failedAt: new Date(),
        error: {
          message: error.message,
          code: error.code
        }
      });
    }

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
async function getMetrics(req, res) {
  const uptime = Date.now() - metrics.startTime;

  const metricsData = {
    metrics: {
      emails_sent_total: metrics.emailsSent,
      emails_failed_total: metrics.emailsFailed,
      emails_retried_total: metrics.emailsRetried,
      emails_processed_total: metrics.emailsProcessed,
      service_uptime_ms: uptime,
      service_uptime_seconds: Math.floor(uptime / 1000)
    },
    timestamp: new Date().toISOString()
  };

  if (mongoService.isConnected()) {
    try {
      const dbStats = await mongoService.getEmailStats();
      metricsData.database = dbStats;
    } catch (error) {
      logger.error('Failed to get database stats', { error: error.message });
    }
  }

  res.status(200).json(metricsData);
}

/**
 * Get email logs from database
 */
async function getEmailLogs(req, res) {
  try {
    if (!mongoService.isConnected()) {
      return res.status(503).json({
        error: 'Database not connected'
      });
    }

    const filters = {
      status: req.query.status,
      startDate: req.query.startDate,
      endDate: req.query.endDate
    };

    const options = {
      limit: parseInt(req.query.limit) || 100,
      skip: parseInt(req.query.skip) || 0,
      sort: req.query.sort ? JSON.parse(req.query.sort) : { createdAt: -1 }
    };

    const result = await mongoService.getEmailLogs(filters, options);

    res.status(200).json(result);
  } catch (error) {
    logger.error('Failed to get email logs', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Failed to get email logs',
      message: error.message
    });
  }
}

/**
 * Get single email log
 */
async function getEmailLog(req, res) {
  try {
    if (!mongoService.isConnected()) {
      return res.status(503).json({
        error: 'Database not connected'
      });
    }

    const { requestId } = req.params;
    const log = await mongoService.getEmailLog(requestId);

    if (!log) {
      return res.status(404).json({
        error: 'Email log not found',
        requestId
      });
    }

    res.status(200).json(log);
  } catch (error) {
    logger.error('Failed to get email log', {
      requestId: req.params.requestId,
      error: error.message
    });

    res.status(500).json({
      error: 'Failed to get email log',
      message: error.message
    });
  }
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
  getEmailLogs,
  getEmailLog,
  incrementMetric
};
