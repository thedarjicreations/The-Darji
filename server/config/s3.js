import { S3Client } from '@aws-sdk/client-s3';
import logger from './logger.js';

// Validate AWS configuration
const validateAWSConfig = () => {
    const required = ['AWS_REGION', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'];
    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
        logger.warn(`AWS S3 not configured. Missing: ${missing.join(', ')}`);
        return false;
    }
    return true;
};

// Create S3 client only if credentials are provided
let s3Client = null;

if (validateAWSConfig()) {
    try {
        s3Client = new S3Client({
            region: process.env.AWS_REGION,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            },
        });
        logger.info('✅ AWS S3 Client initialized');
    } catch (error) {
        logger.error(`Failed to initialize AWS S3 Client: ${error.message}`);
    }
} else {
    logger.info('ℹ️  AWS S3 not configured - using local storage');
}

export { s3Client };

export const S3_CONFIG = {
    uploadsBucket: process.env.AWS_S3_BUCKET || 'thedarji-uploads',
    invoicesBucket: process.env.AWS_S3_INVOICE_BUCKET || 'thedarji-invoices',
    region: process.env.AWS_REGION || 'ap-south-1',
    isConfigured: s3Client !== null,
};
