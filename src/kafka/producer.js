const { Kafka } = require('kafkajs');
const logger = require('../utils/logger');

class KafkaProducer {
  constructor() {
    this.kafka = new Kafka({
      clientId: process.env.KAFKA_CLIENT_ID || 'email-microservice',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',')
    });

    this.producer = this.kafka.producer({
      maxInFlightRequests: 5, // Was 1 — pipeline blocked; 5 is safe with idempotent
      idempotent: true,
      transactionTimeout: 30000
    });

    this.connected = false;
    this.connectProducer();
  }

  async connectProducer() {
    try {
      await this.producer.connect();
      this.connected = true;
      logger.info('Kafka producer connected');
    } catch (error) {
      logger.error('Failed to connect Kafka producer', { error: error.message });
      throw error;
    }
  }

  async publishMessage(topic, message, key = null) {
    if (!this.connected) {
      await this.connectProducer();
    }

    try {
      const result = await this.producer.send({
        topic,
        messages: [
          {
            key,
            value: JSON.stringify(message),
            timestamp: Date.now().toString()
          }
        ]
      });

      return result;
    } catch (error) {
      logger.error('Failed to publish message to Kafka', {
        topic,
        error: error.message
      });
      throw error;
    }
  }

  async publishEmailSuccess(originalPayload, result) {
    const now = new Date().toISOString();

    await this.publishMessage(
      process.env.KAFKA_TOPIC_SUCCESS || 'email.success',
      {
        originalMessage: originalPayload,
        result: {
          messageId: result.messageId,
          accepted: result.accepted,
          rejected: result.rejected
        },
        status: 'success',
        timestamp: now,
        processedAt: now
      },
      originalPayload.idempotencyKey || originalPayload.requestId
    );
  }

  async publishEmailFailure(originalPayload, error, retryCount = 0) {
    const now = new Date().toISOString();

    await this.publishMessage(
      process.env.KAFKA_TOPIC_FAILED || 'email.failed',
      {
        originalMessage: originalPayload,
        error: {
          message: error.message,
          code: error.code,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        },
        status: 'failed',
        retryCount,
        timestamp: now,
        failedAt: now
      },
      originalPayload.idempotencyKey || originalPayload.requestId
    );
  }

  async disconnect() {
    if (this.connected) {
      await this.producer.disconnect();
      this.connected = false;
    }
  }
}

// Export singleton instance
const kafkaProducer = new KafkaProducer();

module.exports = {
  kafkaProducer,
  publishToKafka: (topic, message, key = null) => kafkaProducer.publishMessage(topic, message, key),
  publishEmailSuccess: (payload, result) => kafkaProducer.publishEmailSuccess(payload, result),
  publishEmailFailure: (payload, error, retryCount) => kafkaProducer.publishEmailFailure(payload, error, retryCount)
};
