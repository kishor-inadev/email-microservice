// src/config/dbConnect.js

const mongoose = require('mongoose');
const { dbUrl, environment } = require('./setting');
require('dotenv').config();

const options = {
    maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE) || 20,
    minPoolSize: parseInt(process.env.DB_MIN_POOL_SIZE) || 2,
    maxIdleTimeMS: parseInt(process.env.DB_MAX_IDLE_TIME) || 30000,

    serverSelectionTimeoutMS: parseInt(process.env.DB_SERVER_SELECTION_TIMEOUT) || 5000,
    socketTimeoutMS: parseInt(process.env.DB_SOCKET_TIMEOUT) || 45000,
    connectTimeoutMS: parseInt(process.env.DB_CONNECT_TIMEOUT) || 10000,

    bufferCommands: false,
    retryWrites: true,
    retryReads: true,
    compressors: ['zlib'],
    readPreference: 'primaryPreferred',

    writeConcern: { w: 'majority', j: true, wtimeout: 10000 },

    heartbeatFrequencyMS: parseInt(process.env.DB_HEARTBEAT) || 10000,
    serverMonitoringMode: 'auto',

    autoIndex: environment === 'development',
    autoCreate: true
};

const connectDB = async () => {
    try {
        if (environment === 'development') {
            mongoose.set('debug', false);
        }

        // Connection events
        mongoose.connection.once('connected', () => {
            console.log('✅ MongoDB connected');
        });

        mongoose.connection.on('error', err => {
            console.error('🚨 MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.warn('⚠️ MongoDB disconnected');
        });

        // Graceful shutdown without process.exit()
        const gracefulExit = async () => {
            try {
                await mongoose.connection.close();
                console.log('🛑 MongoDB connection closed gracefully');
            } catch (err) {
                console.error('❌ Error closing MongoDB connection:', err);
            }
        };

        process.on('SIGINT', gracefulExit);
        process.on('SIGTERM', gracefulExit);

        // Connect to DB
        await mongoose.connect(dbUrl, options);
    } catch (error) {
        console.error('🚨 MongoDB connection failed:', error);
        throw error; // ❗ Let the caller (main server) decide what to do
    }
};

module.exports = connectDB;
