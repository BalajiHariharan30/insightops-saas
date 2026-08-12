import { Request, Response, NextFunction } from 'express';
import * as alertService from './alert.service';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const organizationId = req.organizationId!;
    const alerts = await alertService.listActiveAlerts(organizationId);

    return res.status(200).json({
      success: true,
      data: alerts,
    });
  } catch (error) {
    return next(error);
  }
}

export async function dismiss(req: Request, res: Response, next: NextFunction) {
  try {
    const organizationId = req.organizationId!;
    const { alertId } = req.params;
    const alert = await alertService.dismissAlert(organizationId, alertId);

    return res.status(200).json({
      success: true,
      data: alert,
    });
  } catch (error) {
    return next(error);
  }
}
