import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client, S3_CONFIG } from '../config/s3.js';
import logger from '../config/logger.js';

/**
 * Upload file buffer to S3
 */
export async function uploadToS3(buffer, filename, mimetype, folder = 'uploads') {
    if (!S3_CONFIG.isConfigured || !s3Client) {
        throw new Error('AWS S3 is not configured');
    }

    const key = `${folder}/${Date.now()}-${filename}`;

    try {
        await s3Client.send(new PutObjectCommand({
            Bucket: S3_CONFIG.uploadsBucket,
            Key: key,
            Body: buffer,
            ContentType: mimetype,
        }));

        logger.info(`File uploaded to S3: ${key}`);
        return { s3Key: key, bucket: S3_CONFIG.uploadsBucket };
    } catch (error) {
        logger.error(`S3 upload failed: ${error.message}`);
        throw error;
    }
}

/**
 * Upload invoice PDF to S3
 */
export async function uploadInvoiceToS3(buffer, filename) {
    if (!S3_CONFIG.isConfigured || !s3Client) {
        throw new Error('AWS S3 is not configured');
    }

    const key = `invoices/${filename}`;

    try {
        await s3Client.send(new PutObjectCommand({
            Bucket: S3_CONFIG.invoicesBucket,
            Key: key,
            Body: buffer,
            ContentType: 'application/pdf',
        }));

        logger.info(`Invoice uploaded to S3: ${key}`);
        return { s3Key: key, bucket: S3_CONFIG.invoicesBucket };
    } catch (error) {
        logger.error(`S3 invoice upload failed: ${error.message}`);
        throw error;
    }
}

/**
 * Generate presigned URL for secure file access
 */
export async function getPresignedUrl(s3Key, bucket = S3_CONFIG.uploadsBucket, expiresIn = 3600) {
    if (!S3_CONFIG.isConfigured || !s3Client) {
        throw new Error('AWS S3 is not configured');
    }

    try {
        const url = await getSignedUrl(
            s3Client,
            new GetObjectCommand({ Bucket: bucket, Key: s3Key }),
            { expiresIn }
        );

        return url;
    } catch (error) {
        logger.error(`Failed to generate presigned URL: ${error.message}`);
        throw error;
    }
}

/**
 * Delete file from S3
 */
export async function deleteFromS3(s3Key, bucket = S3_CONFIG.uploadsBucket) {
    if (!S3_CONFIG.isConfigured || !s3Client) {
        loggers.warn('AWS S3 not configured, skipping delete');
        return;
    }

    try {
        await s3Client.send(new DeleteObjectCommand({
            Bucket: bucket,
            Key: s3Key,
        }));

        logger.info(`File deleted from S3: ${s3Key}`);
    } catch (error) {
        logger.error(`S3 delete failed: ${error.message}`);
        throw error;
    }
}

/**
 * Check if S3 is configured
 */
export function isS3Configured() {
    return S3_CONFIG.isConfigured && s3Client !== null;
}
