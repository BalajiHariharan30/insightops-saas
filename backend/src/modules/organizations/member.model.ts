import { Schema, model, Document, Types } from 'mongoose';

export interface IOrganizationMember extends Document {
  userId: Types.ObjectId;
  organizationId: Types.ObjectId;
  role: 'ADMIN' | 'STAFF';
  status: 'ACTIVE' | 'SUSPENDED' | 'INVITED';
  createdAt: Date;
  updatedAt: Date;
}

const organizationMemberSchema = new Schema<IOrganizationMember>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['ADMIN', 'STAFF'],
      default: 'STAFF',
      required: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'SUSPENDED', 'INVITED'],
      default: 'ACTIVE',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate memberships in the same organization
organizationMemberSchema.index({ userId: 1, organizationId: 1 }, { unique: true });

export const OrganizationMember = model<IOrganizationMember>('OrganizationMember', organizationMemberSchema);
export default OrganizationMember;
