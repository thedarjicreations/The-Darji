import express from 'express';
import Order from '../models/Order.js';
import Client from '../models/Client.js';
import GarmentType from '../models/GarmentType.js';
import Invoice from '../models/Invoice.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import logger from '../config/logger.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/analytics/overview
 * @desc    Get dashboard overview statistics
 * @access  Private
 */
router.get('/overview', asyncHandler(async (req, res) => {
    const [
        totalOrders,
        totalClients,
        totalRevenue,
        pendingOrders,
        pendingOrderRevenue,
    ] = await Promise.all([
        Order.countDocuments(),
        Client.countDocuments(),
        Order.aggregate([
            { $match: { status: { $in: ['Completed', 'Delivered'] } } },
            { $group: { _id: null, total: { $sum: { $ifNull: ['$finalAmount', '$totalAmount'] } } } }
        ]),
        Order.countDocuments({ status: 'Pending' }),
        Order.aggregate([
            { $match: { status: { $nin: ['Completed', 'Delivered', 'Cancelled'] } } },
            { $group: { _id: null, total: { $sum: { $ifNull: ['$finalAmount', '$totalAmount'] } } } }
        ]),
    ]);

    // Recent orders
    const recentOrders = await Order.find()
        .populate('client', 'name')
        .sort({ createdAt: -1 })
        .limit(5)
        .select('orderNumber client totalAmount status createdAt');

    res.json({
        totalOrders,
        totalClients,
        totalRevenue: totalRevenue[0]?.total || 0,
        pendingOrders,
        pendingOrderRevenue: pendingOrderRevenue[0]?.total || 0,
        recentOrders,
    });
}));

/**
 * @route   GET /api/analytics/revenue
 * @desc    Get revenue analytics
 * @access  Private
 */
router.get('/revenue', asyncHandler(async (req, res) => {
    const { startDate, endDate, groupBy = 'month' } = req.query;

    let matchStage = { status: { $nin: ['Cancelled'] } };

    if (startDate || endDate) {
        matchStage.createdAt = {};
        if (startDate) matchStage.createdAt.$gte = new Date(startDate);
        if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }

    // Group format based on groupBy parameter
    const groupFormat = {
        day: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        month: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
        year: { $dateToString: { format: "%Y", date: "$createdAt" } },
    };

    const revenueData = await Order.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: groupFormat[groupBy],
                totalRevenue: { $sum: { $ifNull: ['$finalAmount', '$totalAmount'] } },
                totalOrders: { $sum: 1 },
                averageOrderValue: { $avg: { $ifNull: ['$finalAmount', '$totalAmount'] } },
            }
        },
        { $sort: { _id: 1 } }
    ]);

    res.json(revenueData);
}));

/**
 * @route   GET /api/analytics/profit
 * @desc    Get profit analytics
 * @access  Private
 */
router.get('/profit', asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;

    const buildMatchStage = (statuses) => {
        let stage = {};
        if (statuses) stage.status = { $in: statuses };
        else stage.status = { $nin: ['Cancelled'] };

        if (startDate || endDate) {
            stage.createdAt = {};
            if (startDate) stage.createdAt.$gte = new Date(startDate);
            if (endDate) stage.createdAt.$lte = new Date(endDate);
        }
        return stage;
    };

    const calculateMetrics = async (matchStage) => {
        const [revenueResult] = await Order.aggregate([
            { $match: matchStage },
            { $group: { _id: null, totalRevenue: { $sum: { $ifNull: ['$finalAmount', '$totalAmount'] } }, count: { $sum: 1 } } }
        ]);

        const [costResult] = await Order.aggregate([
            { $match: matchStage },
            { $unwind: '$items' },
            {
                $lookup: {
                    from: 'garmenttypes',
                    localField: 'items.garmentType',
                    foreignField: '_id',
                    as: 'catalogGarment'
                }
            },
            { $unwind: { path: '$catalogGarment', preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: null,
                    totalCost: {
                        $sum: {
                            $multiply: [
                                {
                                    $cond: [
                                        { $gt: [{ $ifNull: ['$items.cost', 0] }, 0] },
                                        '$items.cost',
                                        {
                                            $cond: [
                                                { $gt: [{ $ifNull: ['$catalogGarment.cost', 0] }, 0] },
                                                '$catalogGarment.cost',
                                                {
                                                    $multiply: [
                                                        {
                                                            $divide: [
                                                                { $ifNull: ['$items.subtotal', 0] },
                                                                { $cond: [{ $gt: ['$items.quantity', 0] }, '$items.quantity', 1] }
                                                            ]
                                                        },
                                                        0.6
                                                    ]
                                                }
                                            ]
                                        }
                                    ]
                                },
                                { $ifNull: ['$items.quantity', 1] }
                            ]
                        }
                    }
                }
            }
        ]);

        const [serviceCostResult] = await Order.aggregate([
            { $match: matchStage },
            { $unwind: { path: '$additionalServices', preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: null,
                    totalServiceCost: { $sum: { $ifNull: ['$additionalServices.cost', 0] } }
                }
            }
        ]);

        const totalRevenue = revenueResult?.totalRevenue || 0;
        const totalCost = (costResult?.totalCost || 0) + (serviceCostResult?.totalServiceCost || 0);
        return { totalRevenue, totalCost, profit: totalRevenue - totalCost, count: revenueResult?.count || 0 };
    };

    // Realized: Delivered/Completed
    const realized = await calculateMetrics(buildMatchStage(['Completed', 'Delivered']));

    // Potential: Pending/Trial/Processing (Not Cancelled, Not Completed/Delivered)
    const potential = await calculateMetrics({
        status: { $nin: ['Cancelled', 'Completed', 'Delivered'] },
        ...(startDate || endDate ? {
            createdAt: {
                ...(startDate && { $gte: new Date(startDate) }),
                ...(endDate && { $lte: new Date(endDate) })
            }
        } : {})
    });

    // Total (All Valid Orders) for generic stats if needed
    // const total = await calculateMetrics(buildMatchStage());

    const realizedProfitMargin = realized.totalRevenue > 0 ? ((realized.profit / realized.totalRevenue) * 100).toFixed(2) : 0;

    res.json({
        totalRevenue: realized.totalRevenue,
        totalCost: realized.totalCost,
        profit: realized.profit, // Main Profit = Realized
        profitMargin: parseFloat(realizedProfitMargin),
        orderCount: realized.count,
        potentialProfit: potential.profit, // Uncollected Profit
        potentialRevenue: potential.totalRevenue
    });
}));

/**
 * @route   GET /api/analytics/garments
 * @desc    Get garment popularity and profitability
 * @access  Private
 */
router.get('/garments', asyncHandler(async (req, res) => {
    const garmentStats = await Order.aggregate([
        { $match: { status: { $nin: ['Cancelled'] } } },
        { $unwind: { path: '$items', preserveNullAndEmptyArrays: true } },
        {
            $lookup: {
                from: 'garmenttypes',
                localField: 'items.garmentType',
                foreignField: '_id',
                as: 'garmentDetails'
            }
        },
        { $unwind: { path: '$garmentDetails', preserveNullAndEmptyArrays: true } },
        {
            $group: {
                _id: '$items.garmentType',
                name: { $first: { $ifNull: ['$garmentDetails.name', 'Unknown Garment'] } },
                price: { $first: { $ifNull: ['$garmentDetails.price', 0] } },
                totalQuantity: { $sum: '$items.quantity' },
                totalRevenue: { $sum: '$items.subtotal' },
                totalCost: {
                    $sum: {
                        $multiply: [
                            {
                                $cond: [
                                    { $gt: [{ $ifNull: ['$items.cost', 0] }, 0] },
                                    '$items.cost',
                                    {
                                        $cond: [
                                            { $gt: [{ $ifNull: ['$garmentDetails.cost', 0] }, 0] },
                                            '$garmentDetails.cost',
                                            {
                                                $multiply: [
                                                    {
                                                        $divide: [
                                                            { $ifNull: ['$items.subtotal', 0] },
                                                            { $cond: [{ $gt: ['$items.quantity', 0] }, '$items.quantity', 1] }
                                                        ]
                                                    },
                                                    0.6
                                                ]
                                            }
                                        ]
                                    }
                                ]
                            },
                            '$items.quantity'
                        ]
                    }
                },
                orderCount: { $sum: 1 },
            }
        },
        {
            $project: {
                _id: 1,
                name: 1,
                price: 1,
                totalCost: '$totalCost',
                totalQuantity: 1,
                totalRevenue: 1,
                orderCount: 1,
                profit: { $subtract: ['$totalRevenue', '$totalCost'] }
            }
        },
        { $sort: { totalQuantity: -1 } }
    ]);

    res.json(garmentStats);
}));

/**
 * @route   GET /api/analytics/clients
 * @desc    Get client analytics
 * @access  Private
 */
router.get('/clients', asyncHandler(async (req, res) => {
    const topClients = await Order.aggregate([
        { $match: { status: { $nin: ['Cancelled'] } } },
        {
            $group: {
                _id: '$client',
                totalSpent: { $sum: { $ifNull: ['$finalAmount', '$totalAmount'] } },
                orderCount: { $sum: 1 },
            }
        },
        {
            $lookup: {
                from: 'clients',
                localField: '_id',
                foreignField: '_id',
                as: 'clientDetails'
            }
        },
        { $unwind: '$clientDetails' },
        {
            $project: {
                _id: 1,
                name: '$clientDetails.name',
                phone: '$clientDetails.phone',
                totalSpent: 1,
                orderCount: 1,
                averageOrderValue: { $divide: ['$totalSpent', '$orderCount'] }
            }
        },
        { $sort: { totalSpent: -1 } },
        { $limit: 10 }
    ]);

    res.json(topClients);
}));

/**
 * @route   GET /api/analytics/status
 * @desc    Get order status distribution
 * @access  Private
 */
router.get('/status', asyncHandler(async (req, res) => {
    const statusDistribution = await Order.aggregate([
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalValue: { $sum: { $ifNull: ['$finalAmount', '$totalAmount'] } }
            }
        },
        { $sort: { count: -1 } }
    ]);

    res.json(statusDistribution);
}));

/**
 * @route   GET /api/analytics/discounts
 * @desc    Get discount analytics - total discounts given, original amounts
 * @access  Private
 */
router.get('/discounts', asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;

    let matchStage = { status: { $nin: ['Cancelled'] } };

    if (startDate || endDate) {
        matchStage.createdAt = {};
        if (startDate) matchStage.createdAt.$gte = new Date(startDate);
        if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }

    const discountData = await Order.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: null,
                totalOriginalAmount: { $sum: '$totalAmount' },
                totalFinalAmount: { $sum: { $ifNull: ['$finalAmount', '$totalAmount'] } },
                totalOrders: { $sum: 1 },
                ordersWithDiscounts: {
                    $sum: {
                        $cond: [
                            { $and: [{ $ne: ['$finalAmount', null] }, { $lt: ['$finalAmount', '$totalAmount'] }] },
                            1,
                            0
                        ]
                    }
                }
            }
        }
    ]);

    const data = discountData[0] || {
        totalOriginalAmount: 0,
        totalFinalAmount: 0,
        totalOrders: 0,
        ordersWithDiscounts: 0
    };

    const totalDiscounts = data.totalOriginalAmount - data.totalFinalAmount;
    const avgDiscountPercentage = data.totalOriginalAmount > 0
        ? ((totalDiscounts / data.totalOriginalAmount) * 100).toFixed(2)
        : 0;

    res.json({
        totalOriginalAmount: data.totalOriginalAmount,
        totalFinalAmount: data.totalFinalAmount,
        totalDiscounts,
        avgDiscountPercentage: parseFloat(avgDiscountPercentage),
        totalOrders: data.totalOrders,
        ordersWithDiscounts: data.ordersWithDiscounts
    });
}));

/**
 * @route   GET /api/analytics/discounted-orders
 * @desc    Get list of orders with discounts
 * @access  Private
 */
router.get('/discounted-orders', asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;

    let matchStage = {
        status: { $nin: ['Cancelled'] },
        $and: [
            { finalAmount: { $ne: null } },
            { $expr: { $lt: ['$finalAmount', '$totalAmount'] } }
        ]
    };

    if (startDate || endDate) {
        matchStage.createdAt = {};
        if (startDate) matchStage.createdAt.$gte = new Date(startDate);
        if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }

    const ordersWithDiscounts = await Order.find(matchStage)
        .populate('client', 'name phone')
        .select('orderNumber client totalAmount finalAmount createdAt status')
        .sort({ createdAt: -1 })
        .limit(50);

    const formattedOrders = ordersWithDiscounts.map(order => ({
        orderId: order._id,
        orderNumber: order.orderNumber,
        clientName: order.client?.name || 'Unknown',
        clientPhone: order.client?.phone || '',
        totalAmount: order.totalAmount,
        finalAmount: order.finalAmount || order.totalAmount,
        discountAmount: order.totalAmount - (order.finalAmount || order.totalAmount),
        discountPercentage: ((order.totalAmount - (order.finalAmount || order.totalAmount)) / order.totalAmount * 100).toFixed(2),
        status: order.status,
        orderDate: order.createdAt
    }));

    res.json(formattedOrders);
}));

export default router;
