import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get all messages
router.get('/', authenticate, async (req, res) => {
    try {
        const { type, clientId } = req.query;

        const where = {};
        if (type) where.type = type;
        if (clientId) where.clientId = clientId;

        const messages = await prisma.message.findMany({
            where,
            include: {
                client: true
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(messages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// Manually trigger re-engagement message
router.post('/re-engage/:clientId', authenticate, async (req, res) => {
    try {
        const { clientId } = req.params;

        const { sendReEngagementMessage } = await import('../services/messagingService.js');
        await sendReEngagementMessage(clientId);

        res.json({ message: 'Re-engagement message sent successfully' });
    } catch (error) {
        console.error('Error sending re-engagement message:', error);
        res.status(500).json({ error: 'Failed to send re-engagement message' });
    }
});

// Trigger post-delivery message for an order
router.post('/post-delivery/:orderId', authenticate, async (req, res) => {
    try {
        const { orderId } = req.params;

        // Get order with client details
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                client: true
            }
        });

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const { sendPostDeliveryMessage } = await import('../services/messagingService.js');
        const { whatsappLink } = await sendPostDeliveryMessage(order);

        res.json({ whatsappLink, message: 'Post-delivery message ready to send' });
    } catch (error) {
        console.error('Error generating post-delivery message:', error);
        res.status(500).json({ error: 'Failed to generate post-delivery message' });
    }
});

export default router;
