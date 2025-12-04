const winston = require('winston');
const fs = require('fs');
const path = require('path');

// Check if file logging is enabled
const enableFileLogs = process.env.ENABLE_FILE_LOGS === 'true';

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Create logger object
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: {
    service: 'email-microservice',
    version: require('../../package.json').version,
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize({ all: true }),
        winston.format.simple()
      )
    })
  ]
});

// ➤ If file logging is enabled, configure folder + file transports
if (enableFileLogs) {
  const logsDir = path.join(process.cwd(), 'logs');

  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  logger.add(
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
      tailable: true
    })
  );

  logger.add(
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 10,
      tailable: true
    })
  );

  logger.exceptions.handle(
    new winston.transports.File({ filename: path.join(logsDir, 'exceptions.log') })
  );

  logger.rejections.handle(
    new winston.transports.File({ filename: path.join(logsDir, 'rejections.log') })
  );
}

// Disable file logs during test
if (process.env.NODE_ENV === 'test') {
  logger.clear();
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
      silent: true
    })
  );
}

module.exports = logger;
