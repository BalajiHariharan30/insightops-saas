import { z } from 'zod';

export const createItemSchema = z.object({
  body: z.object({
    sku: z.string().min(2, 'SKU must be at least 2 characters'),
    name: z.string().min(2, 'Name must be at least 2 characters'),
    quantity: z.number().min(0, 'Quantity cannot be negative').default(0),
    reorderPoint: z.number().min(0, 'Reorder point cannot be negative').default(10),
    unitCost: z.number().min(0, 'Unit cost cannot be negative'),
    sellingPrice: z.number().min(0, 'Selling price cannot be negative'),
    supplier: z.string().optional(),
  }),
});

export const updateItemSchema = z.object({
  params: z.object({
    itemId: z.string().min(1, 'Item ID parameter is required'),
  }),
  body: z.object({
    name: z.string().min(2).optional(),
    reorderPoint: z.number().min(0).optional(),
    unitCost: z.number().min(0).optional(),
    sellingPrice: z.number().min(0).optional(),
    supplier: z.string().optional(),
  }),
});

export const adjustStockSchema = z.object({
  params: z.object({
    itemId: z.string().min(1, 'Item ID parameter is required'),
  }),
  body: z.object({
    quantity: z.number(),
    type: z.enum(['INCOMING', 'OUTGOING', 'ADJUSTMENT']),
  }),
});
