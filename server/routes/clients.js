import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get all clients
router.get('/', authenticate, async (req, res) => {
    try {
        const clients = await prisma.client.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                orders: {
                    select: {
                        id: true,
                        orderNumber: true,
                        totalAmount: true,
                        status: true,
                        createdAt: true
                    }
                }
            }
        });
        res.json(clients);
    } catch (error) {
        console.error('Error fetching clients:', error);
        res.status(500).json({ error: 'Failed to fetch clients' });
    }
});

// Search clients
router.get('/search', authenticate, async (req, res) => {
    try {
        const { query } = req.query;

        const clients = await prisma.client.findMany({
            where: {
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { phone: { contains: query } }
                ]
            },
            take: 10
        });

        res.json(clients);
    } catch (error) {
        console.error('Error searching clients:', error);
        res.status(500).json({ error: 'Failed to search clients' });
    }
});

// Get client by ID
router.get('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;

        const client = await prisma.client.findUnique({
            where: { id },
            include: {
                orders: {
                    include: {
                        items: {
                            include: {
                                garmentType: true
                            }
                        }
                    },
                    orderBy: { createdAt: 'desc' }
                },
                messages: true
            }
        });

        if (!client) {
            return res.status(404).json({ error: 'Client not found' });
        }

        res.json(client);
    } catch (error) {
        console.error('Error fetching client:', error);
        res.status(500).json({ error: 'Failed to fetch client' });
    }
});

// Create client
router.post('/', authenticate, async (req, res) => {
    try {
        const { name, phone, email, address } = req.body;

        const client = await prisma.client.create({
            data: { name, phone, email, address }
        });

        res.status(201).json(client);
    } catch (error) {
        console.error('Error creating client:', error);
        res.status(500).json({ error: 'Failed to create client' });
    }
});

// Update client
router.put('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, phone, email, address } = req.body;

        const client = await prisma.client.update({
            where: { id },
            data: { name, phone, email, address }
        });

        res.json(client);
    } catch (error) {
        console.error('Error updating client:', error);
        res.status(500).json({ error: 'Failed to update client' });
    }
});

// Get client outstanding amount and payment details
router.get('/:id/outstanding', authenticate, async (req, res) => {
    try {
        const { id } = req.params;

        const client = await prisma.client.findUnique({
            where: { id },
            include: {
                orders: {
                    select: {
                        id: true,
                        orderNumber: true,
                        status: true,
                        totalAmount: true,
                        finalAmount: true,
                        advance: true,
                        createdAt: true,
                        deliveryDate: true
                    }
                }
            }
        });

        if (!client) {
            return res.status(404).json({ error: 'Client not found' });
        }

        // Calculate outstanding for non-delivered orders
        const outstandingOrders = client.orders
            .filter(order => order.status !== 'Delivered')
            .map(order => {
                const totalDue = order.finalAmount ?? order.totalAmount;
                const paid = order.advance || 0;
                const outstanding = totalDue - paid;

                return {
                    orderId: order.id,
                    orderNumber: order.orderNumber,
                    status: order.status,
                    totalAmount: totalDue,
                    paid: paid,
                    outstanding: outstanding,
                    deliveryDate: order.deliveryDate,
                    createdAt: order.createdAt
                };
            });

        const totalOutstanding = outstandingOrders.reduce((sum, order) => sum + order.outstanding, 0);

        // Payment history (all orders)
        const paymentHistory = client.orders.map(order => ({
            orderNumber: order.orderNumber,
            totalAmount: order.finalAmount ?? order.totalAmount,
            advance: order.advance || 0,
            status: order.status,
            createdAt: order.createdAt
        }));

        res.json({
            clientId: id,
            clientName: client.name,
            totalOutstanding,
            outstandingOrders,
            paymentHistory
        });
    } catch (error) {
        console.error('Error fetching client outstanding:', error);
        res.status(500).json({ error: 'Failed to fetch outstanding amount' });
    }
});

// Send payment reminder
router.post('/:id/payment-reminder', authenticate, async (req, res) => {
    try {
        const { id } = req.params;

        const client = await prisma.client.findUnique({
            where: { id },
            include: {
                orders: {
                    where: {
                        status: { not: 'Delivered' }
                    },
                    select: {
                        orderNumber: true,
                        totalAmount: true,
                        finalAmount: true,
                        advance: true
                    }
                }
            }
        });

        if (!client) {
            return res.status(404).json({ error: 'Client not found' });
        }

        // Calculate total outstanding
        const totalOutstanding = client.orders.reduce((sum, order) => {
            const totalDue = order.finalAmount ?? order.totalAmount;
            const paid = order.advance || 0;
            return sum + (totalDue - paid);
        }, 0);

        if (totalOutstanding <= 0) {
            return res.status(400).json({ error: 'No outstanding payments for this client' });
        }

        // Create payment reminder message
        const ordersList = client.orders
            .map(order => `• ${order.orderNumber}: ₹${(order.finalAmount ?? order.totalAmount) - (order.advance || 0)}`)
            .join('\n');

        const message = `Hello ${client.name},\n\nThis is a friendly reminder about your pending payment.\n\nOutstanding Amount: ₹${totalOutstanding.toFixed(2)}\n\nPending Orders:\n${ordersList}\n\nPlease contact us to complete the payment.\n\nThank you!\n- The Darji`;

        // Save message record
        const messageRecord = await prisma.message.create({
            data: {
                clientId: id,
                type: 'PaymentReminder',
                content: message,
                status: 'Pending'
            }
        });

        // Send WhatsApp message (using existing service)
        const whatsappUrl = `https://wa.me/${client.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;

        res.json({
            message: 'Payment reminder prepared',
            whatsappUrl,
            messageId: messageRecord.id,
            totalOutstanding
        });
    } catch (error) {
        console.error('Error sending payment reminder:', error);
        res.status(500).json({ error: 'Failed to send payment reminder' });
    }
});

// Delete client
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;

        // Check if client has orders
        const client = await prisma.client.findUnique({
            where: { id },
            include: {
                orders: true,
                messages: true
            }
        });

        if (!client) {
            return res.status(404).json({ error: 'Client not found' });
        }

        if (client.orders.length > 0) {
            return res.status(400).json({
                error: `Cannot delete client with existing orders. This client has ${client.orders.length} order(s). Please delete all orders first.`
            });
        }

        // Delete any messages associated with this client first
        if (client.messages.length > 0) {
            await prisma.message.deleteMany({
                where: { clientId: id }
            });
        }

        // Now delete the client
        await prisma.client.delete({
            where: { id }
        });

        res.json({ message: 'Client deleted successfully' });
    } catch (error) {
        console.error('Error deleting client:', error);
        res.status(500).json({ error: 'Failed to delete client' });
    }
});

export default router;
