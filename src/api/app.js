const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

const env = require('../config/env');
const emailController = require('../controllers/emailController');
const logger = require('../utils/logger');
const { errorHandler, notFoundHandler } = require('../middlewares/errorHandler');
const { asyncHandler, asyncHandlerWithTimeout } = require('../middlewares/asyncHandler');
const { metrics } = require('../utils/metrics');

// Request timeout from centralized config
const REQUEST_TIMEOUT_MS = env.REQUEST_TIMEOUT_MS;

// Cache package version at module load — avoid re-reading on every /health call
const APP_VERSION = require('../../package.json').version;

// Fast request ID generator — crypto.randomUUID() is native & ~10× faster than Math.random()
const generateRequestId = crypto.randomUUID
  ? () => crypto.randomUUID()
  : () => `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;

// Recursively serialise: Mongoose docs → plain objects, _id → id (string), __v stripped,
// null values stripped (returns undefined for null so callers can omit the key).
function _cleanResponse(val) {
  if (val === null || val === undefined) return undefined;
  if (typeof val !== 'object') return val;
  if (val instanceof Date) return val;
  if (Buffer.isBuffer(val)) return val;
  if (Array.isArray(val)) return val.map(_cleanResponse).filter(v => v !== undefined);
  const src = typeof val.toJSON === 'function' ? val.toJSON() : val;
  if (typeof src !== 'object' || src === null) return src;
  const out = {};
  for (const key of Object.keys(src)) {
    if (key === '__v' || key === '_id' || key === 'id' ||
        key === 'isDeleted' || key === 'deletedAt' ||
        key === 'created_by' || key === 'updated_by' || key === 'deleted_by') continue;
    const v = _cleanResponse(src[key]);
    if (v !== undefined) out[key] = v;
  }
  const rawId = src.id !== undefined ? src.id : src._id;
  if (rawId !== undefined) out.id = String(rawId);
  return out;
}

module.exports = function setupAPI(app) {
  // Trust proxy for correct IP detection behind load balancers
  app.set('trust proxy', env.TRUST_PROXY ? true : 1);

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: env.isProduction()
  }));
  app.use(cors({
    origin: env.CORS_ORIGIN,
    credentials: true
  }));

  // Compression — level 1 is fastest with ~60% ratio (level 6 was 5× slower)
  app.use(compression({
    level: 1,
    threshold: 1024,
    filter: (req, res) => {
      if (req.headers['x-no-compression']) return false;
      return compression.filter(req, res);
    }
  }));

  // Rate limiting with per-IP tracking
  const limiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX_REQUESTS,
    message: {
      success: false,
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.ip,
    skip: (req) => env.isTest()
  });

  app.use('/send-email', limiter);

  // Body parser with size limits
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Combined request tracking + timeout — one middleware instead of two
  app.use((req, res, next) => {
    req.startTime = Date.now();

    // Fast request ID
    const requestId = req.headers['x-request-id'] || generateRequestId();
    req.requestId = requestId;
    res.setHeader('X-Request-ID', requestId);

    // Log incoming request
    logger.info('Incoming request', {
      requestId,
      method: req.method,
      path: req.path,
      ip: req.ip
    });

    // Log response on finish
    res.on('finish', () => {
      const responseTime = Date.now() - req.startTime;

      logger.info('Request completed', {
        requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        responseTime
      });

      metrics.recordHttpRequest(req.method, req.path, res.statusCode, responseTime);
    });

    // Request timeout (merged from separate middleware)
    req.setTimeout(REQUEST_TIMEOUT_MS, () => {
      if (!res.headersSent) {
        logger.warn('Request timeout', {
          requestId: req.requestId,
          method: req.method,
          path: req.path,
          timeout: REQUEST_TIMEOUT_MS
        });
        res.status(504).json({
          success: false,
          error: 'TIMEOUT_ERROR',
          message: 'Request timeout',
          requestId: req.requestId
        });
      }
    });

    next();
  });

  // Response envelope — injects timestamp, requestId, statusCode, status;
  // serialises _id → id, strips __v and null values, sets Content-Type header.
  app.use((req, res, next) => {
    const _json = res.json.bind(res);
    res.json = function (body) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      if (body !== null && body !== undefined && typeof body === 'object' && !Array.isArray(body)) {
        body.timestamp  = new Date().toISOString();
        body.requestId  = req.requestId;
        body.statusCode = res.statusCode;
        body.status     = res.statusCode < 400 ? 'success' : 'error';
      }
      return _json(_cleanResponse(body));
    };
    next();
  });

  // Health check endpoint (fast, no async overhead)
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: env.NODE_ENV,
      version: APP_VERSION,
      pid: process.pid
    });
  });

  // Detailed health check with dependencies
  app.get('/health/detailed', asyncHandler(async (req, res) => {
    const mongoService = require('../services/mongoService');
    const emailService = require('../services/emailService');

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: env.NODE_ENV,
      version: APP_VERSION,
      pid: process.pid,
      dependencies: {
        mongodb: mongoService.isConnected() ? 'connected' : 'disconnected',
        smtp: await emailService.verifyConnection() ? 'connected' : 'disconnected'
      }
    };

    const isHealthy = health.dependencies.mongodb === 'connected';
    res.status(isHealthy ? 200 : 503).json(health);
  }));

  // Metrics endpoint
  app.get('/metrics', asyncHandler(emailController.getMetrics));

  // Tenant resolution — sets req.tenantId for all email routes
  // Health and metrics endpoints registered above are intentionally excluded.
  const { resolveTenantMiddleware } = require('../middlewares/tenant');
  app.use(resolveTenantMiddleware);

  // Email endpoints with timeout protection
  app.post('/send-email', asyncHandlerWithTimeout(emailController.sendEmail, REQUEST_TIMEOUT_MS));

  // Email logs endpoints
  app.get('/email-logs', asyncHandler(emailController.getEmailLogs));
  app.get('/email-logs/:requestId', asyncHandler(emailController.getEmailLog));

  // Synchronous email endpoint (for testing)
  if (env.ENABLE_SYNC_ENDPOINT) {
    app.post('/send-email/sync', asyncHandlerWithTimeout(emailController.sendEmailSync, REQUEST_TIMEOUT_MS));
  }

  // Error handling middleware
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
