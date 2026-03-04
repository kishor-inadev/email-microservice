const { Kafka } = require('kafkajs');
const logger = require('../utils/logger');
const emailService = require('../services/emailService');
const { publishEmailSuccess, publishEmailFailure } = require('./producer');
const validator = require('../utils/validator');
const mongoService = require('../services/mongoService');
const { circuitBreakers } = require('../utils/circuitBreaker');
const { metrics } = require('../utils/metrics');
const env = require('../config/env');

// O(1) retryable error code lookup
const RETRYABLE_ERROR_CODES = new Set([
  'ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN', 'CIRCUIT_OPEN'
]);
const RETRYABLE_SMTP_CODES = new Set([421, 450, 451, 452]);

class KafkaConsumer {
  constructor() {
    this.kafka = new Kafka({
      clientId: env.KAFKA_CLIENT_ID,
      brokers: env.KAFKA_BROKERS.split(','),
      retry: {
        initialRetryTime: 300,
        retries: 10
      }
    });

    this.consumer = this.kafka.consumer({
      groupId: env.KAFKA_GROUP_ID,
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
      maxBytesPerPartition: 1048576,
      maxWaitTimeInMs: 100
    });

    this.circuitBreaker = circuitBreakers.kafka;
    this.retryLimit = env.EMAIL_RETRY_LIMIT;
    this.retryBackoff = env.EMAIL_RETRY_BACKOFF_MS;
    this.isRunning = false;
  }

  async start() {
    try {
      await this.consumer.connect();
      logger.info('Kafka consumer connected');

      await this.consumer.subscribe({
        topic: env.KAFKA_TOPIC_SEND,
        fromBeginning: false
      });

      await this.consumer.run({
        partitionsConsumedConcurrently: env.KAFKA_CONCURRENT_PARTITIONS,
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
      emailPayload = JSON.parse(messageValue);

      const { error } = validator.validateKafkaMessage(emailPayload);
      if (error) {
        logger.error('Invalid email payload from Kafka', {
          error: error.details,
          topic,
          partition,
          offset: message.offset
        });
        metrics.recordError('KAFKA_INVALID_PAYLOAD', { topic });
        return;
      }

      metrics.kafkaMessagesConsumed.inc({ topic });

      logger.info('Processing email from Kafka', {
        requestId: emailPayload.requestId,
        to: emailService.sanitizeEmailForLog(emailPayload.to),
        template: emailPayload.templateId || emailPayload.template,
        partition,
        offset: message.offset
      });

      // Iterative retry loop — avoids recursive call stack
      await this.sendEmailWithRetry(emailPayload);

      await heartbeat();
    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error('Failed to process Kafka message', {
        error: error.message,
        topic,
        partition,
        offset: message.offset,
        duration
      });

      metrics.kafkaErrors.inc({ topic, error: error.code || 'UNKNOWN' });

      if (emailPayload) {
        try {
          await publishEmailFailure(emailPayload, error, 0);
        } catch (publishError) {
          logger.error('Failed to publish failure message', {
            error: publishError.message
          });
        }
      }
    }
  }

  /**
   * Iterative retry loop — no recursive call stack
   */
  async sendEmailWithRetry(emailPayload) {
    for (let retryCount = 0; retryCount <= this.retryLimit; retryCount++) {
      const startTime = Date.now();

      try {
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

        await publishEmailSuccess(emailPayload, result);

        const duration = Date.now() - startTime;
        logger.info('Email sent via Kafka', {
          requestId: emailPayload.requestId,
          messageId: result.messageId,
          to: emailService.sanitizeEmailForLog(emailPayload.to),
          template: emailPayload.templateId || emailPayload.template,
          retryCount,
          duration
        });

        return; // Success — exit loop
      } catch (error) {
        const isRetryable = this.isRetryableError(error);
        const hasRetriesLeft = retryCount < this.retryLimit;

        if (isRetryable && hasRetriesLeft) {
          const backoffMs = this.calculateBackoff(retryCount + 1);
          logger.warn('Email sending failed, retrying', {
            requestId: emailPayload.requestId,
            retryCount: retryCount + 1,
            backoffMs,
            error: error.message
          });
          await this.sleep(backoffMs);
          continue; // Next iteration
        }

        // Final failure — update DB and publish
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

  /** O(1) Set-based retryable error check */
  isRetryableError(error) {
    if (RETRYABLE_ERROR_CODES.has(error.code)) return true;
    if (error.responseCode && RETRYABLE_SMTP_CODES.has(error.responseCode)) return true;
    if (error.message?.includes('temporarily unavailable')) return true;

    // Non-retryable errors
    if (error.message?.includes('Template not found')) return false;
    if (error.message?.includes('authentication')) return false;
    if (error.message?.includes('Invalid login')) return false;

    return true;
  }

  calculateBackoff(retryCount) {
    const exponentialBackoff = this.retryBackoff * Math.pow(2, retryCount - 1);
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

const kafkaConsumer = new KafkaConsumer();

async function startKafkaConsumer() {
  return await kafkaConsumer.start();
}

module.exports = {
  kafkaConsumer,
  startKafkaConsumer
};
