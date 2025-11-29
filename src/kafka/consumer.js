const { Kafka } = require('kafkajs');
const logger = require('../utils/logger');
const emailService = require('../services/emailService');
const { publishEmailSuccess, publishEmailFailure } = require('./producer');
const { incrementMetric } = require('../controllers/emailController');
const validator = require('../utils/validator');

class KafkaConsumer {
  constructor() {
    this.kafka = new Kafka({
      clientId: process.env.KAFKA_CLIENT_ID || 'email-microservice',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',')
    });

    this.consumer = this.kafka.consumer({
      groupId: process.env.KAFKA_GROUP_ID || 'email-service-group',
      sessionTimeout: 30000,
      heartbeatInterval: 3000
    });

    this.retryLimit = parseInt(process.env.EMAIL_RETRY_LIMIT) || 3;
    this.retryBackoff = parseInt(process.env.EMAIL_RETRY_BACKOFF_MS) || 5000;
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
        eachMessage: async ({ topic, partition, message, heartbeat }) => {
          await this.processMessage({ topic, partition, message, heartbeat });
        }
      });

      logger.info('Kafka consumer started listening for messages');
    } catch (error) {
      logger.error('Failed to start Kafka consumer', { error: error.message, stack: error.stack });
      throw error;
    }
  }

  async processMessage({ topic, partition, message, heartbeat }) {
    const messageValue = message.value?.toString();
    let emailPayload;

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
        return; // Skip invalid messages
      }

      // logger.info('Processing email message from Kafka', {
      //   requestId: emailPayload.requestId,
      //   to: emailService.sanitizeEmailForLog(emailPayload.to),
      //   template: emailPayload.templateId || emailPayload.template,
      //   topic,
      //   partition,
      //   offset: message.offset
      // });

      // Send email with retry logic
      await this.sendEmailWithRetry(emailPayload);

      // Call heartbeat to keep consumer alive
      await heartbeat();
    } catch (error) {
      // logger.error('Failed to process Kafka message', {
      //   error: error.message,
      //   stack: error.stack,
      //   topic,
      //   partition,
      //   offset: message.offset,
      //   messageValue: messageValue?.substring(0, 500) // Log first 500 chars for debugging
      // });
      console.log(error);

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
    try {
      // const r= await emailService.sendEmail(emailPayload);
      // console.log(r); 
      const result = await emailService.sendEmail(emailPayload);

      // Success - publish success message
      await publishEmailSuccess(emailPayload, result);

      incrementMetric('emailsSent');
      incrementMetric('emailsProcessed');

      logger.info('Email sent successfully via Kafka', {
        requestId: emailPayload.requestId,
        messageId: result.messageId,
        to: emailService.sanitizeEmailForLog(emailPayload.to),
        template: emailPayload.templateId || emailPayload.template,
        retryCount
      });
    } catch (error) {
      const isRetryableError = this.isRetryableError(error);
      const shouldRetry = retryCount < this.retryLimit && isRetryableError;

      if (shouldRetry) {
        // Increment retry count and wait before retrying
        const nextRetryCount = retryCount + 1;
        const backoffMs = this.calculateBackoff(nextRetryCount);

        // logger.warn('Email sending failed, retrying', {
        //   requestId: emailPayload.requestId,
        //   error: error.message,
        //   retryCount: nextRetryCount,
        //   maxRetries: this.retryLimit,
        //   backoffMs
        // });

        incrementMetric('emailsRetried');

        // Wait before retry
        await this.sleep(backoffMs);

        // Retry
        return await this.sendEmailWithRetry(emailPayload, nextRetryCount);
      } else {
        // Max retries reached or non-retryable error - publish to failed topic
        await publishEmailFailure(emailPayload, error, retryCount);

        incrementMetric('emailsFailed');
        incrementMetric('emailsProcessed');

        // logger.error('Email sending failed permanently', {
        //   requestId: emailPayload.requestId,
        //   error: error.message,
        //   retryCount,
        //   maxRetries: this.retryLimit,
        //   isRetryableError
        // });
        console.log(error);

        throw error;
      }
    }
  }

  /**
   * Determine if error is retryable
   */
  isRetryableError(error) {
    // Network errors, timeouts, and temporary SMTP errors are retryable
    const retryableErrorCodes = [
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'EAI_AGAIN'
    ];

    const retryableSMTPCodes = [
      421, // Service not available, closing transmission channel
      450, // Requested mail action not taken: mailbox unavailable
      451, // Requested action aborted: local error in processing
      452 // Requested action not taken: insufficient system storage
    ];

    // Check error code
    if (retryableErrorCodes.includes(error.code)) {
      return true;
    }

    // Check SMTP response codes
    if (error.responseCode && retryableSMTPCodes.includes(error.responseCode)) {
      return true;
    }

    // Template errors are not retryable
    if (error.message.includes('Template not found') || error.message.includes('Template must')) {
      return false;
    }

    // Authentication errors are not retryable
    if (error.message.includes('authentication') || error.message.includes('Invalid login')) {
      return false;
    }

    // Default to retryable for unknown errors
    return true;
  }

  /**
   * Calculate exponential backoff with jitter
   */
  calculateBackoff(retryCount) {
    const baseBackoff = this.retryBackoff;
    const exponentialBackoff = baseBackoff * Math.pow(2, retryCount - 1);
    const jitter = Math.random() * 1000; // Add up to 1 second jitter
    return Math.min(exponentialBackoff + jitter, 30000); // Max 30 seconds
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async stop() {
    await this.consumer.disconnect();
    logger.info('Kafka consumer disconnected');
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
