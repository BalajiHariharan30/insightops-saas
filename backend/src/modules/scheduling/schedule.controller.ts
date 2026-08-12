import { Request, Response, NextFunction } from 'express';
import * as scheduleService from './schedule.service';

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const organizationId = req.organizationId!;
    const shift = await scheduleService.createShift(organizationId, req.body);

    return res.status(201).json({
      success: true,
      data: shift,
    });
  } catch (error) {
    return next(error);
  }
}

export async function get(req: Request, res: Response, next: NextFunction) {
  try {
    const organizationId = req.organizationId!;
    const { scheduleId } = req.params;
    const shift = await scheduleService.getShift(organizationId, scheduleId);

    return res.status(200).json({
      success: true,
      data: shift,
    });
  } catch (error) {
    return next(error);
  }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const organizationId = req.organizationId!;
    const filters = {
      userId: req.query.userId as string | undefined,
      start: req.query.start as string | undefined,
      end: req.query.end as string | undefined,
    };

    const shifts = await scheduleService.listShifts(organizationId, filters);

    return res.status(200).json({
      success: true,
      data: shifts,
    });
  } catch (error) {
    return next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const organizationId = req.organizationId!;
    const { scheduleId } = req.params;
    const shift = await scheduleService.updateShift(organizationId, scheduleId, req.body);

    return res.status(200).json({
      success: true,
      data: shift,
    });
  } catch (error) {
    return next(error);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const organizationId = req.organizationId!;
    const { scheduleId } = req.params;
    await scheduleService.deleteShift(organizationId, scheduleId);

    return res.status(200).json({
      success: true,
      message: 'Shift deleted successfully',
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateAvailability(req: Request, res: Response, next: NextFunction) {
  try {
    const organizationId = req.organizationId!;
    const availability = await scheduleService.setAvailability(organizationId, req.body);

    return res.status(200).json({
      success: true,
      data: availability,
    });
  } catch (error) {
    return next(error);
  }
}

export async function getAvailability(req: Request, res: Response, next: NextFunction) {
  try {
    const organizationId = req.organizationId!;
    const { userId } = req.params;
    const availability = await scheduleService.getUserAvailability(organizationId, userId);

    return res.status(200).json({
      success: true,
      data: availability,
    });
  } catch (error) {
    return next(error);
  }
}
