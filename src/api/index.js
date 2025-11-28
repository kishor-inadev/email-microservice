const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const emailController = require('../controllers/emailController');
const logger = require('../utils/logger');
const { errorHandler, notFoundHandler } = require('../middlewares/errorHandler');

module.exports = function setupAPI(app) {
  // Security middleware
  app.use(helmet());
  app.use(cors());
  app.use(compression());

  // Rate limiting
  const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });
  
  app.use('/send-email', limiter);

  // Body parser
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logging middleware
  app.use((req, res, next) => {
    const requestId = Math.random().toString(36).substr(2, 9);
    req.requestId = requestId;
    
    logger.info('Incoming request', {
      requestId,
      method: req.method,
      path: req.path,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });

    res.on('finish', () => {
      logger.info('Request completed', {
        requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        responseTime: Date.now() - req.startTime
      });
    });

    req.startTime = Date.now();
    next();
  });

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      version: require('../../package.json').version
    });
  });

  // Metrics endpoint (placeholder for Prometheus)
  app.get('/metrics', emailController.getMetrics);

  // Email endpoints
  app.post('/send-email', emailController.sendEmail);
  
  // Synchronous email endpoint (for testing)
  if (process.env.ENABLE_SYNC_ENDPOINT === 'true') {
    app.post('/send-email/sync', emailController.sendEmailSync);
  }

  // Error handling middleware
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};