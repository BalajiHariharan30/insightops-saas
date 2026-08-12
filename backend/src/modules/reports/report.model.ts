import { Schema, model, Document, Types } from 'mongoose';

export interface IReport extends Document {
  organizationId: Types.ObjectId;
  type: 'WEEKLY' | 'MONTHLY';
  startDate: Date;
  endDate: Date;
  metrics: Record<string, any>;
  summaryText?: string;
  status: 'PENDING' | 'GENERATED' | 'FAILED';
  createdAt: Date;
  updatedAt: Date;
}

const reportSchema = new Schema<IReport>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['WEEKLY', 'MONTHLY'],
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    metrics: {
      type: Schema.Types.Mixed,
      required: true,
      default: {},
    },
    summaryText: String,
    status: {
      type: String,
      enum: ['PENDING', 'GENERATED', 'FAILED'],
      default: 'PENDING',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

reportSchema.index({ organizationId: 1, createdAt: -1 });

export const Report = model<IReport>('Report', reportSchema);
export default Report;
