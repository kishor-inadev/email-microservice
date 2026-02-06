const mongoose = require('mongoose');
const logger = require('../utils/logger');
const EmailLog = require('../models/EmailLog');

class MongoService {
  constructor() {
    this.connected = false;
    this.connection = null;
  }

  async connect() {
    if (this.connected) {
      return this.connection;
    }

    try {
      const mongoUri = process.env.MONGO_URL || 'mongodb://localhost:27017/email-service';

      const options = {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
        minPoolSize: 2
      };

      this.connection = await mongoose.connect(mongoUri, options);
      this.connected = true;

      logger.info('MongoDB connected successfully', {
        host: this.connection.connection.host,
        database: this.connection.connection.name
      });

      mongoose.connection.on('error', error => {
        logger.error('MongoDB connection error', { error: error.message });
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
        this.connected = false;
      });

      return this.connection;
    } catch (error) {
      logger.error('Failed to connect to MongoDB', {
        error: error.message,
        stack: error.stack
      });
      throw error;
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
    try {
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

      const saved = await emailLog.save();

      logger.debug('Email log saved to MongoDB', {
        requestId: emailData.requestId,
        status: emailData.status
      });

      return saved;
    } catch (error) {
      if (error.code === 11000) {
        logger.warn('Duplicate email log entry', {
          requestId: emailData.requestId
        });
        return null;
      }

      logger.error('Failed to save email log to MongoDB', {
        requestId: emailData.requestId,
        error: error.message
      });
      throw error;
    }
  }

  async updateEmailLog(requestId, updateData) {
    try {
      const updated = await EmailLog.findOneAndUpdate({ requestId }, updateData, {
        new: true,
        runValidators: true
      });

      if (updated) {
        logger.debug('Email log updated in MongoDB', {
          requestId,
          status: updateData.status
        });
      }

      return updated;
    } catch (error) {
      logger.error('Failed to update email log in MongoDB', {
        requestId,
        error: error.message
      });
      throw error;
    }
  }

  async getEmailLog(requestId) {
    try {
      return await EmailLog.findOne({ requestId });
    } catch (error) {
      logger.error('Failed to get email log from MongoDB', {
        requestId,
        error: error.message
      });
      throw error;
    }
  }

  async getEmailLogs(filters = {}, options = {}) {
    try {
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

      const limit = options.limit || 100;
      const skip = options.skip || 0;
      const sort = options.sort || { createdAt: -1 };

      const logs = await EmailLog.find(query).sort(sort).skip(skip).limit(limit).lean();

      const total = await EmailLog.countDocuments(query);

      return {
        logs,
        total,
        page: Math.floor(skip / limit) + 1,
        pages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error('Failed to get email logs from MongoDB', {
        error: error.message
      });
      throw error;
    }
  }

  async getEmailStats() {
    try {
      const stats = await EmailLog.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      const result = {
        total: 0,
        sent: 0,
        failed: 0,
        queued: 0,
        retrying: 0
      };

      stats.forEach(stat => {
        result[stat._id] = stat.count;
        result.total += stat.count;
      });

      return result;
    } catch (error) {
      logger.error('Failed to get email stats from MongoDB', {
        error: error.message
      });
      throw error;
    }
  }

  isConnected() {
    return this.connected && mongoose.connection.readyState === 1;
  }
}

const mongoService = new MongoService();
module.exports = mongoService;
