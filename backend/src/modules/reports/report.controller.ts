import { Request, Response, NextFunction } from 'express';
import * as reportService from './report.service';

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const organizationId = req.organizationId!;
    const { type } = req.body; // 'WEEKLY' or 'MONTHLY'

    if (!type || !['WEEKLY', 'MONTHLY'].includes(type)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_TYPE', message: 'Report type must be WEEKLY or MONTHLY' } });
    }

    const report = await reportService.generateReport(organizationId, type);

    return res.status(201).json({
      success: true,
      data: report,
    });
  } catch (error) {
    return next(error);
  }
}

export async function get(req: Request, res: Response, next: NextFunction) {
  try {
    const organizationId = req.organizationId!;
    const { reportId } = req.params;
    const report = await reportService.getReport(organizationId, reportId);

    return res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    return next(error);
  }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const organizationId = req.organizationId!;
    const reports = await reportService.listReports(organizationId);

    return res.status(200).json({
      success: true,
      data: reports,
    });
  } catch (error) {
    return next(error);
  }
}
