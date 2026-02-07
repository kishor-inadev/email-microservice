const mongoose = require('mongoose');
const logger = require('../utils/logger');
const EmailLog = require('../models/EmailLog');
const { circuitBreakers } = require('../utils/circuitBreaker');
const { metrics } = require('../utils/metrics');
const { DatabaseError } = require('../utils/errors');

class MongoService {
  constructor() {
    this.connected = false;
    this.connection = null;
    this.circuitBreaker = circuitBreakers.database;
  }

  async connect() {
    if (this.connected) {
      return this.connection;
    }

    const startTime = Date.now();

    try {
      const mongoUri = process.env.MONGO_URL || 'mongodb://localhost:27017/email-service';

      // Optimized connection options for high throughput
      const options = {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        maxPoolSize: parseInt(process.env.MONGO_MAX_POOL_SIZE) || 50, // Increased for 1000 RPS
        minPoolSize: parseInt(process.env.MONGO_MIN_POOL_SIZE) || 10,
        maxIdleTimeMS: 30000,
        waitQueueTimeoutMS: 10000,
        // Write concern for faster writes (trade-off: eventual consistency)
        writeConcern: {
          w: parseInt(process.env.MONGO_WRITE_CONCERN) || 1,
          wtimeout: 5000
        },
        // Read preference for scaling
        readPreference: process.env.MONGO_READ_PREFERENCE || 'primaryPreferred'
      };

      this.connection = await mongoose.connect(mongoUri, options);
      this.connected = true;

      const duration = Date.now() - startTime;
      metrics.recordDbOperation('connect', duration, true);

      logger.info('MongoDB connected successfully', {
        host: this.connection.connection.host,
        database: this.connection.connection.name,
        maxPoolSize: options.maxPoolSize,
        duration
      });

      // Connection event handlers
      mongoose.connection.on('error', error => {
        logger.error('MongoDB connection error', { error: error.message });
        metrics.recordError('MONGODB_CONNECTION_ERROR');
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
        this.connected = false;
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('MongoDB reconnected');
        this.connected = true;
      });

      return this.connection;
    } catch (error) {
      const duration = Date.now() - startTime;
      metrics.recordDbOperation('connect', duration, false);

      logger.error('Failed to connect to MongoDB', {
        error: error.message,
        stack: error.stack
      });
      throw new DatabaseError(`MongoDB connection failed: ${error.message}`, 'connect');
    }
  }

  async disconnect() {
    if (this.connected) {
      await mongoose.disconnect();
      this.connected = false;
      logger.info('MongoDB disconnected');
    }
  }

  async saveEmailLog(emailData) {
    const startTime = Date.now();

    try {
      const result = await this.circuitBreaker.execute(async () => {
        const emailLog = new EmailLog({
          requestId: emailData.requestId,
          to: Array.isArray(emailData.to) ? emailData.to : [emailData.to],
          from: emailData.from || process.env.DEFAULT_FROM_EMAIL,
          cc: emailData.cc ? (Array.isArray(emailData.cc) ? emailData.cc : [emailData.cc]) : [],
          bcc: emailData.bcc ? (Array.isArray(emailData.bcc) ? emailData.bcc : [emailData.bcc]) : [],
          template: emailData.template,
          templateId: emailData.templateId,
          subject: emailData.subject,
          data: emailData.data,
          status: emailData.status || 'queued',
          idempotencyKey: emailData.idempotencyKey,
          messageId: emailData.messageId,
          error: emailData.error,
          retryCount: emailData.retryCount || 0,
          metadata: emailData.metadata,
          sentAt: emailData.sentAt,
          failedAt: emailData.failedAt
        });

        return await emailLog.save();
      });

      const duration = Date.now() - startTime;
      metrics.recordDbOperation('saveEmailLog', duration, true);

      logger.debug('Email log saved to MongoDB', {
        requestId: emailData.requestId,
        status: emailData.status,
        duration
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      metrics.recordDbOperation('saveEmailLog', duration, false);

      if (error.code === 11000) {
        logger.warn('Duplicate email log entry', { requestId: emailData.requestId });
        return null;
      }

      logger.error('Failed to save email log to MongoDB', {
        requestId: emailData.requestId,
        error: error.message
      });
      throw new DatabaseError(`Failed to save email log: ${error.message}`, 'saveEmailLog');
    }
  }

  async updateEmailLog(requestId, updateData) {
    const startTime = Date.now();

    try {
      const result = await this.circuitBreaker.execute(async () => {
        return await EmailLog.findOneAndUpdate(
          { requestId },
          { ...updateData, updatedAt: new Date() },
          { new: true, runValidators: true }
        );
      });

      const duration = Date.now() - startTime;
      metrics.recordDbOperation('updateEmailLog', duration, true);

      if (result) {
        logger.debug('Email log updated in MongoDB', {
          requestId,
          status: updateData.status,
          duration
        });
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      metrics.recordDbOperation('updateEmailLog', duration, false);

      logger.error('Failed to update email log in MongoDB', {
        requestId,
        error: error.message
      });
      throw new DatabaseError(`Failed to update email log: ${error.message}`, 'updateEmailLog');
    }
  }

  async getEmailLog(requestId) {
    const startTime = Date.now();

    try {
      const result = await this.circuitBreaker.execute(async () => {
        return await EmailLog.findOne({ requestId }).lean();
      });

      const duration = Date.now() - startTime;
      metrics.recordDbOperation('getEmailLog', duration, true);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      metrics.recordDbOperation('getEmailLog', duration, false);

      logger.error('Failed to get email log from MongoDB', {
        requestId,
        error: error.message
      });
      throw new DatabaseError(`Failed to get email log: ${error.message}`, 'getEmailLog');
    }
  }

  async getEmailLogs(filters = {}, options = {}) {
    const startTime = Date.now();

    try {
      const result = await this.circuitBreaker.execute(async () => {
        const query = {};

        if (filters.status) {
          query.status = filters.status;
        }

        if (filters.startDate || filters.endDate) {
          query.createdAt = {};
          if (filters.startDate) {
            query.createdAt.$gte = new Date(filters.startDate);
          }
          if (filters.endDate) {
            query.createdAt.$lte = new Date(filters.endDate);
          }
        }

        const limit = Math.min(options.limit || 100, 500); // Cap at 500
        const skip = options.skip || 0;
        const sort = options.sort || { createdAt: -1 };

        const [logs, total] = await Promise.all([
          EmailLog.find(query).sort(sort).skip(skip).limit(limit).lean(),
          EmailLog.countDocuments(query)
        ]);

        return {
          logs,
          total,
          page: Math.floor(skip / limit) + 1,
          pages: Math.ceil(total / limit)
        };
      });

      const duration = Date.now() - startTime;
      metrics.recordDbOperation('getEmailLogs', duration, true);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      metrics.recordDbOperation('getEmailLogs', duration, false);

      logger.error('Failed to get email logs from MongoDB', { error: error.message });
      throw new DatabaseError(`Failed to get email logs: ${error.message}`, 'getEmailLogs');
    }
  }

  async getEmailStats() {
    const startTime = Date.now();

    try {
      const result = await this.circuitBreaker.execute(async () => {
        const stats = await EmailLog.aggregate([
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 }
            }
          }
        ]);

        const summary = {
          total: 0,
          sent: 0,
          failed: 0,
          queued: 0,
          retrying: 0
        };

        stats.forEach(stat => {
          summary[stat._id] = stat.count;
          summary.total += stat.count;
        });

        return summary;
      });

      const duration = Date.now() - startTime;
      metrics.recordDbOperation('getEmailStats', duration, true);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      metrics.recordDbOperation('getEmailStats', duration, false);

      logger.error('Failed to get email stats from MongoDB', { error: error.message });
      throw new DatabaseError(`Failed to get email stats: ${error.message}`, 'getEmailStats');
    }
  }

  /** Get circuit breaker status */
  getCircuitBreakerStatus() {
    return this.circuitBreaker.getStatus();
  }

  isConnected() {
    return this.connected && mongoose.connection.readyState === 1;
  }
}

const mongoService = new MongoService();
module.exports = mongoService;
