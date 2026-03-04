/**
 * High-Performance Logger with Environment-Based Enable/Disable
 * When disabled, uses no-op functions for zero overhead
 */

const env = require('../config/env');

const ENABLE_LOGGING = env.ENABLE_LOGGING;
const LOG_LEVEL = env.LOG_LEVEL;

// No-op logger for maximum performance when logging is disabled
const noopLogger = {
  error: () => { },
  warn: () => { },
  info: () => { },
  http: () => { },
  verbose: () => { },
  debug: () => { },
  silly: () => { },
  log: () => { },
  child: () => noopLogger,
  transports: [],
  clear: () => { },
  add: () => { },
  exceptions: { handle: () => { } },
  rejections: { handle: () => { } }
};

// Build the logger conditionally — avoids bare `return` which breaks Babel/Jest
function createLogger() {
  if (!ENABLE_LOGGING) {
    return noopLogger;
  }

  // Only load winston when logging is enabled
  const winston = require('winston');
  const fs = require('fs');
  const path = require('path');

  const enableFileLogs = env.ENABLE_FILE_LOGS;

  // Minimal format for production (faster JSON serialization)
  const productionFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
    winston.format.json()
  );

  // Pretty format for development
  const developmentFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.errors({ stack: true }),
    winston.format.colorize({ all: true }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const metaStr = Object.keys(meta).length > 2 ? ` ${JSON.stringify(meta)}` : '';
      return `${timestamp} ${level}: ${message}${metaStr}`;
    })
  );

  const isProduction = env.isProduction();

  // Create logger with minimal overhead
  const logger = winston.createLogger({
    level: LOG_LEVEL,
    format: isProduction ? productionFormat : developmentFormat,
    defaultMeta: {
      service: 'email-microservice',
      pid: process.pid
    },
    transports: [
      new winston.transports.Console({
        // Disable console in production if only file logging is needed
        silent: env.DISABLE_CONSOLE_LOG
      })
    ],
    // Disable exception/rejection handling by default for performance
    exitOnError: false
  });

  // Add file transports only if explicitly enabled
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
  }

  // Silent mode for tests
  if (env.isTest()) {
    logger.transports.forEach(t => (t.silent = true));
  }

  return logger;
}

module.exports = createLogger();
