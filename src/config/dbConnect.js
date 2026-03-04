// src/config/dbConnect.js

const mongoose = require('mongoose');
const { dbUrl, environment } = require('./setting');
const env = require('./env');
const logger = require('../utils/logger');

const options = {
    maxPoolSize: env.MONGO_MAX_POOL_SIZE,
    minPoolSize: env.MONGO_MIN_POOL_SIZE,
    maxIdleTimeMS: env.DB_MAX_IDLE_TIME,

    serverSelectionTimeoutMS: env.DB_SERVER_SELECTION_TIMEOUT,
    socketTimeoutMS: env.DB_SOCKET_TIMEOUT,
    connectTimeoutMS: env.DB_CONNECT_TIMEOUT,

    bufferCommands: false,
    retryWrites: true,  // always true — separate concern from writeConcern
    retryReads: true,
    compressors: ['zlib'],
    readPreference: env.MONGO_READ_PREFERENCE,

    writeConcern: {
        w: parseInt(env.MONGO_WRITE_CONCERN) || 'majority',
        j: true,
        wtimeout: 10000
    },

    heartbeatFrequencyMS: env.DB_HEARTBEAT,
    serverMonitoringMode: 'auto',

    autoIndex: environment === 'development',
    autoCreate: environment !== 'production'  // never auto-create collections in production
};

const connectDB = async () => {
    try {
        if (environment === 'development') {
            mongoose.set('debug', false);
        }

        // Connection events — use logger, not console
        mongoose.connection.once('connected', () => {
            logger.info('MongoDB connected');
        });

        mongoose.connection.on('error', err => {
            logger.error('MongoDB connection error', { error: err.message });
        });

        mongoose.connection.on('disconnected', () => {
            logger.warn('MongoDB disconnected');
        });

        // NOTE: Do NOT register SIGINT/SIGTERM here.
        // index.js owns graceful shutdown and calls mongoService.disconnect().

        // Connect to DB
        await mongoose.connect(dbUrl, options);
    } catch (error) {
        logger.error('MongoDB connection failed', { error: error.message });
        throw error; // Let the caller (main server) decide what to do
    }
};

module.exports = connectDB;
