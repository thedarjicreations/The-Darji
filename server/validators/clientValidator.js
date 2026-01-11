import { z } from 'zod';

// Create/Update client schema
export const createClientSchema = z.object({
    body: z.object({
        name: z.string()
            .min(2, 'Name must be at least 2 characters')
            .max(100, 'Name cannot exceed 100 characters'),
        phone: z.string()
            .regex(/^\+?[1-9]\d{9,14}$/, 'Please provide a valid phone number'),
        email: z.string()
            .email('Please provide a valid email address')
            .optional()
            .or(z.literal('')),
        address: z.string()
            .max(500, 'Address cannot exceed 500 characters')
            .optional(),
        notes: z.string().optional(),
        tags: z.array(z.string()).optional(),
    }),
});

export const updateClientSchema = createClientSchema;
