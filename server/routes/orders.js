import express from 'express';
import Order from '../models/Order.js';
import Message from '../models/Message.js';
import MessageTemplate from '../models/MessageTemplate.js';
import { validate } from '../middleware/validation.js';
import { createOrderSchema, updateOrderSchema, updateStatusSchema } from '../validators/orderValidator.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { upload, uploadToStorage } from '../middleware/upload.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/orders
 * @desc    Get all orders with filters
 * @access  Private
 */
router.get('/', asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const { status, clientId, startDate, endDate } = req.query;

    let query = {};

    if (status) query.status = status;
    if (clientId) query.client = clientId;

    if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const orders = await Order.find(query)
        .populate('client', 'name phone email')
        .populate('items.garmentType', 'name price')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

    const total = await Order.countDocuments(query);

    res.json({
        orders,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
        },
    });
}));

/**
 * @route   GET /api/orders/:id
 * @desc    Get order by ID
 * @access  Private
 */
router.get('/:id', asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id)
        .populate('client')
        .populate('items.garmentType');

    if (!order) {
        return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
}));

/**
 * @route   POST /api/orders
 * @desc    Create new order
 * @access  Private
 */
router.post('/',
    upload.any(),
    (req, res, next) => {
        if (req.body.orderData) {
            try {
                const data = JSON.parse(req.body.orderData);
                Object.assign(req.body, data);

                // Fix client field validation (expects ID string, but might be object in orderData)
                if (req.body.clientId) {
                    req.body.client = req.body.clientId;
                }
            } catch (error) {
                return res.status(400).json({ error: 'Invalid JSON in orderData' });
            }
        }
        next();
    },
    validate(createOrderSchema),
    uploadToStorage,
    asyncHandler(async (req, res) => {
        // Map uploaded images to special requirements
        if (req.uploadedFiles && req.uploadedFiles.length > 0 && req.body.specialRequirements) {
            req.uploadedFiles.forEach(file => {
                // Check if file belongs to a requirement image array: requirements[0][images]
                const arrayMatch = file.fieldname.match(/requirements\[(\d+)\]\[images\]/);
                // Check for single image (legacy/fallback): requirements[0][image]
                const singleMatch = file.fieldname.match(/requirements\[(\d+)\]\[image\]/);

                if (arrayMatch) {
                    const index = parseInt(arrayMatch[1]);
                    if (req.body.specialRequirements[index]) {
                        if (!req.body.specialRequirements[index].images) {
                            req.body.specialRequirements[index].images = [];
                        }
                        req.body.specialRequirements[index].images.push({
                            url: file.url,
                            s3Key: file.s3Key
                        });
                        // Set primary image if not set
                        if (!req.body.specialRequirements[index].imageUrl) {
                            req.body.specialRequirements[index].imageUrl = file.url;
                            req.body.specialRequirements[index].s3Key = file.s3Key;
                        }
                    }
                } else if (singleMatch) {
                    const index = parseInt(singleMatch[1]);
                    if (req.body.specialRequirements[index]) {
                        req.body.specialRequirements[index].imageUrl = file.url;
                        req.body.specialRequirements[index].s3Key = file.s3Key;
                        if (!req.body.specialRequirements[index].images) {
                            req.body.specialRequirements[index].images = [];
                        }
                        req.body.specialRequirements[index].images.push({
                            url: file.url,
                            s3Key: file.s3Key
                        });
                    }
                }
            });
        }

        const order = await Order.create(req.body);

        // Populate references
        await order.populate('client');
        await order.populate('items.garmentType');

        // CUSTOMER NOTIFICATION: Order Received
        try {
            // Find active template
            const template = await MessageTemplate.findOne({
                type: 'OrderConfirmation',
                isActive: true
            });

            let content = `We have received your order #${order.orderNumber}. Kindly check your invoice. Thank you for choosing The Darji!`;

            if (template) {
                // Manual rendering since model method might not be available on POJO if we lean on lean() or just for safety
                // But here we have a document, can use helper or regex
                content = template.content
                    .replace(/{{clientName}}/g, order.client.name)
                    .replace(/{{orderNumber}}/g, order.orderNumber)
                    .replace(/{{shopName}}/g, 'The Darji'); // Add more as needed

                // Update usage
                await MessageTemplate.findByIdAndUpdate(template._id, { $inc: { usageCount: 1 }, lastUsedAt: new Date() });
            }

            await Message.create({
                client: order.client._id,
                order: order._id,
                type: 'OrderConfirmation',
                status: 'Sent',
                content: content,
                sentBy: req.userId
            });
        } catch (msgError) {
            console.error('Failed to create automatic message:', msgError);
            // Don't fail the request if message fails
        }

        res.status(201).json(order);
    }));

/**
 * @route   PUT /api/orders/:id
 * @desc    Update order
 * @access  Private
 */
router.put('/:id',
    upload.any(),
    (req, res, next) => {
        if (req.body.orderData) {
            try {
                const data = JSON.parse(req.body.orderData);
                Object.assign(req.body, data);
            } catch (error) {
                return res.status(400).json({ error: 'Invalid JSON in orderData' });
            }
        }
        next();
    },
    validate(updateOrderSchema),
    uploadToStorage,
    asyncHandler(async (req, res) => {
        // Map uploaded images to special requirements
        if (req.uploadedFiles && req.uploadedFiles.length > 0 && req.body.specialRequirements) {
            req.uploadedFiles.forEach(file => {
                const arrayMatch = file.fieldname.match(/requirements\[(\d+)\]\[images\]/);
                const singleMatch = file.fieldname.match(/requirements\[(\d+)\]\[image\]/);

                if (arrayMatch) {
                    const index = parseInt(arrayMatch[1]);
                    if (req.body.specialRequirements[index]) {
                        if (!req.body.specialRequirements[index].images) {
                            req.body.specialRequirements[index].images = [];
                        }
                        req.body.specialRequirements[index].images.push({
                            url: file.url,
                            s3Key: file.s3Key
                        });
                        if (!req.body.specialRequirements[index].imageUrl) {
                            req.body.specialRequirements[index].imageUrl = file.url;
                            req.body.specialRequirements[index].s3Key = file.s3Key;
                        }
                    }
                } else if (singleMatch) {
                    const index = parseInt(singleMatch[1]);
                    if (req.body.specialRequirements[index]) {
                        req.body.specialRequirements[index].imageUrl = file.url;
                        req.body.specialRequirements[index].s3Key = file.s3Key;
                        if (!req.body.specialRequirements[index].images) {
                            req.body.specialRequirements[index].images = [];
                        }
                        req.body.specialRequirements[index].images.push({
                            url: file.url,
                            s3Key: file.s3Key
                        });
                    }
                }
            });
        }

        const order = await Order.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        )
            .populate('client')
            .populate('items.garmentType');

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        res.json(order);
    }));

/**
 * @route   PATCH /api/orders/:id
 * @desc    Partial update of order (e.g., finalAmount for bill adjustment)
 * @access  Private
 */
router.patch('/:id', asyncHandler(async (req, res) => {
    const order = await Order.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    )
        .populate('client')
        .populate('items.garmentType');

    if (!order) {
        return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
}));

/**
 * @route   PATCH /api/orders/:id/status
 * @desc    Update order status
 * @access  Private
 */
router.patch('/:id/status', validate(updateStatusSchema), asyncHandler(async (req, res) => {
    const { status, cancellationReason } = req.body;

    const update = { status };
    if (status === 'Cancelled' && cancellationReason) {
        update.cancellationReason = cancellationReason;
    }

    const order = await Order.findByIdAndUpdate(
        req.params.id,
        update,
        { new: true, runValidators: true }
    ).populate('client').populate('items.garmentType');

    if (!order) {
        return res.status(404).json({ error: 'Order not found' });
    }



    res.json(order);
}));

/**
 * @route   PUT /api/orders/:id/measurements
 * @desc    Add/update measurements
 * @access  Private
 */
router.put('/:id/measurements', asyncHandler(async (req, res) => {
    const order = await Order.findByIdAndUpdate(
        req.params.id,
        { measurements: req.body },
        { new: true, runValidators: true }
    );

    if (!order) {
        return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
}));

/**
 * @route   POST /api/orders/:id/special-requirements
 * @desc    Add special requirement with optional image
 * @access  Private
 */
router.post('/:id/special-requirements',
    upload.array('images'),
    uploadToStorage,
    asyncHandler(async (req, res) => {
        const { note } = req.body;

        if (!note) {
            return res.status(400).json({ error: 'Note is required' });
        }

        const images = req.uploadedFiles?.map(file => ({
            url: file.url,
            s3Key: file.s3Key
        })) || [];

        const requirement = {
            note,
            images,
            imageUrl: images[0]?.url,
            s3Key: images[0]?.s3Key,
        };

        const order = await Order.findByIdAndUpdate(
            req.params.id,
            { $push: { specialRequirements: requirement } },
            { new: true }
        );

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        res.json(order);
    })
);

/**
 * @route   POST /api/orders/:id/trial-notes
 * @desc    Add trial note with optional image
 * @access  Private
 */
router.post('/:id/trial-notes',
    upload.array('images'),
    uploadToStorage,
    asyncHandler(async (req, res) => {
        const { note } = req.body;

        if (!note) {
            return res.status(400).json({ error: 'Note is required' });
        }

        const images = req.uploadedFiles?.map(file => ({
            url: file.url,
            s3Key: file.s3Key
        })) || [];

        const trialNote = {
            note,
            images,
            // Fallback for single image support if needed
            imageUrl: images[0]?.url,
            s3Key: images[0]?.s3Key,
        };

        const order = await Order.findByIdAndUpdate(
            req.params.id,
            { $push: { trialNotes: trialNote } },
            { new: true }
        );

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        res.json(order);
    })
);

/**
 * @route   PATCH /api/orders/:id/trial-notes/:noteId
 * @desc    Update a trial note
 * @access  Private
 */
router.patch('/:id/trial-notes/:noteId',
    upload.array('images'),
    uploadToStorage,
    asyncHandler(async (req, res) => {
        const { note } = req.body;

        if (!note && !req.uploadedFiles) {
            return res.status(400).json({ error: 'Note or images are required' });
        }

        const updateOperation = {};
        if (note) {
            updateOperation['trialNotes.$.note'] = note;
        }

        // Perform update for the note text
        if (Object.keys(updateOperation).length > 0) {
            await Order.findOneAndUpdate(
                { _id: req.params.id, 'trialNotes._id': req.params.noteId },
                { $set: updateOperation },
                { new: true }
            );
        }


        if (req.uploadedFiles && req.uploadedFiles.length > 0) {
            const newImages = req.uploadedFiles.map(file => ({
                url: file.url,
                s3Key: file.s3Key
            }));

            await Order.findOneAndUpdate(
                { _id: req.params.id, 'trialNotes._id': req.params.noteId },
                {
                    $push: { 'trialNotes.$.images': { $each: newImages } }
                }
            );
        }

        // Fetch updated order to return
        const updatedOrder = await Order.findById(req.params.id)
            .populate('client')
            .populate('items.garmentType');

        if (!updatedOrder) {
            return res.status(404).json({ error: 'Order or trial note not found' });
        }

        res.json(updatedOrder);
    })
);

/**
 * @route   DELETE /api/orders/:id/trial-notes/:noteId
 * @desc    Delete a trial note
 * @access  Private
 */
router.delete('/:id/trial-notes/:noteId', asyncHandler(async (req, res) => {
    const order = await Order.findByIdAndUpdate(
        req.params.id,
        {
            $pull: {
                trialNotes: { _id: req.params.noteId }
            }
        },
        { new: true }
    );

    if (!order) {
        return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
}));

/**
 * @route   DELETE /api/orders/:id
 * @desc    Delete order
 * @access  Private
 */
router.delete('/:id', asyncHandler(async (req, res) => {
    const order = await Order.findByIdAndDelete(req.params.id);

    if (!order) {
        return res.status(404).json({ error: 'Order not found' });
    }

    res.json({
        message: 'Order deleted successfully',
        order,
    });
}));

export default router;
