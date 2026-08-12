import { Schema, model, Document, Types } from 'mongoose';

export interface IAIQueryHistory extends Document {
  organizationId: Types.ObjectId;
  userId: Types.ObjectId;
  prompt: string;
  success: boolean;
  collectionTarget?: string;
  errorMsg?: string;
  createdAt: Date;
}

const aiQueryHistorySchema = new Schema<IAIQueryHistory>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    prompt: {
      type: String,
      required: true,
      trim: true,
    },
    success: {
      type: Boolean,
      required: true,
    },
    collectionTarget: String,
    errorMsg: String,
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const AIQueryHistory = model<IAIQueryHistory>('AIQueryHistory', aiQueryHistorySchema);
export default AIQueryHistory;
