const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const express = require('express');
const logger = require('./src/utils/logger');
const { startKafkaConsumer } = require('./src/kafka/consumer');
const api = require('./src/api');
const emailService = require('./src/services/emailService');

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Create Express app
    const app = express();

    // Setup API routes and middleware
    api(app);

    // Start Kafka consumer
    await startKafkaConsumer();
    logger.info('Kafka consumer started successfully');

    // Start HTTP server
    const server = app.listen(PORT, () => {
      emailService.verifyEmailConnection().then(result => console.log(result.message));

      logger.info(`Email microservice running on port ${PORT}`, {
        port: PORT,
        environment: process.env.NODE_ENV,
        processId: process.pid
      });
    });

    // Graceful shutdown
    const gracefulShutdown = async signal => {
      logger.info(`${signal} received. Starting graceful shutdown...`);

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
