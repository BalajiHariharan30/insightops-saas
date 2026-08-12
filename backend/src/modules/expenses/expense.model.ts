import { Schema, model, Document, Types } from 'mongoose';

export interface IExpense extends Document {
  organizationId: Types.ObjectId;
  amount: number;
  category: string;
  description?: string;
  date: Date;
  vendor: string;
  vendorGSTIN?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  actorUserId: Types.ObjectId;
  receiptUrl?: string;
  gstType?: 'NONE' | 'CGST_SGST' | 'IGST';
  gstRate?: number;
  gstAmount?: number;
  upiTransactionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const expenseSchema = new Schema<IExpense>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    vendor: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
      required: true,
    },
    actorUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiptUrl: {
      type: String,
      trim: true,
    },
    // India-specific fields
    gstType: {
      type: String,
      enum: ['NONE', 'CGST_SGST', 'IGST'],
      default: 'NONE',
    },
    gstRate: {
      type: Number,
      min: 0,
      max: 28,
    },
    gstAmount: {
      type: Number,
      min: 0,
    },
    upiTransactionId: {
      type: String,
      trim: true,
    },
    vendorGSTIN: {
      type: String,
      trim: true,
      uppercase: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for optimization
expenseSchema.index({ organizationId: 1, date: -1 });
expenseSchema.index({ organizationId: 1, status: 1 });
expenseSchema.index({ organizationId: 1, category: 1 });

export const Expense = model<IExpense>('Expense', expenseSchema);
export default Expense;
