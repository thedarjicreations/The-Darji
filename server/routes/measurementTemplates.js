import express from 'express';
import MeasurementTemplate from '../models/MeasurementTemplate.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/measurement-templates
 * @desc    Get all measurement templates
 * @access  Private
 */
router.get('/', asyncHandler(async (req, res) => {
    const { clientId, garmentTypeId } = req.query;

    let query = {};
    if (clientId) query.client = clientId;
    if (garmentTypeId) query.garmentType = garmentTypeId;

    const templates = await MeasurementTemplate.find(query)
        .populate('client', 'name')
        .populate('garmentType', 'name')
        .sort({ createdAt: -1 });

    res.json(templates);
}));

/**
 * @route   GET /api/measurement-templates/client/:clientId
 * @desc    Get all templates for a client
 * @access  Private
 */
router.get('/client/:clientId', asyncHandler(async (req, res) => {
    const templates = await MeasurementTemplate.find({ client: req.params.clientId })
        .populate('garmentType', 'name')
        .sort({ lastUsedAt: -1, createdAt: -1 });

    res.json(templates);
}));

/**
 * @route   GET /api/measurement-templates/:id
 * @desc    Get template by ID
 * @access  Private
 */
router.get('/:id', asyncHandler(async (req, res) => {
    const template = await MeasurementTemplate.findById(req.params.id)
        .populate('client', 'name phone')
        .populate('garmentType', 'name');

    if (!template) {
        return res.status(404).json({ error: 'Template not found' });
    }

    res.json(template);
}));

/**
 * @route   POST /api/measurement-templates
 * @desc    Create new template
 * @access  Private
 */
router.post('/', asyncHandler(async (req, res) => {
    const template = await MeasurementTemplate.create(req.body);

    await template.populate('client', 'name');
    await template.populate('garmentType', 'name');

    res.status(201).json(template);
}));

/**
 * @route   PUT /api/measurement-templates/:id
 * @desc    Update template
 * @access  Private
 */
router.put('/:id', asyncHandler(async (req, res) => {
    const template = await MeasurementTemplate.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    )
        .populate('client', 'name')
        .populate('garmentType', 'name');

    if (!template) {
        return res.status(404).json({ error: 'Template not found' });
    }

    res.json(template);
}));

/**
 * @route   POST /api/measurement-templates/:id/use
 * @desc    Record template usage
 * @access  Private
 */
router.post('/:id/use', asyncHandler(async (req, res) => {
    const template = await MeasurementTemplate.findById(req.params.id);

    if (!template) {
        return res.status(404).json({ error: 'Template not found' });
    }

    await template.recordUsage();

    res.json({ message: 'Usage recorded', template });
}));

/**
 * @route   DELETE /api/measurement-templates/:id
 * @desc    Delete template
 * @access  Private
 */
router.delete('/:id', asyncHandler(async (req, res) => {
    const template = await MeasurementTemplate.findByIdAndDelete(req.params.id);

    if (!template) {
        return res.status(404).json({ error: 'Template not found' });
    }

    res.json({ message: 'Template deleted successfully', template });
}));

export default router;
