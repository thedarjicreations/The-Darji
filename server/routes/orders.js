import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';
import { generateInvoice } from '../services/invoiceService.js';
import { sendOrderConfirmation } from '../services/messagingService.js';
import { upload, deleteImageFile } from '../middleware/upload.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get all orders with filters
router.get('/', authenticate, async (req, res) => {
    try {
        const { status, startDate, endDate } = req.query;

        const where = {};
        if (status) where.status = status;
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = new Date(startDate);
            if (endDate) where.createdAt.lte = new Date(endDate);
        }

        const orders = await prisma.order.findMany({
            where,
            include: {
                client: true,
                items: {
                    include: {
                        garmentType: true
                    }
                },
                specialRequirements: true,
                trialNotes: true,
                invoice: true
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(orders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// Get order by ID
router.get('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;

        const order = await prisma.order.findUnique({
            where: { id },
            include: {
                client: true,
                items: {
                    include: {
                        garmentType: true
                    }
                },
                additionalServiceItems: true,
                specialRequirements: true,
                trialNotes: true,
                invoice: true
            }
        });

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        res.json(order);
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({ error: 'Failed to fetch order' });
    }
});

// Create new order
router.post('/', authenticate, upload.array('requirementImages', 10), async (req, res) => {
    try {
        // Parse JSON fields if they come from FormData
        const clientId = req.body.clientId;
        const items = typeof req.body.items === 'string' ? JSON.parse(req.body.items) : req.body.items;
        const specialRequirements = typeof req.body.specialRequirements === 'string'
            ? JSON.parse(req.body.specialRequirements)
            : (req.body.specialRequirements || []);
        const additionalServiceItems = typeof req.body.additionalServiceItems === 'string'
            ? JSON.parse(req.body.additionalServiceItems)
            : (req.body.additionalServiceItems || []);
        const trialDate = req.body.trialDate;
        const deliveryDate = req.body.deliveryDate;
        const advance = parseFloat(req.body.advance) || 0;
        const additionalServices = req.body.additionalServices;
        const additionalServicesAmount = req.body.additionalServicesAmount;
        const additionalServicesCost = req.body.additionalServicesCost;
        const measurements = req.body.measurements || null;

        // Generate unique order number by finding max existing number
        const lastOrder = await prisma.order.findFirst({
            orderBy: { createdAt: 'desc' },
            select: { orderNumber: true }
        });

        let orderNum = 1;
        if (lastOrder && lastOrder.orderNumber) {
            // Extract number from format TD00001
            const lastNum = parseInt(lastOrder.orderNumber.replace('TD', ''));
            orderNum = lastNum + 1;
        }

        const orderNumber = `TD${String(orderNum).padStart(5, '0')}`;

        // Calculate total amount (stitching + additional services)
        const stitchingTotal = items.reduce((sum, item) => sum + item.subtotal, 0);

        // Calculate additional services total from new array format or fallback to old format
        let additionalServicesTotal = 0;
        if (additionalServiceItems && additionalServiceItems.length > 0) {
            additionalServicesTotal = additionalServiceItems.reduce((sum, service) => sum + service.amount, 0);
        } else if (additionalServicesAmount) {
            // Backward compatibility with old format
            additionalServicesTotal = parseFloat(additionalServicesAmount) || 0;
        }

        const totalAmount = stitchingTotal + additionalServicesTotal;

        // Prepare special requirements with images
        // Normalize requirementImageIndices
        let reqImageIndices = [];
        if (req.body.requirementImageIndices) {
            if (Array.isArray(req.body.requirementImageIndices)) {
                reqImageIndices = req.body.requirementImageIndices.map(Number);
            } else {
                reqImageIndices = [Number(req.body.requirementImageIndices)];
            }
        }

        // Prepare special requirements with images
        const requirementsData = specialRequirements?.length ? specialRequirements.map((requirement, index) => {
            const data = { note: typeof requirement === 'string' ? requirement : requirement.note || requirement };

            // Add image path if uploaded
            const filePos = reqImageIndices.indexOf(index);
            if (filePos !== -1 && req.files && req.files[filePos]) {
                data.imageUrl = `/uploads/requirements/${req.files[filePos].filename}`;
            }

            return data;
        }) : [];

        // Create order with items and additional services
        const order = await prisma.order.create({
            data: {
                orderNumber,
                clientId,
                totalAmount,
                advance: advance,
                // Keep old fields for backward compatibility
                additionalServices: additionalServices || null,
                additionalServicesAmount: parseFloat(additionalServicesAmount) || 0,
                additionalServicesCost: parseFloat(additionalServicesCost) || 0,
                trialDate: trialDate ? new Date(trialDate) : null,
                deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
                measurements: measurements,
                items: {
                    create: await Promise.all(items.map(async (item) => {
                        // Fetch garment type to get the cost
                        const garmentType = await prisma.garmentType.findUnique({
                            where: { id: item.garmentTypeId }
                        });

                        return {
                            garmentTypeId: item.garmentTypeId,
                            quantity: item.quantity,
                            price: item.price,
                            cost: item.cost !== undefined ? item.cost : (garmentType?.cost || 0),
                            subtotal: item.subtotal
                        };
                    }))
                },
                // Create additional service items if provided
                additionalServiceItems: additionalServiceItems && additionalServiceItems.length > 0 ? {
                    create: additionalServiceItems.map(service => ({
                        description: service.description,
                        amount: service.amount,
                        cost: service.cost || 0
                    }))
                } : undefined,
                specialRequirements: requirementsData.length ? {
                    create: requirementsData
                } : undefined
            },
            include: {
                client: true,
                items: {
                    include: {
                        garmentType: true
                    }
                },
                additionalServiceItems: true,
                specialRequirements: true
            }
        });

        // Generate invoice
        const invoice = await generateInvoice(order);

        // Send order confirmation message (don't fail order creation if messaging fails)
        try {
            await sendOrderConfirmation(order, invoice);
        } catch (msgError) {
            console.error('Error sending order confirmation message:', msgError);
            // Continue with order creation even if messaging fails
        }

        res.status(201).json({ ...order, invoice });
    } catch (error) {
        console.error('Error creating order:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        res.status(500).json({ error: 'Failed to create order', details: error.message });
    }
});

// Update order status
router.patch('/:id/status', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, finalAmount } = req.body;

        const updateData = {};
        if (status !== undefined) updateData.status = status;
        if (finalAmount !== undefined) updateData.finalAmount = finalAmount;

        const order = await prisma.order.update({
            where: { id },
            data: updateData,
            include: {
                client: true,
                items: {
                    include: {
                        garmentType: true
                    }
                }
            }
        });

        // Send post-delivery message if status is Delivered
        if (status === 'Delivered') {
            try {
                const { sendPostDeliveryMessage } = await import('../services/messagingService.js');
                const result = await sendPostDeliveryMessage(order);

                // Update message status to Sent
                await prisma.message.update({
                    where: { id: result.messageRecord.id },
                    data: { status: 'Sent', sentAt: new Date() }
                });

                console.log(`✅ Post-delivery message sent for order ${order.orderNumber}`);
            } catch (msgError) {
                console.error('Error sending post-delivery message:', msgError);
                // Don't fail the status update if message fails
            }
        }

        res.json(order);
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ error: 'Failed to update order status' });
    }
});

// Bulk update order status
router.post('/bulk-update-status', authenticate, async (req, res) => {
    try {
        const { orderIds, status } = req.body;

        if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
            return res.status(400).json({ error: 'orderIds array is required' });
        }

        if (!status) {
            return res.status(400).json({ error: 'status is required' });
        }

        // Update all orders
        await prisma.order.updateMany({
            where: {
                id: { in: orderIds }
            },
            data: { status }
        });

        // If status is Delivered, send post-delivery messages for all orders
        if (status === 'Delivered') {
            const orders = await prisma.order.findMany({
                where: { id: { in: orderIds } },
                include: { client: true }
            });

            for (const order of orders) {
                try {
                    const { sendPostDeliveryMessage } = await import('../services/messagingService.js');
                    await sendPostDeliveryMessage(order);
                } catch (msgError) {
                    console.error(`Error sending message for order ${order.orderNumber}:`, msgError);
                    // Continue with other orders
                }
            }
        }

        res.json({ message: `Successfully updated ${orderIds.length} orders to ${status}` });
    } catch (error) {
        console.error('Error bulk updating orders:', error);
        res.status(500).json({ error: 'Failed to update orders' });
    }
});

// Bulk delete orders
router.post('/bulk-delete', authenticate, async (req, res) => {
    try {
        const { orderIds } = req.body;

        if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
            return res.status(400).json({ error: 'orderIds array is required' });
        }

        // Delete orders (cascade will delete related records)
        await prisma.order.deleteMany({
            where: {
                id: { in: orderIds }
            }
        });

        res.json({ message: `Successfully deleted ${orderIds.length} orders` });
    } catch (error) {
        console.error('Error bulk deleting orders:', error);
        res.status(500).json({ error: 'Failed to delete orders' });
    }
});

// Bulk get invoices (for download)
router.post('/bulk-invoices', authenticate, async (req, res) => {
    try {
        const { orderIds } = req.body;

        if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
            return res.status(400).json({ error: 'orderIds array is required' });
        }

        const orders = await prisma.order.findMany({
            where: {
                id: { in: orderIds }
            },
            include: {
                invoice: true,
                client: true
            }
        });

        const invoices = orders.map(order => ({
            orderId: order.id,
            orderNumber: order.orderNumber,
            clientName: order.client.name,
            pdfPath: order.invoice?.pdfPath || null
        })).filter(inv => inv.pdfPath);

        res.json({ invoices });
    } catch (error) {
        console.error('Error fetching bulk invoices:', error);
        res.status(500).json({ error: 'Failed to fetch invoices' });
    }
});

// Add trial notes
router.post('/:id/trial-notes', authenticate, upload.single('image'), async (req, res) => {
    try {
        const { id } = req.params;
        const { note } = req.body;

        const trialNoteData = {
            orderId: id,
            note
        };

        // If image was uploaded, save the path
        if (req.file) {
            trialNoteData.imageUrl = `/uploads/trial-notes/${req.file.filename}`;
        }

        const trialNote = await prisma.trialNote.create({
            data: trialNoteData
        });

        res.status(201).json(trialNote);
    } catch (error) {
        console.error('Error adding trial note:', error);
        res.status(500).json({ error: 'Failed to add trial note' });
    }
});

// Delete trial note
router.delete('/:id/trial-notes/:noteId', authenticate, async (req, res) => {
    try {
        const { noteId } = req.params;

        // Get the trial note to find image path
        const trialNote = await prisma.trialNote.findUnique({
            where: { id: noteId }
        });

        // Delete the note from database
        await prisma.trialNote.delete({
            where: { id: noteId }
        });

        // Delete the image file if it exists
        if (trialNote?.imageUrl) {
            deleteImageFile(trialNote.imageUrl);
        }

        res.json({ message: 'Trial note deleted successfully' });
    } catch (error) {
        console.error('Error deleting trial note:', error);
        res.status(500).json({ error: 'Failed to delete trial note' });
    }
});

// Update trial note
router.patch('/:id/trial-notes/:noteId', authenticate, upload.single('image'), async (req, res) => {
    try {
        const { noteId } = req.params;
        const { note } = req.body;

        // Get existing trial note to check for old image
        const existingNote = await prisma.trialNote.findUnique({
            where: { id: noteId }
        });

        const updateData = { note };

        // If new image was uploaded, update the path and delete old image
        if (req.file) {
            updateData.imageUrl = `/uploads/trial-notes/${req.file.filename}`;

            // Delete old image if it exists
            if (existingNote?.imageUrl) {
                deleteImageFile(existingNote.imageUrl);
            }
        }

        const updatedNote = await prisma.trialNote.update({
            where: { id: noteId },
            data: updateData
        });

        res.json(updatedNote);
    } catch (error) {
        console.error('Error updating trial note:', error);
        res.status(500).json({ error: 'Failed to update trial note' });
    }
});


// Update individual special requirement
router.patch('/:id/special-requirements/:requirementId', authenticate, upload.single('image'), async (req, res) => {
    try {
        const { requirementId } = req.params;
        const { note } = req.body;

        // Get existing requirement
        const existingReq = await prisma.specialRequirement.findUnique({
            where: { id: requirementId }
        });

        if (!existingReq) {
            return res.status(404).json({ error: 'Requirement not found' });
        }

        const updateData = {};
        if (note !== undefined) updateData.note = note;

        // If new image was uploaded
        if (req.file) {
            updateData.imageUrl = `/uploads/requirements/${req.file.filename}`;

            // Delete old image if it exists
            if (existingReq.imageUrl) {
                const { deleteImageFile } = await import('../middleware/upload.js');
                deleteImageFile(existingReq.imageUrl);
            }
        }

        const updatedReq = await prisma.specialRequirement.update({
            where: { id: requirementId },
            data: updateData
        });

        res.json(updatedReq);
    } catch (error) {
        console.error('Error updating special requirement:', error);
        res.status(500).json({ error: 'Failed to update special requirement' });
    }
});

// Update special requirements (bulk)
router.patch('/:id/special-requirements', authenticate, upload.array('images', 10), async (req, res) => {
    try {
        const { id } = req.params;
        const { requirements } = req.body;

        // Parse requirements if it's a string (from FormData)
        const parsedRequirements = typeof requirements === 'string'
            ? JSON.parse(requirements)
            : requirements;

        // Get existing requirements to delete their images
        const existingRequirements = await prisma.specialRequirement.findMany({
            where: { orderId: id }
        });

        // Delete old requirement images
        existingRequirements.forEach(req => {
            if (req.imageUrl) {
                deleteImageFile(req.imageUrl);
            }
        });

        // Delete existing requirements
        await prisma.specialRequirement.deleteMany({
            where: { orderId: id }
        });

        // Create new requirements with images
        if (parsedRequirements && parsedRequirements.length > 0) {
            // Normalize imageIndices
            let indices = [];
            if (req.body.imageIndices) {
                if (Array.isArray(req.body.imageIndices)) {
                    indices = req.body.imageIndices.map(Number);
                } else {
                    indices = [Number(req.body.imageIndices)];
                }
            }

            const requirementsData = parsedRequirements.map((note, index) => {
                const data = {
                    orderId: id,
                    note: typeof note === 'string' ? note : note.note
                };

                // Use the indices map to find the correct file
                const filePos = indices.indexOf(index);
                if (filePos !== -1 && req.files && req.files[filePos]) {
                    data.imageUrl = `/uploads/requirements/${req.files[filePos].filename}`;
                }

                return data;
            });

            await prisma.specialRequirement.createMany({
                data: requirementsData
            });
        }

        res.json({ message: 'Special requirements updated successfully' });
    } catch (error) {
        console.error('Error updating special requirements:', error);
        res.status(500).json({ error: 'Failed to update special requirements' });
    }
});



// Update order (comprehensive update with invoice regeneration)
router.put('/:id', authenticate, upload.array('requirementImages', 10), async (req, res) => {
    try {
        const { id } = req.params;

        // Parse JSON fields from FormData
        const items = req.body.items ? JSON.parse(req.body.items) : undefined;
        const additionalServiceItems = req.body.additionalServiceItems ? JSON.parse(req.body.additionalServiceItems) : undefined;
        const specialRequirements = req.body.specialRequirements ? JSON.parse(req.body.specialRequirements) : undefined;

        const {
            clientId,
            trialDate,
            deliveryDate,
            status,
            advance,
            finalAmount,
            additionalServices,
            additionalServicesAmount,
            additionalServicesCost,
            regenerateInvoice = false
        } = req.body;

        // Start building update data
        const updateData = {};

        // Update basic fields
        if (trialDate !== undefined) updateData.trialDate = trialDate ? new Date(trialDate) : null;
        if (deliveryDate !== undefined) updateData.deliveryDate = deliveryDate ? new Date(deliveryDate) : null;
        if (status !== undefined) updateData.status = status;
        if (advance !== undefined) updateData.advance = parseFloat(advance) || 0;
        if (finalAmount !== undefined) updateData.finalAmount = finalAmount ? parseFloat(finalAmount) : null;
        if (clientId !== undefined) updateData.clientId = clientId;

        // Update old format additional services (for backward compatibility)
        if (additionalServices !== undefined) updateData.additionalServices = additionalServices;
        if (additionalServicesAmount !== undefined) updateData.additionalServicesAmount = parseFloat(additionalServicesAmount) || 0;
        if (additionalServicesCost !== undefined) updateData.additionalServicesCost = parseFloat(additionalServicesCost) || 0;

        // Handle order items update
        if (items && items.length > 0) {
            // Delete existing items
            await prisma.orderItem.deleteMany({
                where: { orderId: id }
            });

            // Create new items
            updateData.items = {
                create: await Promise.all(items.map(async (item) => {
                    // Fetch garment type to get the cost if not provided
                    const garmentType = await prisma.garmentType.findUnique({
                        where: { id: item.garmentTypeId }
                    });

                    return {
                        garmentTypeId: item.garmentTypeId,
                        quantity: item.quantity,
                        price: item.price,
                        cost: item.cost !== undefined ? item.cost : (garmentType?.cost || 0),
                        subtotal: item.subtotal
                    };
                }))
            };
        }

        // Handle additional service items update (new format)
        if (additionalServiceItems !== undefined) {
            // Delete existing additional service items
            await prisma.additionalService.deleteMany({
                where: { orderId: id }
            });

            // Create new additional service items if provided
            if (additionalServiceItems.length > 0) {
                updateData.additionalServiceItems = {
                    create: additionalServiceItems.map(service => ({
                        description: service.description,
                        amount: service.amount,
                        cost: service.cost || 0
                    }))
                };
            }
        }

        // Handle special requirements update
        if (specialRequirements !== undefined) {
            // Delete existing special requirements
            await prisma.specialRequirement.deleteMany({
                where: { orderId: id }
            });

            // Create new special requirements if provided
            if (specialRequirements.length > 0) {
                let fileIndex = 0;
                updateData.specialRequirements = {
                    create: specialRequirements.map((reqItem) => {
                        let note = reqItem;
                        let imageUrl = null;

                        // Handle object format (new) or string format (old/fallback)
                        if (typeof reqItem === 'object' && reqItem !== null) {
                            note = reqItem.note;

                            if (reqItem.isNewImage) {
                                // Consuming a new file upload
                                const imageFile = req.files && req.files[fileIndex++];
                                if (imageFile) {
                                    imageUrl = `/uploads/requirements/${imageFile.filename}`;
                                }
                            } else if (reqItem.imageUrl) {
                                // Preserving existing image
                                imageUrl = reqItem.imageUrl;
                            }
                        } else {
                            // Fallback/Legacy: assume strings strings and sequential file mapping
                            note = reqItem;
                            const imageFile = req.files && req.files[fileIndex];
                            if (imageFile) {
                                imageUrl = `/uploads/requirements/${imageFile.filename}`;
                                fileIndex++;
                            }
                        }

                        return {
                            note,
                            imageUrl
                        };
                    })
                };
            }
        }

        // Calculate new total if items or additional services changed
        if (items || additionalServiceItems || additionalServicesAmount !== undefined) {
            let stitchingTotal = 0;
            let additionalTotal = 0;

            if (items) {
                stitchingTotal = items.reduce((sum, item) => sum + item.subtotal, 0);
            } else {
                // Fetch existing items to calculate total
                const existingItems = await prisma.orderItem.findMany({
                    where: { orderId: id }
                });
                stitchingTotal = existingItems.reduce((sum, item) => sum + item.subtotal, 0);
            }

            if (additionalServiceItems) {
                additionalTotal = additionalServiceItems.reduce((sum, service) => sum + service.amount, 0);
            } else if (additionalServicesAmount !== undefined) {
                additionalTotal = parseFloat(additionalServicesAmount) || 0;
            } else {
                // Fetch existing additional services
                const existingServices = await prisma.additionalService.findMany({
                    where: { orderId: id }
                });
                additionalTotal = existingServices.reduce((sum, service) => sum + service.amount, 0);

                // Fallback to old format if no new format services exist
                if (additionalTotal === 0) {
                    const existingOrder = await prisma.order.findUnique({
                        where: { id },
                        select: { additionalServicesAmount: true }
                    });
                    additionalTotal = existingOrder?.additionalServicesAmount || 0;
                }
            }

            updateData.totalAmount = stitchingTotal + additionalTotal;
        }

        // Update the order
        const order = await prisma.order.update({
            where: { id },
            data: updateData,
            include: {
                client: true,
                items: {
                    include: {
                        garmentType: true
                    }
                },
                additionalServiceItems: true,
                specialRequirements: true,
                trialNotes: true,
                invoice: true
            }
        });

        // Regenerate invoice if requested or if items/amounts changed
        let invoice = order.invoice;
        if (regenerateInvoice || items || additionalServiceItems || additionalServicesAmount !== undefined || advance !== undefined) {
            // Delete old invoice file if exists
            if (invoice?.pdfPath) {
                const fs = await import('fs');
                const path = await import('path');
                const invoicePath = path.default.join(process.cwd(), invoice.pdfPath);

                if (fs.default.existsSync(invoicePath)) {
                    fs.default.unlinkSync(invoicePath);
                }

                // Delete old invoice record
                await prisma.invoice.delete({
                    where: { id: invoice.id }
                });
            }

            // Generate new invoice
            invoice = await generateInvoice(order);
        }

        res.json({ ...order, invoice });
    } catch (error) {
        console.error('Error updating order:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack
        });
        res.status(500).json({ error: 'Failed to update order', details: error.message });
    }
});

// Update additional services cost
router.patch('/:id/additional-services-cost', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { additionalServicesCost } = req.body;

        const order = await prisma.order.update({
            where: { id },
            data: { additionalServicesCost: parseFloat(additionalServicesCost) || 0 },
            include: {
                client: true,
                items: {
                    include: {
                        garmentType: true
                    }
                }
            }
        });

        res.json(order);
    } catch (error) {
        console.error('Error updating additional services cost:', error);
        res.status(500).json({ error: 'Failed to update additional services cost' });
    }
});

// Update order item cost
router.patch('/:orderId/items/:itemId/cost', authenticate, async (req, res) => {
    try {
        const { orderId, itemId } = req.params;
        const { cost } = req.body;

        // Update the order item cost
        await prisma.orderItem.update({
            where: { id: itemId },
            data: { cost: parseFloat(cost) || 0 }
        });

        // Fetch the complete order with updated items
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                client: true,
                items: {
                    include: {
                        garmentType: true
                    }
                },
                additionalServiceItems: true,
                specialRequirements: true,
                trialNotes: true,
                invoice: true
            }
        });

        res.json(order);
    } catch (error) {
        console.error('Error updating order item cost:', error);
        res.status(500).json({ error: 'Failed to update order item cost' });
    }
});

// Update additional service item cost
router.patch('/:orderId/additional-service-items/:itemId/cost', authenticate, async (req, res) => {
    try {
        const { orderId, itemId } = req.params;
        const { cost } = req.body;

        // Update the additional service item cost
        await prisma.additionalService.update({
            where: { id: itemId },
            data: { cost: parseFloat(cost) || 0 }
        });

        // Fetch the complete order with updated items
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                client: true,
                items: {
                    include: {
                        garmentType: true
                    }
                },
                additionalServiceItems: true,
                specialRequirements: true,
                trialNotes: true,
                invoice: true
            }
        });

        res.json(order);
    } catch (error) {
        console.error('Error updating additional service item cost:', error);
        res.status(500).json({ error: 'Failed to update additional service item cost' });
    }
});

// Update special requirement
router.patch('/:id/special-requirements/:requirementId', authenticate, upload.single('image'), async (req, res) => {
    try {
        const { requirementId } = req.params;
        const { note } = req.body;

        const updateData = { note };

        // Handle image update
        if (req.file) {
            // Delete old image if exists
            const existingReq = await prisma.specialRequirement.findUnique({
                where: { id: requirementId }
            });

            if (existingReq?.imageUrl) {
                deleteImageFile(existingReq.imageUrl);
            }

            updateData.imageUrl = `/uploads/requirements/${req.file.filename}`;
        }

        const requirement = await prisma.specialRequirement.update({
            where: { id: requirementId },
            data: updateData
        });

        res.json(requirement);
    } catch (error) {
        console.error('Error updating special requirement:', error);
        res.status(500).json({ error: 'Failed to update special requirement' });
    }
});

// Delete special requirement
router.delete('/:id/special-requirements/:requirementId', authenticate, async (req, res) => {
    try {
        const { requirementId } = req.params;

        // Get requirement to delete associated image
        const requirement = await prisma.specialRequirement.findUnique({
            where: { id: requirementId }
        });

        if (requirement?.imageUrl) {
            deleteImageFile(requirement.imageUrl);
        }

        await prisma.specialRequirement.delete({
            where: { id: requirementId }
        });

        res.json({ message: 'Special requirement deleted successfully' });
    } catch (error) {
        console.error('Error deleting special requirement:', error);
        res.status(500).json({ error: 'Failed to delete special requirement' });
    }
});

// Delete order
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;

        // Check if order exists
        const order = await prisma.order.findUnique({
            where: { id },
            include: {
                invoice: true
            }
        });

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Delete invoice PDF file if exists
        if (order.invoice?.pdfPath) {
            const fs = await import('fs');
            const path = await import('path');
            const invoicePath = path.join(process.cwd(), order.invoice.pdfPath);

            if (fs.existsSync(invoicePath)) {
                fs.unlinkSync(invoicePath);
            }
        }

        // Delete order (cascade will delete related records: items, specialRequirements, trialNotes, invoice, messages)
        await prisma.order.delete({
            where: { id }
        });

        res.json({ message: 'Order deleted successfully' });
    } catch (error) {
        console.error('Error deleting order:', error);
        res.status(500).json({ error: 'Failed to delete order' });
    }
});

export default router;
