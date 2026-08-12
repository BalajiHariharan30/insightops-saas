import { z } from 'zod';

export const createScheduleSchema = z.object({
  body: z.object({
    userId: z.string().min(1, 'User ID is required'),
    startDateTime: z.string().datetime({ message: 'Must be a valid ISO datetime string' }),
    endDateTime: z.string().datetime({ message: 'Must be a valid ISO datetime string' }),
    roleRequired: z.string().optional(),
    status: z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT'),
  }),
});

export const updateScheduleSchema = z.object({
  params: z.object({
    scheduleId: z.string().min(1, 'Schedule ID parameter is required'),
  }),
  body: z.object({
    userId: z.string().optional(),
    startDateTime: z.string().datetime().optional(),
    endDateTime: z.string().datetime().optional(),
    roleRequired: z.string().optional(),
    status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
  }),
});

export const setAvailabilitySchema = z.object({
  body: z.object({
    userId: z.string().min(1, 'User ID is required'),
    dayOfWeek: z.number().min(0).max(6, 'Day of week must be between 0 (Sunday) and 6 (Saturday)'),
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format'),
    endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format'),
    isAvailable: z.boolean().default(true),
  }),
});

export const getSchedulesQuerySchema = z.object({
  query: z.object({
    userId: z.string().optional(),
    start: z.string().datetime().optional(),
    end: z.string().datetime().optional(),
  }),
});
