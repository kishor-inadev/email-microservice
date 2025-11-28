const { Kafka } = require('kafkajs');
const logger = require('../utils/logger');

class KafkaProducer {
  constructor() {
    this.kafka = new Kafka({
      clientId: process.env.KAFKA_CLIENT_ID || 'email-microservice',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',')
    });

    this.producer = this.kafka.producer({
      maxInFlightRequests: 1,
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
      const messagePayload = {
        topic,
        messages: [
          {
            key,
            value: JSON.stringify(message),
            timestamp: Date.now().toString()
          }
        ]
      };

      const result = await this.producer.send(messagePayload);

      // logger.debug('Message published to Kafka', {
      //   topic,
      //   partition: result[0]?.partition,
      //   offset: result[0]?.offset,
      //   key
      // });

      return result;
    } catch (error) {
      logger.error('Failed to publish message to Kafka', {
        topic,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  async publishEmailSuccess(originalPayload, result) {
    const successPayload = {
      originalMessage: originalPayload,
      result: {
        messageId: result.messageId,
        accepted: result.accepted,
        rejected: result.rejected
      },
      status: 'success',
      timestamp: new Date().toISOString(),
      processedAt: new Date().toISOString()
    };

    await this.publishMessage(
      process.env.KAFKA_TOPIC_SUCCESS || 'email.success',
      successPayload,
      originalPayload.idempotencyKey || originalPayload.requestId
    );
  }

  async publishEmailFailure(originalPayload, error, retryCount = 0) {
    const failurePayload = {
      originalMessage: originalPayload,
      error: {
        message: error.message,
        code: error.code,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      status: 'failed',
      retryCount,
      timestamp: new Date().toISOString(),
      failedAt: new Date().toISOString()
    };

    await this.publishMessage(
      process.env.KAFKA_TOPIC_FAILED || 'email.failed',
      failurePayload,
      originalPayload.idempotencyKey || originalPayload.requestId
    );
  }

  async disconnect() {
    if (this.connected) {
      await this.producer.disconnect();
      this.connected = false;
      // logger.info('Kafka producer disconnected');
    }
  }
}

// Export singleton instance
const kafkaProducer = new KafkaProducer();

// Export convenience function
async function publishToKafka(topic, message, key = null) {
  return await kafkaProducer.publishMessage(topic, message, key);
}

module.exports = {
  kafkaProducer,
  publishToKafka,
  publishEmailSuccess: (payload, result) => kafkaProducer.publishEmailSuccess(payload, result),
  publishEmailFailure: (payload, error, retryCount) =>
    kafkaProducer.publishEmailFailure(payload, error, retryCount)
};
