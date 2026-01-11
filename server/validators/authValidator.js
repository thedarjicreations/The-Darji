import { z } from 'zod';

// Register schema
export const registerSchema = z.object({
    body: z.object({
        username: z.string()
            .min(3, 'Username must be at least 3 characters')
            .max(30, 'Username cannot exceed 30 characters')
            .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
        password: z.string()
            .min(6, 'Password must be at least 6 characters'),
        name: z.string()
            .min(2, 'Name must be at least 2 characters')
            .max(100, 'Name cannot exceed 100 characters'),
        role: z.enum(['admin', 'user']).optional(),
    }),
});

// Login schema
export const loginSchema = z.object({
    body: z.object({
        username: z.string().min(1, 'Username is required'),
        password: z.string().min(1, 'Password is required'),
    }),
});
