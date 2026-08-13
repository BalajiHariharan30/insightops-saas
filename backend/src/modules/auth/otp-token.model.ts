import { Schema, model, Document, Types } from 'mongoose';

export interface IOtpToken extends Document {
  userId: Types.ObjectId;
  codeHash: string;       // SHA-256 hash of the 6-digit code (never store plaintext)
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

const otpTokenSchema = new Schema<IOtpToken>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    codeHash: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 }, // MongoDB TTL auto-deletes expired OTPs
    },
    used: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const OtpToken = model<IOtpToken>('OtpToken', otpTokenSchema);
export default OtpToken;
