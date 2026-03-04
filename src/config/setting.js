require('dotenv').config();

// App config — only variables actually used by the service
const dbUrl = process.env.MONGO_URL;
const environment = process.env.NODE_ENV || 'development';
const appUrl = process.env.APP_URL || process.env.FRONTEND_URL || 'localhost:3000';
const applicationName = process.env.APPLICATION_NAME || 'Your Company';

module.exports = {
  dbUrl,
  environment,
  appUrl,
  applicationName,

  // Legacy aliases (preserves backward compatibility with existing imports)
  enviroment: environment,
  applicaionName: applicationName
};
