const { Kafka } = require('kafkajs');
const logger = require('../utils/logger');
const emailService = require('../services/emailService');
const { publishEmailSuccess, publishEmailFailure } = require('./producer');
const validator = require('../utils/validator');
const mongoService = require('../services/mongoService');
const { circuitBreakers } = require('../utils/circuitBreaker');
const { metrics } = require('../utils/metrics');

class KafkaConsumer {
  constructor() {
    this.kafka = new Kafka({
      clientId: process.env.KAFKA_CLIENT_ID || 'email-microservice',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
      retry: {
        initialRetryTime: 300,
        retries: 10
      }
    });

    this.consumer = this.kafka.consumer({
      groupId: process.env.KAFKA_GROUP_ID || 'email-service-group',
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
      maxBytesPerPartition: 1048576, // 1MB per partition
      maxWaitTimeInMs: 100 // Faster polling for high throughput
    });

    this.circuitBreaker = circuitBreakers.kafka;
    this.retryLimit = parseInt(process.env.EMAIL_RETRY_LIMIT) || 3;
    this.retryBackoff = parseInt(process.env.EMAIL_RETRY_BACKOFF_MS) || 5000;
    this.isRunning = false;
  }

  async start() {
    try {
      await this.consumer.connect();
      logger.info('Kafka consumer connected');

      await this.consumer.subscribe({
        topic: process.env.KAFKA_TOPIC_SEND || 'email.send',
        fromBeginning: false
      });

      await this.consumer.run({
        partitionsConsumedConcurrently: parseInt(process.env.KAFKA_CONCURRENT_PARTITIONS) || 3,
        eachMessage: async ({ topic, partition, message, heartbeat }) => {
          await this.processMessage({ topic, partition, message, heartbeat });
        }
      });

      this.isRunning = true;
      logger.info('Kafka consumer started listening for messages');
    } catch (error) {
      logger.error('Failed to start Kafka consumer', { error: error.message, stack: error.stack });
      throw error;
    }
  }

  async processMessage({ topic, partition, message, heartbeat }) {
    const messageValue = message.value?.toString();
    let emailPayload;
    const startTime = Date.now();

    try {
      // Parse message
      emailPayload = JSON.parse(messageValue);

      // Validate payload
      const { error } = validator.validateKafkaMessage(emailPayload);
      if (error) {
        logger.error('Invalid email payload from Kafka', {
          error: error.details,
          topic,
          partition,
          offset: message.offset
        });
        metrics.recordError('KAFKA_INVALID_PAYLOAD', { topic });
        return; // Skip invalid messages
      }

      metrics.kafkaMessagesConsumed.inc({ topic });

      logger.info('Processing email message from Kafka', {
        requestId: emailPayload.requestId,
        to: emailService.sanitizeEmailForLog(emailPayload.to),
        template: emailPayload.templateId || emailPayload.template,
        topic,
        partition,
        offset: message.offset
      });

      // Send email with retry logic
      await this.sendEmailWithRetry(emailPayload);

      // Call heartbeat to keep consumer alive
      await heartbeat();
    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error('Failed to process Kafka message', {
        error: error.message,
        stack: error.stack,
        topic,
        partition,
        offset: message.offset,
        duration,
        messageValue: messageValue?.substring(0, 500)
      });

      metrics.kafkaErrors.inc({ topic, error: error.code || 'UNKNOWN' });

      // If we have a valid payload, publish to failed topic
      if (emailPayload) {
        try {
          await publishEmailFailure(emailPayload, error, 0);
        } catch (publishError) {
          logger.error('Failed to publish failure message', {
            error: publishError.message,
            originalError: error.message
          });
        }
      }
    }
  }

  async sendEmailWithRetry(emailPayload, retryCount = 0) {
    const startTime = Date.now();

    try {
      // Update status to retrying if this is a retry
      if (retryCount > 0 && mongoService.isConnected()) {
        await mongoService.updateEmailLog(emailPayload.requestId, {
          status: 'retrying',
          retryCount
        });
        metrics.recordEmailRetried({ template: emailPayload.templateId || emailPayload.template });
      }

      const result = await emailService.sendEmail(emailPayload);

      // Update MongoDB with success
      if (mongoService.isConnected()) {
        await mongoService.updateEmailLog(emailPayload.requestId, {
          status: 'sent',
          messageId: result.messageId,
          sentAt: new Date(),
          retryCount,
          metadata: {
            accepted: result.accepted,
            rejected: result.rejected
          }
        });
      }

      // Success - publish success message
      await publishEmailSuccess(emailPayload, result);

      const duration = Date.now() - startTime;

      logger.info('Email sent successfully via Kafka', {
        requestId: emailPayload.requestId,
        messageId: result.messageId,
        to: emailService.sanitizeEmailForLog(emailPayload.to),
        template: emailPayload.templateId || emailPayload.template,
        retryCount,
        duration
      });
    } catch (error) {
      const isRetryableError = this.isRetryableError(error);
      const shouldRetry = retryCount < this.retryLimit && isRetryableError;

      if (shouldRetry) {
        const nextRetryCount = retryCount + 1;
        const backoffMs = this.calculateBackoff(nextRetryCount);

        logger.warn('Email sending failed, retrying', {
          requestId: emailPayload.requestId,
          retryCount: nextRetryCount,
          backoffMs,
          error: error.message
        });

        await this.sleep(backoffMs);
        return await this.sendEmailWithRetry(emailPayload, nextRetryCount);
      } else {
        // Update MongoDB with failure
        if (mongoService.isConnected()) {
          await mongoService.updateEmailLog(emailPayload.requestId, {
            status: 'failed',
            failedAt: new Date(),
            retryCount,
            error: {
              message: error.message,
              code: error.code
            }
          });
        }

        // Max retries reached or non-retryable error - publish to failed topic
        await publishEmailFailure(emailPayload, error, retryCount);

        logger.error('Email sending failed after retries', {
          requestId: emailPayload.requestId,
          error: error.message,
          retryCount
        });

        throw error;
      }
    }
  }

  /**
   * Determine if error is retryable
   */
  isRetryableError(error) {
    const retryableErrorCodes = [
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'EAI_AGAIN',
      'CIRCUIT_OPEN'
    ];

    const retryableSMTPCodes = [421, 450, 451, 452];

    if (retryableErrorCodes.includes(error.code)) return true;
    if (error.responseCode && retryableSMTPCodes.includes(error.responseCode)) return true;
    if (error.message?.includes('temporarily unavailable')) return true;

    // Template and auth errors are not retryable
    if (error.message?.includes('Template not found')) return false;
    if (error.message?.includes('authentication')) return false;
    if (error.message?.includes('Invalid login')) return false;

    return true;
  }

  /**
   * Calculate exponential backoff with jitter
   */
  calculateBackoff(retryCount) {
    const baseBackoff = this.retryBackoff;
    const exponentialBackoff = baseBackoff * Math.pow(2, retryCount - 1);
    const jitter = Math.random() * 1000;
    return Math.min(exponentialBackoff + jitter, 30000);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async stop() {
    if (this.isRunning) {
      await this.consumer.stop();
      await this.consumer.disconnect();
      this.isRunning = false;
      logger.info('Kafka consumer stopped');
    }
  }
}

// Export singleton instance
const kafkaConsumer = new KafkaConsumer();

async function startKafkaConsumer() {
  return await kafkaConsumer.start();
}

module.exports = {
  kafkaConsumer,
  startKafkaConsumer
};
