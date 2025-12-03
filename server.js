require('dotenv').config();
const http = require('http');
const app = require('./app');
const { serverPort } = require('./src/config/setting');
const connectDB = require('./src/config/dbConnact');
const socketService = require('./src/services/socketService');

// Connect DB first, then start server
const startServer = async () => {
  await connectDB();
  // await connectProducer();

  //   const port = process.env.PORT || 3000;
  const server = http.createServer(app);
  const io = socketService.initialize(server);
  server.listen(serverPort || 3500, () => {
    console.log(`🚀 Server running on port ${serverPort}`);
  });

  // Handle server errors globally
  server.on('error', (error) => {
    console.error('🚨 Server error:', error);
    process.exit(1);
  });

  // Graceful shutdown on termination signals
  const gracefulShutdown = () => {
    console.log('⏳ Shutting down gracefully...');
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
    // If after 10 seconds forced exit
    setTimeout(() => {
      console.error('❌ Could not close connections in time, forcing exit');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGINT', gracefulShutdown);
  process.on('SIGTERM', gracefulShutdown);
};

startServer();

module.exports = startServer;