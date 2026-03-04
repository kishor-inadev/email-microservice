const mongoose = require('mongoose');
const logger = require('../utils/logger');
const EmailLog = require('../models/EmailLog');
const { circuitBreakers } = require('../utils/circuitBreaker');
const { metrics } = require('../utils/metrics');
const { DatabaseError } = require('../utils/errors');
const env = require('../config/env');

class MongoService {
  constructor() {
    this.circuitBreaker = circuitBreakers.database;
  }

  /**
   * Check if MongoDB is connected.
   * Relies on the shared mongoose connection established by dbConnect.js.
   */
  isConnected() {
    return mongoose.connection.readyState === 1;
  }

  async disconnect() {
    if (this.isConnected()) {
      await mongoose.disconnect();
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
          from: emailData.from || env.DEFAULT_FROM_EMAIL,
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
}

const mongoService = new MongoService();
module.exports = mongoService;
