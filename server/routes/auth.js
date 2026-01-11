import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { validate } from '../middleware/validation.js';
import { registerSchema, loginSchema } from '../validators/authValidator.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import logger from '../config/logger.js';

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', validate(registerSchema), asyncHandler(async (req, res) => {
    const { username, password, name, role } = req.body;

    // Create user (password will be hashed by pre-save hook)
    const user = await User.create({
        username,
        password,
        name,
        role: role || 'user',
    });

    // Generate JWT token
    const token = jwt.sign(
        { userId: user._id, username: user.username, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    logger.info(`User registered: ${user.username}`);

    res.status(201).json({
        message: 'User registered successfully',
        token,
        user: {
            id: user._id,
            username: user.username,
            name: user.name,
            role: user.role,
        },
    });
}));

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', validate(loginSchema), asyncHandler(async (req, res) => {
    const { username, password } = req.body;

    // Find user
    const user = await User.findOne({ username, isActive: true });
    if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
        { userId: user._id, username: user.username, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    logger.info(`User logged in: ${user.username}`);

    res.json({
        message: 'Login successful',
        token,
        user: {
            id: user._id,
            username: user.username,
            name: user.name,
            role: user.role,
        },
    });
}));

/**
 * @route   GET /api/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get('/me', authenticate, asyncHandler(async (req, res) => {
    const user = await User.findById(req.userId).select('-password');

    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
}));

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh JWT token
 * @access  Private
 */
router.post('/refresh', authenticate, asyncHandler(async (req, res) => {
    const user = await User.findById(req.userId);

    if (!user || !user.isActive) {
        return res.status(401).json({ error: 'User not found or inactive' });
    }

    // Generate new token
    const token = jwt.sign(
        { userId: user._id, username: user.username, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
        message: 'Token refreshed',
        token,
    });
}));

export default router;
