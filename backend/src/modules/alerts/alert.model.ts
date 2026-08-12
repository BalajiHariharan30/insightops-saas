import { Schema, model, Document, Types } from 'mongoose';

export interface IAlert extends Document {
  organizationId: Types.ObjectId;
  type: 'ANOMALY_EXPENSE' | 'ANOMALY_INVENTORY' | 'LOW_STOCK';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
  metadata: Record<string, any>;
  status: 'ACTIVE' | 'DISMISSED';
  createdAt: Date;
  updatedAt: Date;
}

const alertSchema = new Schema<IAlert>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['ANOMALY_EXPENSE', 'ANOMALY_INVENTORY', 'LOW_STOCK'],
      required: true,
    },
    severity: {
      type: String,
      enum: ['INFO', 'WARNING', 'CRITICAL'],
      default: 'WARNING',
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'DISMISSED'],
      default: 'ACTIVE',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for finding active alerts in an organization quickly
alertSchema.index({ organizationId: 1, status: 1 });

export const Alert = model<IAlert>('Alert', alertSchema);
export default Alert;
