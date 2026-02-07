const logger = require('../utils/logger');
const emailService = require('../services/emailService');
const idempotency = require('../utils/idempotency');
const validator = require('../utils/validator');
const mongoService = require('../services/mongoService');
const { metrics } = require('../utils/metrics');
const { ValidationError, ServiceUnavailableError } = require('../utils/errors');

const ENABLE_KAFKA = process.env.ENABLE_KAFKA === 'true';
let publishToKafka = null;

if (ENABLE_KAFKA) {
  publishToKafka = require('../kafka/producer').publishToKafka;
}

/**
 * Send email via Kafka queue (async)
 */
async function sendEmail(req, res) {
  const requestId = req.requestId;

  // Validate request payload
  const { error, value } = validator.validateEmailPayload(req.body);
  if (error) {
    logger.warn('Email validation failed', { requestId, error: error.details });
    throw new ValidationError('Validation failed', error.details);
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
        success: true,
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
    metrics.recordEmailQueued({ template: emailPayload.templateId || emailPayload.template });

    const templateName = emailPayload.templateId || emailPayload.template;
    logger.info('Email queued to Kafka successfully', {
      requestId,
      to: emailPayload.to,
      template: templateName
    });

    res.status(202).json({
      success: true,
      message: 'Email queued for processing',
      requestId
    });
  } else {
    // Process email directly without Kafka
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

    const templateName = emailPayload.templateId || emailPayload.template;
    logger.info('Email sent successfully (HTTP mode)', {
      requestId,
      to: emailPayload.to,
      template: templateName,
      messageId: result.messageId
    });

    res.status(200).json({
      success: true,
      message: 'Email sent successfully',
      messageId: result.messageId,
      requestId
    });
  }
}

/**
 * Send email synchronously (for testing)
 */
async function sendEmailSync(req, res) {
  const requestId = req.requestId;

  // Validate request payload
  const { error, value } = validator.validateEmailPayload(req.body);
  if (error) {
    logger.warn('Email validation failed', { requestId, error: error.details });
    throw new ValidationError('Validation failed', error.details);
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
        success: true,
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

  logger.info('Email sent successfully (sync)', {
    requestId,
    to: emailPayload.to,
    template: templateName,
    messageId: result.messageId
  });

  res.status(200).json({
    success: true,
    message: 'Email sent successfully',
    messageId: result.messageId,
    requestId
  });
}

/**
 * Get service metrics
 */
async function getMetrics(req, res) {
  const metricsData = metrics.getMetrics();

  // Add circuit breaker status
  metricsData.circuitBreakers = {
    email: emailService.getCircuitBreakerStatus(),
    database: mongoService.getCircuitBreakerStatus()
  };

  // Add database stats if connected
  if (mongoService.isConnected()) {
    try {
      metricsData.database = await mongoService.getEmailStats();
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
  if (!mongoService.isConnected()) {
    throw new ServiceUnavailableError('Database not connected', 'mongodb');
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

  res.status(200).json({
    success: true,
    ...result
  });
}

/**
 * Get single email log
 */
async function getEmailLog(req, res) {
  if (!mongoService.isConnected()) {
    throw new ServiceUnavailableError('Database not connected', 'mongodb');
  }

  const { requestId } = req.params;
  const log = await mongoService.getEmailLog(requestId);

  if (!log) {
    return res.status(404).json({
      success: false,
      error: 'NOT_FOUND',
      message: 'Email log not found',
      requestId
    });
  }

  res.status(200).json({
    success: true,
    data: log
  });
}

module.exports = {
  sendEmail,
  sendEmailSync,
  getMetrics,
  getEmailLogs,
  getEmailLog
};
