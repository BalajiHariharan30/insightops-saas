import { z } from 'zod';

export const createExpenseSchema = z.object({
  body: z.object({
    amount: z.number().positive('Amount must be greater than zero'),
    category: z.string().min(1, 'Category is required'),
    description: z.string().optional(),
    date: z.string().datetime().optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional()),
    vendor: z.string().min(1, 'Vendor is required'),
    vendorGSTIN: z.string().optional(),
    receiptUrl: z.string().url('Receipt URL must be a valid URL').optional().or(z.string().max(0).optional()),
    gstType: z.enum(['NONE', 'CGST_SGST', 'IGST']).optional(),
    gstRate: z.number().optional(),
    gstAmount: z.number().optional(),
    upiTransactionId: z.string().optional(),
  }),
});

export const updateExpenseSchema = z.object({
  params: z.object({
    expenseId: z.string().min(1, 'Expense ID parameter is required'),
  }),
  body: z.object({
    amount: z.number().positive().optional(),
    category: z.string().min(1).optional(),
    description: z.string().optional(),
    date: z.string().optional(),
    vendor: z.string().min(1).optional(),
    status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
    receiptUrl: z.string().url().optional(),
  }),
});

export const getExpensesQuerySchema = z.object({
  query: z.object({
    limit: z.string().optional(),
    cursor: z.string().optional(),
    category: z.string().optional(),
    status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  }),
});
