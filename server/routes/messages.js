import express from 'express';
import Message from '../models/Message.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import logger from '../config/logger.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/messages
 * @desc    Get all messages with filters
 * @access  Private
 */
router.get('/', asyncHandler(async (req, res) => {
    const { status, type, clientId } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    let query = {};
    if (status) query.status = status;
    if (type) query.type = type;
    if (clientId) query.client = clientId;

    const messages = await Message.find(query)
        .populate('client', 'name phone')
        .populate('order', 'orderNumber')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

    const total = await Message.countDocuments(query);

    res.json({
        messages,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
}));

/**
 * @route   GET /api/messages/client/:clientId
 * @desc    Get message history for a client
 * @access  Private
 */
router.get('/client/:clientId', asyncHandler(async (req, res) => {
    const messages = await Message.find({ client: req.params.clientId })
        .populate('order', 'orderNumber')
        .sort({ createdAt: -1 });

    res.json(messages);
}));

/**
 * @route   POST /api/messages
 * @desc    Create and optionally send message
 * @access  Private
 */
router.post('/', asyncHandler(async (req, res) => {
    const message = await Message.create({
        ...req.body,
        sentBy: req.userId,
    });

    await message.populate('client', 'name phone');



    res.status(201).json(message);
}));

/**
 * @route   PATCH /api/messages/:id/status
 * @desc    Update message status
 * @access  Private
 */
router.patch('/:id/status', asyncHandler(async (req, res) => {
    const { status, metadata } = req.body;

    const message = await Message.findByIdAndUpdate(
        req.params.id,
        { status, metadata },
        { new: true }
    ).populate('client', 'name phone');

    if (!message) {
        return res.status(404).json({ error: 'Message not found' });
    }

    res.json(message);
}));

export default router;
