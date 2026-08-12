import { Schedule, Availability, ISchedule, IAvailability } from './schedule.model';
import { OrganizationMember } from '../organizations/member.model';
import { NotFoundError, AppError, ConflictError } from '../../utils/errors';
import { invalidateCachePattern } from '../../infrastructure/redis/cache.service';
import { emitToOrganization } from '../../infrastructure/sockets/socket';

export async function createShift(
  organizationId: string,
  payload: {
    userId: string;
    startDateTime: string | Date;
    endDateTime: string | Date;
    roleRequired?: string;
    status?: 'DRAFT' | 'PUBLISHED';
  }
): Promise<ISchedule> {
  const start = new Date(payload.startDateTime);
  const end = new Date(payload.endDateTime);

  if (start >= end) {
    throw new AppError('Shift start time must be before end time', 'INVALID_TIME_RANGE', 400);
  }

  // Ensure employee is actually a member of the tenant organization
  const isMember = await OrganizationMember.exists({
    userId: payload.userId,
    organizationId,
    status: 'ACTIVE',
  });

  if (!isMember) {
    throw new NotFoundError('Employee is not an active member of this organization');
  }

  // Overlapping Shift Conflict Detection
  const overlappingShift = await Schedule.findOne({
    organizationId,
    userId: payload.userId,
    $or: [
      { startDateTime: { $lt: end }, endDateTime: { $gt: start } },
    ],
  });

  if (overlappingShift) {
    throw new ConflictError('Employee already has an overlapping shift assigned in this timeframe');
  }

  const shift = new Schedule({
    ...payload,
    startDateTime: start,
    endDateTime: end,
    organizationId,
  });

  await shift.save();
  await invalidateCachePattern(organizationId, 'analytics:*');
  emitToOrganization(organizationId, 'schedule.updated', shift);
  return shift;
}

export async function getShift(organizationId: string, scheduleId: string): Promise<ISchedule> {
  const shift = await Schedule.findOne({ _id: scheduleId, organizationId }).populate('userId', 'name email');
  if (!shift) {
    throw new NotFoundError('Shift assignment not found');
  }
  return shift;
}

export async function listShifts(
  organizationId: string,
  filters: { userId?: string; start?: string | Date; end?: string | Date } = {}
): Promise<ISchedule[]> {
  const query: any = { organizationId };

  if (filters.userId) {
    query.userId = filters.userId;
  }

  if (filters.start || filters.end) {
    query.startDateTime = {};
    if (filters.start) {
      query.startDateTime.$gte = new Date(filters.start);
    }
    if (filters.end) {
      query.startDateTime.$lte = new Date(filters.end);
    }
  }

  return Schedule.find(query)
    .populate('userId', 'name email')
    .sort({ startDateTime: 1 })
    .exec();
}

export async function updateShift(
  organizationId: string,
  scheduleId: string,
  payload: {
    userId?: string;
    startDateTime?: string | Date;
    endDateTime?: string | Date;
    roleRequired?: string;
    status?: 'DRAFT' | 'PUBLISHED';
  }
): Promise<ISchedule> {
  const shift = await Schedule.findOne({ _id: scheduleId, organizationId });
  if (!shift) {
    throw new NotFoundError('Shift assignment not found');
  }

  const start = payload.startDateTime ? new Date(payload.startDateTime) : shift.startDateTime;
  const end = payload.endDateTime ? new Date(payload.endDateTime) : shift.endDateTime;

  if (start >= end) {
    throw new AppError('Shift start time must be before end time', 'INVALID_TIME_RANGE', 400);
  }

  const targetUserId = payload.userId || shift.userId.toString();

  // If user or time is changed, check for overlaps
  if (
    payload.userId !== undefined ||
    payload.startDateTime !== undefined ||
    payload.endDateTime !== undefined
  ) {
    const overlappingShift = await Schedule.findOne({
      _id: { $ne: scheduleId }, // exclude self
      organizationId,
      userId: targetUserId,
      $or: [
        { startDateTime: { $lt: end }, endDateTime: { $gt: start } },
      ],
    });

    if (overlappingShift) {
      throw new ConflictError('Employee already has an overlapping shift assigned in this timeframe');
    }
  }

  Object.assign(shift, {
    ...payload,
    startDateTime: start,
    endDateTime: end,
  });

  await shift.save();
  await invalidateCachePattern(organizationId, 'analytics:*');
  emitToOrganization(organizationId, 'schedule.updated', shift);
  return shift;
}

export async function deleteShift(organizationId: string, scheduleId: string): Promise<void> {
  const result = await Schedule.deleteOne({ _id: scheduleId, organizationId });
  if (result.deletedCount === 0) {
    throw new NotFoundError('Shift assignment not found');
  }
  await invalidateCachePattern(organizationId, 'analytics:*');
  emitToOrganization(organizationId, 'schedule.updated', { id: scheduleId, deleted: true });
}

export async function setAvailability(
  organizationId: string,
  payload: {
    userId: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isAvailable: boolean;
  }
): Promise<IAvailability> {
  // Verify member belongs to tenant organization
  const isMember = await OrganizationMember.exists({
    userId: payload.userId,
    organizationId,
    status: 'ACTIVE',
  });

  if (!isMember) {
    throw new NotFoundError('User is not a member of this organization');
  }

  // Update or Insert availability settings
  const availability = await Availability.findOneAndUpdate(
    {
      organizationId,
      userId: payload.userId,
      dayOfWeek: payload.dayOfWeek,
    },
    { ...payload, organizationId },
    { new: true, upsert: true }
  );

  return availability;
}

export async function getUserAvailability(
  organizationId: string,
  userId: string
): Promise<IAvailability[]> {
  return Availability.find({ organizationId, userId }).sort({ dayOfWeek: 1 }).exec();
}
