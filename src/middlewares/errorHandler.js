/**
 * Enhanced Global Error Handler Middleware
 * Provides structured error handling with custom error types
 */

const logger = require('../utils/logger');
const { AppError, isOperationalError, wrapError } = require('../utils/errors');
const { metrics } = require('../utils/metrics');
const env = require('../config/env');

/**
 * Global error handler middleware
 * Handles all errors and returns appropriate JSON responses
 */
function errorHandler(error, req, res, next) {
  // If headers already sent, delegate to Express default handler
  if (res.headersSent) {
    return next(error);
  }

  const requestId = req.requestId || 'unknown';

  // Wrap non-AppError errors
  const appError = error instanceof AppError ? error : wrapError(error);

  // Log error with appropriate level
  const logLevel = appError.isOperational ? 'warn' : 'error';
  logger[logLevel]('Request error', {
    requestId,
    error: appError.message,
    errorCode: appError.errorCode,
    statusCode: appError.statusCode,
    stack: env.isDevelopment() ? appError.stack : undefined,
    isOperational: appError.isOperational,
    method: req.method,
    path: req.path,
    body: env.isDevelopment() ? req.body : undefined,
    query: req.query
  });

  // Record error metric
  metrics.recordError(appError.errorCode, {
    path: req.path,
    method: req.method
  });

  // Don't leak error details in production
  const isDevelopment = env.isDevelopment();

  // Build error response
  const errorResponse = {
    success: false,
    error: appError.errorCode || 'INTERNAL_ERROR',
    message: appError.isOperational || isDevelopment ? appError.message : 'Something went wrong',
    requestId,
    timestamp: new Date().toISOString()
  };

  // Add details for validation errors
  if (appError.details) {
    errorResponse.details = appError.details;
  }

  // Add retry-after header for rate limit errors
  if (appError.retryAfter) {
    res.setHeader('Retry-After', appError.retryAfter);
    errorResponse.retryAfter = appError.retryAfter;
  }

  // Add stack trace in development
  if (isDevelopment && !appError.isOperational) {
    errorResponse.stack = appError.stack;
  }

  res.status(appError.statusCode || 500).json(errorResponse);
}

/**
 * 404 Not Found handler middleware
 */
function notFoundHandler(req, res) {
  const requestId = req.requestId || 'unknown';

  logger.warn('Route not found', {
    requestId,
    method: req.method,
    path: req.path
  });

  res.status(404).json({
    success: false,
    error: 'NOT_FOUND',
    message: 'The requested resource was not found',
    path: req.path,
    requestId,
    timestamp: new Date().toISOString()
  });
}

/**
 * Unhandled rejection handler for process
 */
function handleUnhandledRejection(reason, promise) {
  logger.error('Unhandled Rejection', {
    reason: reason?.message || reason,
    stack: reason?.stack,
    promise: String(promise)
  });

  metrics.recordError('UNHANDLED_REJECTION');

  // In production, you might want to do graceful shutdown
  if (env.isProduction()) {
    // Give time to log the error before potential shutdown
    setTimeout(() => {
      // Optionally trigger graceful shutdown instead of throwing
    }, 1000);
  }
}

/**
 * Uncaught exception handler for process
 */
function handleUncaughtException(error) {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack
  });

  metrics.recordError('UNCAUGHT_EXCEPTION');

  // Uncaught exceptions are serious - the process should restart
  // But we need to log the error first
  setTimeout(() => {
    process.exit(1);
  }, 1000);
}

/**
 * Express error handling setup
 * Call this to set up process-level error handlers
 */
function setupProcessErrorHandlers() {
  process.on('unhandledRejection', handleUnhandledRejection);
  process.on('uncaughtException', handleUncaughtException);

  logger.info('Process error handlers configured');
}

module.exports = {
  errorHandler,
  notFoundHandler,
  handleUnhandledRejection,
  handleUncaughtException,
  setupProcessErrorHandlers
};
