import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get all message templates
router.get('/', authenticate, async (req, res) => {
    try {
        const { type } = req.query;

        const templates = await prisma.messageTemplate.findMany({
            where: type ? { type } : {},
            orderBy: { createdAt: 'desc' }
        });

        res.json(templates);
    } catch (error) {
        console.error('Error fetching message templates:', error);
        res.status(500).json({ error: 'Failed to fetch templates' });
    }
});

// Get single template
router.get('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;

        const template = await prisma.messageTemplate.findUnique({
            where: { id }
        });

        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }

        res.json(template);
    } catch (error) {
        console.error('Error fetching template:', error);
        res.status(500).json({ error: 'Failed to fetch template' });
    }
});

// Create new template
router.post('/', authenticate, async (req, res) => {
    try {
        const { name, type, content, isActive } = req.body;

        if (!name || !type || !content) {
            return res.status(400).json({ error: 'Name, type, and content are required' });
        }

        const template = await prisma.messageTemplate.create({
            data: {
                name,
                type,
                content,
                isActive: isActive !== undefined ? isActive : true
            }
        });

        res.status(201).json(template);
    } catch (error) {
        console.error('Error creating template:', error);
        res.status(500).json({ error: 'Failed to create template' });
    }
});

// Update template
router.put('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, type, content, isActive } = req.body;

        const template = await prisma.messageTemplate.update({
            where: { id },
            data: {
                name,
                type,
                content,
                isActive
            }
        });

        res.json(template);
    } catch (error) {
        console.error('Error updating template:', error);
        res.status(500).json({ error: 'Failed to update template' });
    }
});

// Delete template
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;

        await prisma.messageTemplate.delete({
            where: { id }
        });

        res.json({ message: 'Template deleted successfully' });
    } catch (error) {
        console.error('Error deleting template:', error);
        res.status(500).json({ error: 'Failed to delete template' });
    }
});

// Preview template with sample data
router.post('/preview', authenticate, async (req, res) => {
    try {
        const { content, sampleData } = req.body;

        const preview = replaceTemplateVariables(content, sampleData);

        res.json({ preview });
    } catch (error) {
        console.error('Error previewing template:', error);
        res.status(500).json({ error: 'Failed to preview template' });
    }
});

// Helper function to replace template variables
function replaceTemplateVariables(template, data) {
    let result = template;

    const variables = {
        clientName: data.clientName || '[Client Name]',
        orderNumber: data.orderNumber || '[Order Number]',
        trialDate: data.trialDate ? new Date(data.trialDate).toLocaleDateString('en-IN') : '[Trial Date]',
        deliveryDate: data.deliveryDate ? new Date(data.deliveryDate).toLocaleDateString('en-IN') : '[Delivery Date]',
        totalAmount: data.totalAmount ? `₹${data.totalAmount.toFixed(2)}` : '[Total Amount]',
        advance: data.advance ? `₹${data.advance.toFixed(2)}` : '[Advance]',
        balance: data.balance ? `₹${data.balance.toFixed(2)}` : '[Balance]',
        shopName: 'The Darji',
        shopPhone: data.shopPhone || '+91 98765 43210'
    };

    // Replace all variables
    Object.keys(variables).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'gi');
        result = result.replace(regex, variables[key]);
    });

    return result;
}

export default router;
export { replaceTemplateVariables };
