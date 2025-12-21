import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get all measurement templates (with optional client filter)
router.get('/', authenticate, async (req, res) => {
    try {
        const { clientId } = req.query;

        const templates = await prisma.measurementTemplate.findMany({
            where: clientId ? { clientId } : {},
            include: {
                client: { select: { name: true } },
                garmentType: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(templates);
    } catch (error) {
        console.error('Error fetching measurement templates:', error);
        res.status(500).json({ error: 'Failed to fetch templates' });
    }
});

// Get single template
router.get('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;

        const template = await prisma.measurementTemplate.findUnique({
            where: { id },
            include: {
                client: true,
                garmentType: true
            }
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
        const { name, clientId, garmentTypeId, measurements } = req.body;

        const template = await prisma.measurementTemplate.create({
            data: {
                name,
                clientId: clientId || null,
                garmentTypeId: garmentTypeId || null,
                measurements: typeof measurements === 'string' ? measurements : JSON.stringify(measurements)
            },
            include: {
                client: { select: { name: true } },
                garmentType: { select: { name: true } }
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
        const { name, measurements } = req.body;

        const template = await prisma.measurementTemplate.update({
            where: { id },
            data: {
                name,
                measurements: typeof measurements === 'string' ? measurements : JSON.stringify(measurements)
            },
            include: {
                client: { select: { name: true } },
                garmentType: { select: { name: true } }
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

        await prisma.measurementTemplate.delete({
            where: { id }
        });

        res.json({ message: 'Template deleted successfully' });
    } catch (error) {
        console.error('Error deleting template:', error);
        res.status(500).json({ error: 'Failed to delete template' });
    }
});

// Get last measurements for a client
router.get('/client/:clientId/last', authenticate, async (req, res) => {
    try {
        const { clientId } = req.params;

        const lastOrder = await prisma.order.findFirst({
            where: { clientId },
            orderBy: { createdAt: 'desc' },
            select: { measurements: true }
        });

        if (!lastOrder || !lastOrder.measurements) {
            return res.json(null);
        }

        res.json({ measurements: lastOrder.measurements });
    } catch (error) {
        console.error('Error fetching last measurements:', error);
        res.status(500).json({ error: 'Failed to fetch last measurements' });
    }
});

export default router;
