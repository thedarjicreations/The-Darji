import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();
const prisma = new PrismaClient();

// Get invoice for order
router.get('/:orderId', authenticate, async (req, res) => {
    try {
        const { orderId } = req.params;

        const invoice = await prisma.invoice.findUnique({
            where: { orderId },
            include: {
                order: {
                    include: {
                        client: true,
                        items: {
                            include: {
                                garmentType: true
                            }
                        }
                    }
                }
            }
        });

        if (!invoice) {
            return res.status(404).json({ error: 'Invoice not found' });
        }

        res.json(invoice);
    } catch (error) {
        console.error('Error fetching invoice:', error);
        res.status(500).json({ error: 'Failed to fetch invoice' });
    }
});

// Download invoice PDF
router.get('/:orderId/download', authenticate, async (req, res) => {
    try {
        const { orderId } = req.params;

        const invoice = await prisma.invoice.findUnique({
            where: { orderId }
        });

        if (!invoice || !invoice.pdfPath) {
            return res.status(404).json({ error: 'Invoice PDF not found' });
        }

        const filePath = path.join(process.cwd(), invoice.pdfPath);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Invoice file not found' });
        }

        res.download(filePath);
    } catch (error) {
        console.error('Error downloading invoice:', error);
        res.status(500).json({ error: 'Failed to download invoice' });
    }
});

// Send invoice via WhatsApp
router.post('/:orderId/send', authenticate, async (req, res) => {
    try {
        const { orderId } = req.params;

        const invoice = await prisma.invoice.findUnique({
            where: { orderId },
            include: {
                order: {
                    include: {
                        client: true
                    }
                }
            }
        });

        if (!invoice) {
            return res.status(404).json({ error: 'Invoice not found' });
        }

        // Generate WhatsApp link
        const { generateWhatsAppLink } = await import('../services/whatsappService.js');
        const message = `Thank you for choosing The Darji! We have received your order #${invoice.order.orderNumber}. Please find your invoice attached.`;

        const { whatsappLink, invoicePath } = generateWhatsAppLink(
            invoice.order.client.phone,
            message,
            invoice.pdfPath
        );

        // Return both link and path for manual attachment
        res.json({
            whatsappLink,
            invoicePath: path.join(process.cwd(), invoice.pdfPath)
        });
    } catch (error) {
        console.error('Error sending invoice:', error);
        res.status(500).json({ error: 'Failed to send invoice' });
    }
});

export default router;
