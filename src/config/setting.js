const env = require('./env');

// App config — re-exported from centralized env.js for backward compatibility
const dbUrl = env.MONGO_URL;
const environment = env.NODE_ENV;
const appUrl = env.APP_URL;
const applicationName = env.APPLICATION_NAME;

module.exports = {
  dbUrl,
  environment,
  appUrl,
  applicationName,

  // Legacy aliases (preserves backward compatibility with existing imports)
  enviroment: environment,
  applicaionName: applicationName
};
