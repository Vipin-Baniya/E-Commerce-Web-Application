const mongoose = require('mongoose');

const DATA_SOURCE = (process.env.DATA_SOURCE || 'memory').toLowerCase();

let cachedConnection;

async function connectDatabase(uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ecommerce_app') {
  if (DATA_SOURCE !== 'mongo') {
    return null;
  }

  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  cachedConnection = await mongoose.connect(uri, {
    dbName: process.env.MONGODB_DB_NAME || undefined
  });

  return cachedConnection;
}

async function disconnectDatabase() {
  if (DATA_SOURCE !== 'mongo') {
    return;
  }

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  cachedConnection = undefined;
}

module.exports = {
  connectDatabase,
  disconnectDatabase
};
