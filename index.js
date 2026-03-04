const env = require('./src/config/env');
const cluster = require('cluster');
const os = require('os');

const numCPUs = env.CLUSTER_WORKERS || os.cpus().length;
const ENABLE_CLUSTER = env.ENABLE_CLUSTER && numCPUs > 1;

if (ENABLE_CLUSTER && cluster.isPrimary) {
  // Master process - fork workers
  const logger = require('./src/utils/logger');

  logger.info(`Master process ${process.pid} starting`, {
    workers: numCPUs,
    nodeVersion: process.version
  });

  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  // Handle worker exit
  cluster.on('exit', (worker, code, signal) => {
    logger.warn(`Worker ${worker.process.pid} died`, { code, signal });

    // Restart worker unless shutting down
    if (!cluster.isPrimary._shuttingDown) {
      logger.info('Forking new worker...');
      cluster.fork();
    }
  });

  // Graceful shutdown for master
  const shutdownMaster = signal => {
    if (cluster.isPrimary._shuttingDown) return;
    cluster.isPrimary._shuttingDown = true;

    logger.info(`${signal} received. Shutting down workers...`);

    for (const id in cluster.workers) {
      cluster.workers[id].process.kill(signal);
    }

    // Give workers time to shutdown
    setTimeout(() => {
      logger.info('Master process exiting');
      process.exit(0);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdownMaster('SIGTERM'));
  process.on('SIGINT', () => shutdownMaster('SIGINT'));

} else {
  // Worker process or single-process mode
  startWorker();
}

async function startWorker() {
  const express = require('express');
  const logger = require('./src/utils/logger');
  const api = require('./src/api/app');
  const emailService = require('./src/services/emailService');
  const mongoService = require('./src/services/mongoService');
  const connectDB = require('./src/config/dbConnect');
  const { setupProcessErrorHandlers } = require('./src/middlewares/errorHandler');

  const PORT = env.PORT;
  const ENABLE_KAFKA = env.ENABLE_KAFKA;

  // Setup process-level error handlers
  setupProcessErrorHandlers();

  try {
    await connectDB();

    const emailConnection = await emailService.verifyEmailConnection(
      env.EMAIL_RETRY_LIMIT,
      env.EMAIL_RETRY_BACKOFF_MS
    );

    if (!emailConnection?.success) {
      throw new Error(`Email service verification failed: ${emailConnection?.error || 'Unknown error'}`);
    }

    // Create Express app
    const app = express();

    // Setup API routes and middleware
    api(app);

    // Start Kafka consumer if enabled
    if (ENABLE_KAFKA) {
      const { startKafkaConsumer } = require('./src/kafka/consumer');
      await startKafkaConsumer();
      logger.info('Kafka consumer started successfully');
    } else {
      logger.info('Kafka is disabled. Running in HTTP-only mode.');
    }

    // Configure keep-alive for high throughput
    const server = app.listen(PORT, () => {
      logger.info(`Email microservice running on port ${PORT}`, {
        port: PORT,
        environment: env.NODE_ENV,
        processId: process.pid,
        workerId: cluster.worker?.id || 'single',
        kafkaEnabled: ENABLE_KAFKA,
        mongodbConnected: mongoService.isConnected()
      });
    });

    // Configure server timeouts
    server.keepAliveTimeout = 65000; // Higher than ALB/nginx default (60s)
    server.headersTimeout = 66000; // Slightly higher than keepAliveTimeout
    server.timeout = env.SERVER_TIMEOUT_MS;

    // Track active connections for graceful shutdown
    let connections = new Set();

    server.on('connection', conn => {
      connections.add(conn);
      conn.on('close', () => connections.delete(conn));
    });

    // Graceful shutdown
    let isShuttingDown = false;

    const gracefulShutdown = async signal => {
      if (isShuttingDown) return;
      isShuttingDown = true;

      logger.info(`${signal} received. Starting graceful shutdown...`, {
        processId: process.pid
      });

      // Stop accepting new connections
      server.close(async () => {
        logger.info('HTTP server closed');

        // Disconnect MongoDB
        if (mongoService.isConnected()) {
          try {
            await mongoService.disconnect();
            logger.info('MongoDB disconnected');
          } catch (err) {
            logger.error('Error disconnecting MongoDB', { error: err.message });
          }
        }

        // Disconnect Kafka if enabled
        if (ENABLE_KAFKA) {
          try {
            const { kafkaConsumer } = require('./src/kafka/consumer');
            await kafkaConsumer.stop();
            logger.info('Kafka consumer stopped');
          } catch (err) {
            logger.error('Error stopping Kafka consumer', { error: err.message });
          }
        }

        logger.info('Graceful shutdown complete');
        process.exit(0);
      });

      // Force close connections after timeout
      const shutdownTimeout = env.SHUTDOWN_TIMEOUT_MS;

      setTimeout(() => {
        logger.warn('Forcing remaining connections to close');
        connections.forEach(conn => conn.destroy());
      }, shutdownTimeout / 2);

      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, shutdownTimeout);
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
