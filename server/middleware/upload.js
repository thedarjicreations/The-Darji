import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { s3Client, S3_CONFIG } from '../config/s3.js';
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import logger from '../config/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Ensure uploads directory exists for local storage
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// File filter for validation
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        cb(null, true);
    } else {
        cb(new Error('Only images (JPEG, PNG, WEBP) and PDFs are allowed'));
    }
};

// Multer configuration for memory storage (used for both local and S3)
const multerConfig = {
    storage: multer.memoryStorage(),
    fileFilter,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB default
    },
};

export const upload = multer(multerConfig);

/**
 * Middleware to upload file to storage (local or S3)
 * Use this after multer upload middleware
 */
export const uploadToStorage = async (req, res, next) => {
    try {
        if (!req.file && !req.files) {
            return next();
        }

        const files = req.files ? (Array.isArray(req.files) ? req.files : Object.values(req.files).flat()) : [req.file];
        const uploadedFiles = [];

        for (const file of files) {
            if (!file) continue;

            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const filename = file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname);

            // Try S3 upload first if configured
            if (S3_CONFIG.isConfigured && s3Client) {
                try {
                    const s3Key = `uploads/${filename}`;

                    await s3Client.send(new PutObjectCommand({
                        Bucket: S3_CONFIG.uploadsBucket,
                        Key: s3Key,
                        Body: file.buffer,
                        ContentType: file.mimetype,
                    }));

                    logger.info(`File uploaded to S3: ${s3Key}`);

                    uploadedFiles.push({
                        fieldname: file.fieldname,
                        filename,
                        s3Key,
                        url: `/uploads/${filename}`,
                        storage: 'S3',
                        size: file.size,
                        mimetype: file.mimetype,
                    });
                } catch (s3Error) {
                    logger.error(`S3 upload failed, falling back to local: ${s3Error.message}`);

                    // Fallback to local storage
                    const localPath = path.join(uploadsDir, filename);
                    fs.writeFileSync(localPath, file.buffer);

                    uploadedFiles.push({
                        fieldname: file.fieldname,
                        filename,
                        path: `uploads/${filename}`,
                        url: `/uploads/${filename}`,
                        storage: 'Local',
                        size: file.size,
                        mimetype: file.mimetype,
                    });
                }
            } else {
                // Local storage only
                const localPath = path.join(uploadsDir, filename);
                fs.writeFileSync(localPath, file.buffer);

                uploadedFiles.push({
                    fieldname: file.fieldname,
                    filename,
                    path: `uploads/${filename}`,
                    url: `/uploads/${filename}`,
                    storage: 'Local',
                    size: file.size,
                    mimetype: file.mimetype,
                });

                logger.info(`File uploaded locally: ${filename}`);
            }
        }

        // Attach uploaded file info to request
        if (req.file) {
            req.uploadedFile = uploadedFiles[0];
        }
        if (req.files) {
            req.uploadedFiles = uploadedFiles;
        }

        next();
    } catch (error) {
        logger.error(`Upload error: ${error.message}`);
        next(error);
    }
};

/**
 * Delete file from storage (local or S3)
 */
export const deleteFile = async (fileInfo) => {
    try {
        if (!fileInfo) return;

        // If it's an S3 file
        if (fileInfo.s3Key || fileInfo.storage === 'S3') {
            if (S3_CONFIG.isConfigured && s3Client) {
                const key = fileInfo.s3Key || fileInfo.url.replace('/uploads/', 'uploads/');

                await s3Client.send(new DeleteObjectCommand({
                    Bucket: S3_CONFIG.uploadsBucket,
                    Key: key,
                }));

                logger.info(`File deleted from S3: ${key}`);
            }
        }
        // Local file
        else {
            const filePath = typeof fileInfo === 'string'
                ? path.join(__dirname, '../../', fileInfo)
                : path.join(__dirname, '../../', fileInfo.path || fileInfo.url);

            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                logger.info(`File deleted locally: ${filePath}`);
            }
        }
    } catch (error) {
        logger.error(`Error deleting file: ${error.message}`);
    }
};

// Legacy support - alias for old code
export const deleteImageFile = deleteFile;
