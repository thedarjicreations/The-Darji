import express from 'express';
import Client from '../models/Client.js';
import Order from '../models/Order.js';
import { validate } from '../middleware/validation.js';
import { createClientSchema, updateClientSchema } from '../validators/clientValidator.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/clients
 * @desc    Get all clients with pagination and search
 * @access  Private
 */
router.get('/', asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 1000; // Increased default limit for client cards
    const search = req.query.search;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    let query = {};

    // Text search
    if (search) {
        query = {
            $or: [
                { name: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
            ],
        };
    }

    const clients = await Client.find(query)
        .sort({ [sortBy]: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

    // Fetch orders for all clients in one query
    const clientIds = clients.map(c => c._id);
    const orders = await Order.find({ client: { $in: clientIds } })
        .select('client totalAmount finalAmount advance status')
        .lean();

    // Group orders by client
    const ordersByClient = orders.reduce((acc, order) => {
        const clientId = order.client.toString();
        if (!acc[clientId]) acc[clientId] = [];
        acc[clientId].push(order);
        return acc;
    }, {});

    // Attach order data to each client
    const clientsWithOrders = clients.map(client => ({
        ...client,
        orders: ordersByClient[client._id.toString()] || []
    }));

    const total = await Client.countDocuments(query);

    res.json({
        clients: clientsWithOrders,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
        },
    });
}));

/**
 * @route   GET /api/clients/:id
 * @desc    Get client by ID with order history
 * @access  Private
 */
router.get('/:id', asyncHandler(async (req, res) => {
    const client = await Client.findById(req.params.id);

    if (!client) {
        return res.status(404).json({ error: 'Client not found' });
    }

    // Get client's orders
    const orders = await Order.find({ client: req.params.id })
        .populate('items.garmentType', 'name price')
        .sort({ createdAt: -1 })
        .limit(50);

    // Calculate statistics
    const stats = {
        totalOrders: orders.length,
        totalSpent: orders.reduce((sum, order) => sum + (order.finalAmount || order.totalAmount), 0),
        pendingBalance: orders.reduce((sum, order) => sum + order.balance, 0),
        completedOrders: orders.filter(o => o.status === 'Completed' || o.status === 'Delivered').length,
    };

    res.json({
        ...client.toObject(),
        orders,
        stats,
    });
}));

/**
 * @route   POST /api/clients
 * @desc    Create new client
 * @access  Private
 */
router.post('/', validate(createClientSchema), asyncHandler(async (req, res) => {
    const client = await Client.create(req.body);
    res.status(201).json(client);
}));

/**
 * @route   PUT /api/clients/:id
 * @desc    Update client
 * @access  Private
 */
router.put('/:id', validate(updateClientSchema), asyncHandler(async (req, res) => {
    const client = await Client.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    );

    if (!client) {
        return res.status(404).json({ error: 'Client not found' });
    }

    res.json(client);
}));

/**
 * @route   DELETE /api/clients/:id
 * @desc    Delete client
 * @access  Private
 */
router.delete('/:id', asyncHandler(async (req, res) => {
    // Check if client has orders
    const orderCount = await Order.countDocuments({ client: req.params.id });

    if (orderCount > 0) {
        return res.status(400).json({
            error: 'Cannot delete client with existing orders',
            orderCount,
        });
    }

    const client = await Client.findByIdAndDelete(req.params.id);

    if (!client) {
        return res.status(404).json({ error: 'Client not found' });
    }

    res.json({
        message: 'Client deleted successfully',
        client,
    });
}));

export default router;
