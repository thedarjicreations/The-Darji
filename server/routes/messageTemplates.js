import express from 'express';
import MessageTemplate from '../models/MessageTemplate.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/message-templates
 * @desc    Get all message templates
 * @access  Private
 */
router.get('/', asyncHandler(async (req, res) => {
    const { type, isActive } = req.query;

    let query = {};
    if (type) query.type = type;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const templates = await MessageTemplate.find(query).sort({ name: 1 });

    res.json(templates);
}));

/**
 * @route   GET /api/message-templates/:id
 * @desc    Get template by ID
 * @access  Private
 */
router.get('/:id', asyncHandler(async (req, res) => {
    const template = await MessageTemplate.findById(req.params.id);

    if (!template) {
        return res.status(404).json({ error: 'Template not found' });
    }

    res.json(template);
}));

/**
 * @route   POST /api/message-templates
 * @desc    Create new template
 * @access  Private
 */
router.post('/', asyncHandler(async (req, res) => {
    const template = await MessageTemplate.create(req.body);
    res.status(201).json(template);
}));

/**
 * @route   PUT /api/message-templates/:id
 * @desc    Update template
 * @access  Private
 */
router.put('/:id', asyncHandler(async (req, res) => {
    const template = await MessageTemplate.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    );

    // If activating this template, deactivate others of the same type
    if (template && req.body.isActive === true) {
        await MessageTemplate.updateMany(
            { type: template.type, _id: { $ne: template._id } },
            { $set: { isActive: false } }
        );
    }

    if (!template) {
        return res.status(404).json({ error: 'Template not found' });
    }

    res.json(template);
}));

/**
 * @route   POST /api/message-templates/:id/render
 * @desc    Render template with data
 * @access  Private
 */
router.post('/:id/render', asyncHandler(async (req, res) => {
    const template = await MessageTemplate.findById(req.params.id);

    if (!template) {
        return res.status(404).json({ error: 'Template not found' });
    }

    const rendered = template.render(req.body);

    // Update usage stats
    template.usageCount += 1;
    template.lastUsedAt = new Date();
    await template.save();

    res.json({ rendered, variables: template.variables });
}));

/**
 * @route   DELETE /api/message-templates/:id
 * @desc    Delete template
 * @access  Private
 */
router.delete('/:id', asyncHandler(async (req, res) => {
    const template = await MessageTemplate.findByIdAndDelete(req.params.id);

    if (!template) {
        return res.status(404).json({ error: 'Template not found' });
    }

    res.json({ message: 'Template deleted successfully', template });
}));

export default router;
