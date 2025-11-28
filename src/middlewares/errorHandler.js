const logger = require('../utils/logger');

/**
 * Global error handler middleware
 */
function errorHandler(error, req, res) {
  const requestId = req.requestId || 'unknown';

  logger.error('Unhandled error in request', {
    requestId,
    error: error.message,
    stack: error.stack,
    method: req.method,
    path: req.path,
    body: req.body,
    query: req.query
  });

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';

  res.status(error.status || 500).json({
    error: 'Internal server error',
    message: isDevelopment ? error.message : 'Something went wrong',
    requestId,
    timestamp: new Date().toISOString()
  });
}

/**
 * 404 handler middleware
 */
function notFoundHandler(req, res) {
  const requestId = req.requestId || 'unknown';

  logger.warn('Route not found', {
    requestId,
    method: req.method,
    path: req.path
  });

  res.status(404).json({
    error: 'Not found',
    message: 'The requested resource was not found',
    requestId,
    timestamp: new Date().toISOString()
  });
}

module.exports = {
  errorHandler,
  notFoundHandler
};
