import { PrismaClient } from '@prisma/client';
import { generateWhatsAppLink, formatPhoneNumber } from './whatsappService.js';

const prisma = new PrismaClient();

/**
 * Send order confirmation message with invoice
 */
export async function sendOrderConfirmation(order, invoice) {
    try {
        const message = `Thank you for choosing The Darji!\n\nWe have received your order #${order.orderNumber} and will soon start working on it with care.\n\nYour invoice is ready. Total Amount: Rs ${order.totalAmount.toFixed(2)}\n\nWe look forward to creating something special for you!`;

        // Create message record
        const messageRecord = await prisma.message.create({
            data: {
                clientId: order.clientId,
                type: 'OrderConfirmation',
                content: message,
                status: 'Pending'
            }
        });

        // Generate WhatsApp link
        const { whatsappLink } = generateWhatsAppLink(
            formatPhoneNumber(order.client.phone),
            message,
            invoice?.pdfPath
        );

        return { messageRecord, whatsappLink };
    } catch (error) {
        console.error('Error sending order confirmation:', error);
        throw error;
    }
}

/**
 * Send post-delivery thank you message
 */
export async function sendPostDeliveryMessage(order) {
    try {
        const message = `Thank you for trusting The Darji!\n\nWe hope you love your custom-stitched outfit from order #${order.orderNumber}.\n\nYour satisfaction is our priority. We look forward to serving you again!\n\n- Team The Darji`;

        // Create message record
        const messageRecord = await prisma.message.create({
            data: {
                clientId: order.clientId,
                type: 'PostDelivery',
                content: message,
                status: 'Pending'
            }
        });

        // Generate WhatsApp link
        const { whatsappLink } = generateWhatsAppLink(
            formatPhoneNumber(order.client.phone),
            message
        );

        return { messageRecord, whatsappLink };
    } catch (error) {
        console.error('Error sending post-delivery message:', error);
        throw error;
    }
}

/**
 * Send re-engagement message to inactive customer
 */
export async function sendReEngagementMessage(clientId) {
    try {
        const client = await prisma.client.findUnique({
            where: { id: clientId },
            include: {
                orders: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            }
        });

        if (!client) {
            throw new Error('Client not found');
        }

        const message = `Hello from The Darji!\n\nIt's been a while since we crafted something special for you. Time to refresh your wardrobe with new custom outfits?\n\nWe'd love to create something amazing for you again!\n\nReply to this message or visit us to discuss your next masterpiece.\n\n- Team The Darji`;

        // Create message record
        const messageRecord = await prisma.message.create({
            data: {
                clientId,
                type: 'ReEngagement',
                content: message,
                status: 'Pending'
            }
        });

        // Generate WhatsApp link
        const { whatsappLink } = generateWhatsAppLink(
            formatPhoneNumber(client.phone),
            message
        );

        return { messageRecord, whatsappLink };
    } catch (error) {
        console.error('Error sending re-engagement message:', error);
        throw error;
    }
}

/**
 * Find clients who haven't ordered in the last 30 days
 */
export async function findInactiveClients() {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const clients = await prisma.client.findMany({
            include: {
                orders: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            }
        });

        // Filter clients whose last order was more than 30 days ago
        const inactiveClients = clients.filter(client => {
            if (client.orders.length === 0) return false; // Skip clients with no orders
            const lastOrderDate = new Date(client.orders[0].createdAt);
            return lastOrderDate < thirtyDaysAgo;
        });

        return inactiveClients;
    } catch (error) {
        console.error('Error finding inactive clients:', error);
        throw error;
    }
}
