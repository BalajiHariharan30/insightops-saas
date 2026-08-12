import { Schema, model, Document, Types } from 'mongoose';

export interface ISchedule extends Document {
  organizationId: Types.ObjectId;
  userId: Types.ObjectId;
  startDateTime: Date;
  endDateTime: Date;
  roleRequired?: string;
  status: 'DRAFT' | 'PUBLISHED';
  createdAt: Date;
  updatedAt: Date;
}

export interface IAvailability extends Document {
  organizationId: Types.ObjectId;
  userId: Types.ObjectId;
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  startTime: string; // "HH:MM" in UTC
  endTime: string; // "HH:MM" in UTC
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const scheduleSchema = new Schema<ISchedule>(
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
      index: true,
    },
    startDateTime: {
      type: Date,
      required: true,
    },
    endDateTime: {
      type: Date,
      required: true,
    },
    roleRequired: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['DRAFT', 'PUBLISHED'],
      default: 'DRAFT',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Optimize queries for finding organization shifts by date ranges
scheduleSchema.index({ organizationId: 1, startDateTime: 1, endDateTime: 1 });
scheduleSchema.index({ organizationId: 1, userId: 1 });

const availabilitySchema = new Schema<IAvailability>(
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
      index: true,
    },
    dayOfWeek: {
      type: Number,
      required: true,
      min: 0,
      max: 6,
    },
    startTime: {
      type: String,
      required: true, // e.g. "09:00"
    },
    endTime: {
      type: String,
      required: true, // e.g. "17:00"
    },
    isAvailable: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

availabilitySchema.index({ organizationId: 1, userId: 1, dayOfWeek: 1 });

export const Schedule = model<ISchedule>('Schedule', scheduleSchema);
export const Availability = model<IAvailability>('Availability', availabilitySchema);
