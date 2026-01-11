import mongoose from 'mongoose';
import logger from './logger.js';

const connectDB = async () => {
    try {
        // Mongoose connection options
        const options = {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            family: 4, // Use IPv4
        };

        const conn = await mongoose.connect(process.env.MONGODB_URI, options);

        logger.info(`✅ MongoDB Connected: ${conn.connection.host}`);
        logger.info(`📊 Database: ${conn.connection.name}`);

        // Connection event handlers
        mongoose.connection.on('error', (err) => {
            logger.error(`MongoDB connection error: ${err}`);
        });

        mongoose.connection.on('disconnected', () => {
            logger.warn('MongoDB disconnected. Attempting to reconnect...');
        });

        mongoose.connection.on('reconnected', () => {
            logger.info('MongoDB reconnected successfully');
        });

        // Graceful shutdown
        process.on('SIGINT', async () => {
            await mongoose.connection.close();
            logger.info('MongoDB connection closed through app termination');
            process.exit(0);
        });

    } catch (error) {
        logger.error(`❌ MongoDB connection failed: ${error.message}`);
        logger.error(error.stack);
        process.exit(1);
    }
};

export default connectDB;
