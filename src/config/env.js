/**
 * Centralized Environment Configuration
 * ──────────────────────────────────────
 * This is the ONLY file that calls dotenv.config().
 * All other modules must import from here instead of reading process.env directly.
 *
 * Usage:
 *   const env = require('../config/env');
 *   env.PORT, env.MONGO_URL, env.EMAIL_HOST, etc.
 */
require('dotenv').config();

const env = {
  // ─── Server ───────────────────────────────────────────────────────────────
  NODE_ENV:             process.env.NODE_ENV || 'development',
  PORT:                 parseInt(process.env.PORT) || 3000,
  ENABLE_CLUSTER:       process.env.ENABLE_CLUSTER !== 'false',
  CLUSTER_WORKERS:      parseInt(process.env.CLUSTER_WORKERS) || 0,
  REQUEST_TIMEOUT_MS:   parseInt(process.env.REQUEST_TIMEOUT_MS) || 30000,
  SERVER_TIMEOUT_MS:    parseInt(process.env.SERVER_TIMEOUT_MS) || 120000,
  SHUTDOWN_TIMEOUT_MS:  parseInt(process.env.SHUTDOWN_TIMEOUT_MS) || 10000,
  TRUST_PROXY:          process.env.TRUST_PROXY === 'true',

  // ─── CORS ─────────────────────────────────────────────────────────────────
  CORS_ORIGIN:          process.env.CORS_ORIGIN || '*',

  // ─── Rate Limiting ────────────────────────────────────────────────────────
  RATE_LIMIT_WINDOW_MS:    parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60 * 1000,
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000,

  // ─── Logging ──────────────────────────────────────────────────────────────
  ENABLE_LOGGING:       process.env.ENABLE_LOGGING !== 'false',
  LOG_LEVEL:            process.env.LOG_LEVEL || 'info',
  ENABLE_FILE_LOGS:     process.env.ENABLE_FILE_LOGS === 'true',
  DISABLE_CONSOLE_LOG:  process.env.DISABLE_CONSOLE_LOG === 'true',

  // ─── App ──────────────────────────────────────────────────────────────────
  APP_URL:          process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:3000',
  FRONTEND_URL:     process.env.FRONTEND_URL || 'http://localhost:3001',
  APPLICATION_NAME: process.env.APPLICATION_NAME || 'Your Company',
  ENABLE_SYNC_ENDPOINT: process.env.ENABLE_SYNC_ENDPOINT === 'true',

  // ─── MongoDB ──────────────────────────────────────────────────────────────
  MONGO_URL:            process.env.MONGO_URL,
  MONGO_MAX_POOL_SIZE:  parseInt(process.env.MONGO_MAX_POOL_SIZE) || 100,
  MONGO_MIN_POOL_SIZE:  parseInt(process.env.MONGO_MIN_POOL_SIZE) || 20,
  MONGO_READ_PREFERENCE: process.env.MONGO_READ_PREFERENCE || 'primaryPreferred',
  MONGO_WRITE_CONCERN:  process.env.MONGO_WRITE_CONCERN || 'majority',
  DB_MAX_IDLE_TIME:           parseInt(process.env.DB_MAX_IDLE_TIME) || 30000,
  DB_SERVER_SELECTION_TIMEOUT: parseInt(process.env.DB_SERVER_SELECTION_TIMEOUT) || 5000,
  DB_SOCKET_TIMEOUT:    parseInt(process.env.DB_SOCKET_TIMEOUT) || 45000,
  DB_CONNECT_TIMEOUT:   parseInt(process.env.DB_CONNECT_TIMEOUT) || 10000,
  DB_HEARTBEAT:         parseInt(process.env.DB_HEARTBEAT) || 10000,

  // ─── Kafka ────────────────────────────────────────────────────────────────
  ENABLE_KAFKA:               process.env.ENABLE_KAFKA === 'true',
  KAFKA_BROKERS:              process.env.KAFKA_BROKERS || 'localhost:9092',
  KAFKA_CLIENT_ID:            process.env.KAFKA_CLIENT_ID || 'email-microservice',
  KAFKA_GROUP_ID:             process.env.KAFKA_GROUP_ID || 'email-service-consumer-group',
  KAFKA_TOPIC_SEND:           process.env.KAFKA_TOPIC_SEND || 'email.notification.send',
  KAFKA_TOPIC_SUCCESS:        process.env.KAFKA_TOPIC_SUCCESS || 'email.notification.delivered',
  KAFKA_TOPIC_FAILED:         process.env.KAFKA_TOPIC_FAILED || 'email.notification.failed',
  KAFKA_CONCURRENT_PARTITIONS: parseInt(process.env.KAFKA_CONCURRENT_PARTITIONS) || 10,

  // ─── Email (SMTP) ─────────────────────────────────────────────────────────
  EMAIL_SERVICE:    process.env.EMAIL_SERVICE || '',
  EMAIL_HOST:       process.env.EMAIL_HOST || '',
  EMAIL_PORT:       parseInt(process.env.EMAIL_PORT) || 587,
  EMAIL_SECURE:     process.env.EMAIL_SECURE === 'true',
  EMAIL_USER:       process.env.EMAIL_USER || '',
  EMAIL_PASS:       process.env.EMAIL_PASS || '',
  DEFAULT_FROM_EMAIL: process.env.DEFAULT_FROM_EMAIL || '',
  DEFAULT_FROM_NAME:  process.env.DEFAULT_FROM_NAME || 'Company',

  // Email throughput (optimized defaults for production)
  EMAIL_MAX_CONNECTIONS: parseInt(process.env.EMAIL_MAX_CONNECTIONS) || 100,
  EMAIL_MAX_MESSAGES:    parseInt(process.env.EMAIL_MAX_MESSAGES) || 500,
  EMAIL_RATE_DELTA:      parseInt(process.env.EMAIL_RATE_DELTA) || 1000,
  EMAIL_RATE_LIMIT:      parseInt(process.env.EMAIL_RATE_LIMIT) || 500,

  // Email TLS
  EMAIL_TLS_REJECT_UNAUTHORIZED: process.env.EMAIL_TLS_REJECT_UNAUTHORIZED !== 'false',
  EMAIL_TLS_MIN_VERSION:         process.env.EMAIL_TLS_MIN_VERSION || 'TLSv1.2',

  // Email debug / retry
  EMAIL_DEBUG:          process.env.EMAIL_DEBUG === 'true',
  EMAIL_RETRY_LIMIT:    parseInt(process.env.EMAIL_RETRY_LIMIT) || 3,
  EMAIL_RETRY_BACKOFF_MS: parseInt(process.env.EMAIL_RETRY_BACKOFF_MS) || 5000,

  // ─── Fallback Email ───────────────────────────────────────────────────────
  FALLBACK_EMAIL_SERVICE: process.env.FALLBACK_EMAIL_SERVICE || '',
  FALLBACK_EMAIL_HOST:    process.env.FALLBACK_EMAIL_HOST || '',
  FALLBACK_EMAIL_PORT:    parseInt(process.env.FALLBACK_EMAIL_PORT) || 587,
  FALLBACK_EMAIL_SECURE:  process.env.FALLBACK_EMAIL_SECURE === 'true',
  FALLBACK_EMAIL_USER:    process.env.FALLBACK_EMAIL_USER || '',
  FALLBACK_EMAIL_PASS:    process.env.FALLBACK_EMAIL_PASS || '',

  // ─── OAuth2 (Optional) ────────────────────────────────────────────────────
  OAUTH2_CLIENT_ID:     process.env.OAUTH2_CLIENT_ID || '',
  OAUTH2_CLIENT_SECRET: process.env.OAUTH2_CLIENT_SECRET || '',
  OAUTH2_REFRESH_TOKEN: process.env.OAUTH2_REFRESH_TOKEN || '',
  OAUTH2_REDIRECT_URI:  process.env.OAUTH2_REDIRECT_URI || 'https://developers.google.com/oauthplayground',

  // ─── Idempotency ──────────────────────────────────────────────────────────
  IDEMPOTENCY_TTL_MS:              parseInt(process.env.IDEMPOTENCY_TTL_MS) || 3600000,
  IDEMPOTENCY_CLEANUP_INTERVAL_MS: parseInt(process.env.IDEMPOTENCY_CLEANUP_INTERVAL_MS) || 300000,

  // ─── Tenant ───────────────────────────────────────────────────────────────
  // true  → x-tenant-id header required on every email request (or falls back to DEFAULT_TENANT_ID)
  // false → tenant resolution is best-effort; service continues without tenant context
  TENANCY_ENABLED:   process.env.TENANCY_ENABLED === 'true',
  DEFAULT_TENANT_ID: process.env.DEFAULT_TENANT_ID?.trim() || null,

  // ─── Helpers ──────────────────────────────────────────────────────────────
  isProduction:  () => env.NODE_ENV === 'production',
  isDevelopment: () => env.NODE_ENV === 'development',
  isTest:        () => env.NODE_ENV === 'test',
};

// ─── Startup Validation ────────────────────────────────────────────────────
// Fail fast with a clear message if critical env vars are missing.
const REQUIRED_VARS = ['MONGO_URL', 'EMAIL_HOST', 'EMAIL_USER', 'EMAIL_PASS'];
if (env.NODE_ENV !== 'test') {
  const missing = REQUIRED_VARS.filter(key => !env[key]);
  if (missing.length > 0) {
    console.error(`[env] FATAL: Missing required environment variables: ${missing.join(', ')}`);
    console.error('[env] Ensure your .env file is present and correctly configured.');
    process.exit(1);
  }
}

module.exports = env;
