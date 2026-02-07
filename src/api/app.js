const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const emailController = require('../controllers/emailController');
const logger = require('../utils/logger');
const { errorHandler, notFoundHandler } = require('../middlewares/errorHandler');
const { asyncHandler, asyncHandlerWithTimeout } = require('../middlewares/asyncHandler');
const { metrics } = require('../utils/metrics');

// Request timeout (30 seconds default)
const REQUEST_TIMEOUT_MS = parseInt(process.env.REQUEST_TIMEOUT_MS) || 30000;

module.exports = function setupAPI(app) {
  // Trust proxy for correct IP detection behind load balancers
  app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? true : 1);

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production'
  }));
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
  }));

  // Compression for responses > 1kb
  app.use(compression({
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
      if (req.headers['x-no-compression']) return false;
      return compression.filter(req, res);
    }
  }));

  // Rate limiting with per-IP tracking
  const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: {
      success: false,
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.ip,
    skip: (req) => process.env.NODE_ENV === 'test'
  });

  app.use('/send-email', limiter);

  // Body parser with size limits
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Request ID and timing middleware
  app.use((req, res, next) => {
    // Set start time FIRST
    req.startTime = Date.now();

    // Generate request ID
    const requestId = req.headers['x-request-id'] ||
      `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
    req.requestId = requestId;
    res.setHeader('X-Request-ID', requestId);

    // Log incoming request
    logger.info('Incoming request', {
      requestId,
      method: req.method,
      path: req.path,
      userAgent: req.get('User-Agent'),
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

      // Record HTTP metrics
      metrics.recordHttpRequest(req.method, req.path, res.statusCode, responseTime);
    });

    next();
  });

  // Request timeout middleware
  app.use((req, res, next) => {
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

  // Health check endpoint (fast, no async overhead)
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      version: require('../../package.json').version,
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
      environment: process.env.NODE_ENV,
      version: require('../../package.json').version,
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

  // Email endpoints with timeout protection
  app.post('/send-email', asyncHandlerWithTimeout(emailController.sendEmail, REQUEST_TIMEOUT_MS));

  // Email logs endpoints
  app.get('/email-logs', asyncHandler(emailController.getEmailLogs));
  app.get('/email-logs/:requestId', asyncHandler(emailController.getEmailLog));

  // Synchronous email endpoint (for testing)
  if (process.env.ENABLE_SYNC_ENDPOINT === 'true') {
    app.post('/send-email/sync', asyncHandlerWithTimeout(emailController.sendEmailSync, REQUEST_TIMEOUT_MS));
  }

  // Error handling middleware
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
