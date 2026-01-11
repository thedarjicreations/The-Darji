import { z } from 'zod';

// Create/Update garment schema
export const createGarmentSchema = z.object({
    body: z.object({
        name: z.string()
            .min(2, 'Name must be at least 2 characters')
            .max(100, 'Name cannot exceed 100 characters'),
        price: z.number()
            .min(0, 'Price cannot be negative'),
        cost: z.number()
            .min(0, 'Cost cannot be negative')
            .optional(),
        description: z.string()
            .max(500, 'Description cannot exceed 500 characters')
            .optional(),
        category: z.enum(['Men', 'Women', 'Kids', 'Unisex']).optional(),
        isActive: z.boolean().optional(),
    }),
});

export const updateGarmentSchema = createGarmentSchema;
