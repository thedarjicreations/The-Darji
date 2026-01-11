import { z } from 'zod';

// Order item schema
const orderItemSchema = z.object({
    garmentType: z.string().min(1, 'Garment type is required'),
    quantity: z.number().int().min(1, 'Quantity must be at least 1'),
    price: z.number().min(0, 'Price cannot be negative'),
    cost: z.number().min(0, 'Cost cannot be negative').optional(),
    subtotal: z.number().min(0, 'Subtotal cannot be negative'),
});

// Additional service schema
const additionalServiceSchema = z.object({
    description: z.string().min(1, 'Description is required').max(200),
    amount: z.number().min(0, 'Amount cannot be negative'),
    cost: z.number().min(0, 'Cost cannot be negative').optional(),
});

// Create order schema
export const createOrderSchema = z.object({
    body: z.object({
        client: z.string().min(1, 'Client is required'),
        items: z.array(orderItemSchema)
            .min(1, 'Order must have at least one item'),
        additionalServices: z.array(additionalServiceSchema).optional(),
        measurements: z.union([z.string(), z.record(z.any())]).optional(),
        totalAmount: z.number().min(0, 'Total amount cannot be negative'),
        finalAmount: z.number().min(0, 'Final amount cannot be negative').optional(),
        advance: z.number().min(0, 'Advance cannot be negative').optional(),
        trialDate: z.union([z.string().datetime(), z.date(), z.null()]).optional(),
        deliveryDate: z.union([z.string().datetime(), z.date(), z.null()]).optional(),
    }),
});

// Update order schema
export const updateOrderSchema = z.object({
    body: z.object({
        client: z.string().optional(),
        items: z.array(orderItemSchema).optional(),
        additionalServices: z.array(additionalServiceSchema).optional(),
        measurements: z.union([z.string(), z.record(z.any())]).optional(),
        totalAmount: z.number().min(0).optional(),
        finalAmount: z.number().min(0).optional(),
        advance: z.number().min(0).optional(),
        trialDate: z.union([z.string().datetime(), z.date(), z.null()]).optional(),
        deliveryDate: z.union([z.string().datetime(), z.date(), z.null()]).optional(),
    }),
});

// Update status schema
export const updateStatusSchema = z.object({
    body: z.object({
        status: z.enum(['Pending', 'InProgress', 'Trial', 'Completed', 'Delivered', 'Cancelled']),
        cancellationReason: z.string().optional(),
    }),
});
