import express from 'express';
import GarmentType from '../models/GarmentType.js';
import Order from '../models/Order.js';
import { validate } from '../middleware/validation.js';
import { createGarmentSchema, updateGarmentSchema } from '../validators/garmentValidator.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/garments
 * @desc    Get all garment types
 * @access  Private
 */
router.get('/', asyncHandler(async (req, res) => {
    const { category, isActive } = req.query;

    let query = {};
    if (category) query.category = category;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const garments = await GarmentType.find(query).sort({ name: 1 });

    res.json(garments);
}));

/**
 * @route   GET /api/garments/:id
 * @desc    Get garment type by ID
 * @access  Private
 */
router.get('/:id', asyncHandler(async (req, res) => {
    const garment = await GarmentType.findById(req.params.id);

    if (!garment) {
        return res.status(404).json({ error: 'Garment type not found' });
    }

    // Get usage statistics
    const usageCount = await Order.countDocuments({
        'items.garmentType': req.params.id,
    });

    res.json({
        ...garment.toObject(),
        usageCount,
    });
}));

/**
 * @route   POST /api/garments
 * @desc    Create new garment type
 * @access  Private
 */
router.post('/', validate(createGarmentSchema), asyncHandler(async (req, res) => {
    const garment = await GarmentType.create(req.body);
    res.status(201).json(garment);
}));

/**
 * @route   PUT /api/garments/:id
 * @desc    Update garment type
 * @access  Private
 */
router.put('/:id', validate(updateGarmentSchema), asyncHandler(async (req, res) => {
    const garment = await GarmentType.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    );

    if (!garment) {
        return res.status(404).json({ error: 'Garment type not found' });
    }

    res.json(garment);
}));

/**
 * @route   DELETE /api/garments/:id
 * @desc    Delete garment type
 * @access  Private
 */
router.delete('/:id', asyncHandler(async (req, res) => {
    // Check if garment is used in any orders
    const usageCount = await Order.countDocuments({
        'items.garmentType': req.params.id,
    });

    if (usageCount > 0) {
        return res.status(400).json({
            error: 'Cannot delete garment type that is used in orders',
            usageCount,
            suggestion: 'Consider marking it as inactive instead',
        });
    }

    const garment = await GarmentType.findByIdAndDelete(req.params.id);

    if (!garment) {
        return res.status(404).json({ error: 'Garment type not found' });
    }

    res.json({
        message: 'Garment type deleted successfully',
        garment,
    });
}));

/**
 * @route   GET /api/garments/stats/profitability
 * @desc    Get garment profitability statistics
 * @access  Private
 */
router.get('/stats/profitability', asyncHandler(async (req, res) => {
    const garments = await GarmentType.find({ isActive: true });

    const stats = garments.map(g => ({
        id: g._id,
        name: g.name,
        price: g.price,
        cost: g.cost,
        profitMargin: g.profitMargin,
        profitMarginPercentage: g.profitMarginPercentage,
    })).sort((a, b) => b.profitMarginPercentage - a.profitMarginPercentage);

    res.json(stats);
}));

export default router;
