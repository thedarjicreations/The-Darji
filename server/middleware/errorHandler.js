import logger from '../config/logger.js';

/**
 * Global error handler middleware
 * Handles all errors and sends appropriate responses
 */
export const errorHandler = (err, req, res, next) => {
    // Log the error
    // console.error('🔥 GLOBAL ERROR CAUGHT:', err); // Disabled for production cleanliness
    logger.error({
        message: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userId: req.userId,
        body: req.body,
    });

    // Mongoose validation errors
    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(e => ({
            field: e.path,
            message: e.message,
        }));
        return res.status(400).json({
            error: 'Validation failed',
            details: errors,
        });
    }

    // Mongoose duplicate key error
    if (err.code === 11000) {
        const field = Object.keys(err.keyPattern || {})[0] || 'field';
        return res.status(409).json({
            error: `Duplicate value`,
            message: `${field} already exists`,
            field,
        });
    }

    // Mongoose cast error (invalid ObjectId)
    if (err.name === 'CastError') {
        return res.status(400).json({
            error: 'Invalid ID format',
            field: err.path,
        });
    }

    // Zod validation errors
    if (err.name === 'ZodError') {
        const errors = err.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
        }));
        return res.status(400).json({
            error: 'Validation error',
            details: errors,
        });
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Invalid token' });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired' });
    }

    // Multer file upload errors
    if (err.name === 'MulterError') {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                error: 'File too large',
                maxSize: '5MB',
            });
        }
        return res.status(400).json({ error: err.message });
    }

    // Default error response
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal server error';

    res.status(statusCode).json({
        error: message,
        ...(process.env.NODE_ENV === 'development' && {
            stack: err.stack,
            details: err,
        }),
    });
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req, res) => {
    res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl,
        method: req.method,
    });
};

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
