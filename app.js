/**
 * Express app setup
 * Initializes middleware, routes, error handling, etc.
 */
const path = require('path');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const helmet = require('helmet');
const ENABLE_KAFKA = process.env.ENABLE_KAFKA === false;
const logger = require('./src/utils/logger');
const { verifyEmailConnection } = require('./src/services/emailService');
// Import routes
// const productRoutes = require('./features/products/product.routes');
// Import other feature routes similarly...

const app = express();

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(morgan('dev')); // HTTP request logging
app.use(express.json()); // Parse JSON body
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded body
app.use(cookieParser()); // Cookie parsing

app.use((req, res, next) => {
  res.setHeader(
    'Accept-CH',
    'Sec-CH-UA, Sec-CH-UA-Mobile, Sec-CH-UA-Model, Sec-CH-UA-Platform, Sec-CH-UA-Platform-Version, Sec-CH-UA-Arch, Sec-CH-UA-Bitness'
  );
  res.setHeader(
    'Critical-CH',
    'Sec-CH-UA, Sec-CH-UA-Mobile, Sec-CH-UA-Model, Sec-CH-UA-Platform, Sec-CH-UA-Platform-Version, Sec-CH-UA-Arch, Sec-CH-UA-Bitness'
  );
//   req.deviceInfo = DeviceDetector.detectDevice(req);
  next();
});

if (ENABLE_KAFKA) {
  const { startKafkaConsumer } = require('./src/kafka/consumer');
  startKafkaConsumer();
  logger.info('Kafka consumer started successfully');
} else {
  logger.info('Kafka is disabled. Running in HTTP-only mode.');
}

verifyEmailConnection().then(result => console.log(result));

// API Routes
// app.use('/api/resumes', resumeRoutes);
// app.use('/api/templates', templateRoutes);

// Mount other feature routes here...
app.get('/', (req, res) => {
  res.send('APP is working!', JSON.stringify(req));
});

app.get('/api', (req, res) => {
  res.send('api is working!', JSON.stringify(req));
});
// Healthcheck endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: Date.now() });
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ success: false, message: 'Endpoint not found' });
  next();
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
  next();
});

module.exports = app;
