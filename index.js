const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const express = require('express');
const logger = require('./src/utils/logger');
const api = require('./src/api');
const emailService = require('./src/services/emailService');
const mongoService = require('./src/services/mongoService');

const PORT = process.env.PORT || 3000;
const ENABLE_KAFKA = process.env.ENABLE_KAFKA === 'true';

async function startServer() {
  try {
    // Create Express app
    const app = express();

    // Setup API routes and middleware
    api(app);

    // Connect to MongoDB
    try {
      await mongoService.connect();
      logger.info('MongoDB connection established');
    } catch (error) {
      logger.error('Failed to connect to MongoDB', {
        error: error.message
      });
      logger.warn('Service will continue without MongoDB');
    }

    // Start Kafka consumer if enabled
    if (ENABLE_KAFKA) {
      const { startKafkaConsumer } = require('./src/kafka/consumer');
      await startKafkaConsumer();
      logger.info('Kafka consumer started successfully');
    } else {
      logger.info('Kafka is disabled. Running in HTTP-only mode.');
    }

    // Start HTTP server
    const server = app.listen(PORT, () => {
      emailService.verifyEmailConnection().then(result => console.log(result.message));

      logger.info(`Email microservice running on port ${PORT}`, {
        port: PORT,
        environment: process.env.NODE_ENV,
        processId: process.pid,
        kafkaEnabled: ENABLE_KAFKA,
        mongodbConnected: mongoService.isConnected()
      });
    });

    // Graceful shutdown
    const gracefulShutdown = async signal => {
      logger.info(`${signal} received. Starting graceful shutdown...`);

      // Disconnect MongoDB
      if (mongoService.isConnected()) {
        await mongoService.disconnect();
        logger.info('MongoDB disconnected');
      }

      // Close HTTP server
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start email microservice', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
  process.exit(1);
});

process.on('uncaughtException', error => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

startServer();
