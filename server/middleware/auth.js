import jwt from 'jsonwebtoken';
import logger from '../config/logger.js';
import User from '../models/User.js';

/**
 * Authentication middleware
 * Verifies JWT token and attaches user info to request
 */
export const authenticate = async (req, res, next) => {
    try {
        // Allow OPTIONS requests (CORS preflight) to pass through
        if (req.method === 'OPTIONS') {
            return next();
        }

        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'Authentication required',
                message: 'No token provided',
            });
        }

        const token = authHeader.split(' ')[1];

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Attach user info to request
        req.userId = decoded.userId;
        req.user = decoded;

        next();
    } catch (error) {
        logger.error(`Authentication error: ${error.message}`);

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'Token expired',
                message: 'Please login again',
            });
        }

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                error: 'Invalid token',
                message: 'Authentication failed',
            });
        }

        return res.status(401).json({ error: 'Authentication failed' });
    }
};

/**
 * Admin-only middleware
 * Use after authenticate middleware
 */
export const requireAdmin = async (req, res, next) => {
    try {
        const user = await User.findById(req.userId);

        if (!user || user.role !== 'admin') {
            return res.status(403).json({
                error: 'Access denied',
                message: 'Admin privileges required',
            });
        }

        next();
    } catch (error) {
        logger.error(`Authorization error: ${error.message}`);
        return res.status(403).json({ error: 'Access denied' });
    }
};

/**
 * Optional authentication middleware
 * Attaches user info if token is present, but doesn't require it
 */
export const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.userId = decoded.userId;
            req.user = decoded;
        }
    } catch (error) {
        // Ignore errors for optional auth
        logger.debug(`Optional auth failed: ${error.message}`);
    }

    next();
};
