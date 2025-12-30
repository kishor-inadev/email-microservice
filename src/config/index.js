/**
 * Configuration management for email microservice
 */

const config = {
  // Server configuration
  server: {
    port: parseInt(process.env.PORT) || 3000,
    environment: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info'
  },

  // Kafka configuration
  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    clientId: process.env.KAFKA_CLIENT_ID || 'email-microservice',
    groupId: process.env.KAFKA_GROUP_ID || 'email-service-group',
    topics: {
      send: process.env.KAFKA_TOPIC_SEND || 'email.send',
      success: process.env.KAFKA_TOPIC_SUCCESS || 'email.success',
      failed: process.env.KAFKA_TOPIC_FAILED || 'email.failed'
    }
  },

  // Email configuration
  email: {
    smtp: {
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT) || 1025,
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    defaults: {
      fromEmail: process.env.DEFAULT_FROM_EMAIL || 'noreply@easydev.in',
      fromName: process.env.DEFAULT_FROM_NAME || 'Company'
    },
    retry: {
      limit: parseInt(process.env.EMAIL_RETRY_LIMIT) || 3,
      backoffMs: parseInt(process.env.EMAIL_RETRY_BACKOFF_MS) || 5000
    },
    templateDir: process.env.TEMPLATE_DIR || 'src/templates'
  },

  // Security configuration
  security: {
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
    }
  },

  // Idempotency configuration
  idempotency: {
    ttlMs: parseInt(process.env.IDEMPOTENCY_TTL_MS) || 3600000,
    cleanupIntervalMs: parseInt(process.env.IDEMPOTENCY_CLEANUP_INTERVAL_MS) || 300000
  },

  // Redis configuration (optional)
  redis: {
    url: process.env.REDIS_URL,
    password: process.env.REDIS_PASSWORD
  },

  // Feature flags
  features: {
    enableSyncEndpoint: process.env.ENABLE_SYNC_ENDPOINT === 'true'
  }
};

module.exports = config;
