import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get all garment types
router.get('/', authenticate, async (req, res) => {
    try {
        const garments = await prisma.garmentType.findMany({
            orderBy: { name: 'asc' }
        });
        res.json(garments);
    } catch (error) {
        console.error('Error fetching garments:', error);
        res.status(500).json({ error: 'Failed to fetch garment types' });
    }
});

// Create garment type
router.post('/', authenticate, async (req, res) => {
    try {
        const { name, price, cost, description } = req.body;

        const garment = await prisma.garmentType.create({
            data: { name, price, cost: cost || 0, description }
        });

        res.status(201).json(garment);
    } catch (error) {
        console.error('Error creating garment:', error);
        res.status(500).json({ error: 'Failed to create garment type' });
    }
});

// Update garment type
router.put('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, price, cost, description } = req.body;

        const garment = await prisma.garmentType.update({
            where: { id },
            data: { name, price, cost: cost !== undefined ? cost : undefined, description }
        });

        res.json(garment);
    } catch (error) {
        console.error('Error updating garment:', error);
        res.status(500).json({ error: 'Failed to update garment type' });
    }
});

// Delete garment type
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;

        await prisma.garmentType.delete({
            where: { id }
        });

        res.json({ message: 'Garment type deleted successfully' });
    } catch (error) {
        console.error('Error deleting garment:', error);
        res.status(500).json({ error: 'Failed to delete garment type' });
    }
});

export default router;
