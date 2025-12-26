const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            logger.error('MONGODB_URI is not defined in environment variables. Please check your .env file.');
            process.exit(1);
        }

        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
            socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
        });

        logger.info(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        logger.error(`Error connecting to MongoDB: ${error.message}`);
        // Don't exit immediately - let the server start and retry connection
        logger.warn('Server will continue to run. MongoDB connection will be retried.');
    }
};

module.exports = connectDB;

