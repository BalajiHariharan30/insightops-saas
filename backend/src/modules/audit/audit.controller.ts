import { Request, Response, NextFunction } from 'express';
import { AuditLog } from './audit.model';
import { stringify } from 'csv-stringify/sync';

export async function exportAuditCsv(req: Request, res: Response, next: NextFunction) {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    if (!organizationId) {
      return res.status(400).json({ success: false, error: { message: 'x-organization-id header is required' } });
    }

    // Optional date range filters
    const { from, to } = req.query;
    const filter: any = { organizationId };
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from as string);
      if (to)   filter.timestamp.$lte = new Date(to as string);
    }

    const logs = await AuditLog.find(filter)
      .sort({ timestamp: -1 })
      .limit(10000)      // Hard cap at 10k rows to prevent memory issues
      .lean()
      .exec();

    const rows = logs.map((log) => ({
      timestamp:    new Date(log.timestamp).toISOString(),
      action:       log.action,
      resourceType: log.resourceType,
      resourceId:   log.resourceId,
      actorUserId:  log.actorUserId?.toString() || '',
      metadata:     JSON.stringify(log.metadata || {}),
    }));

    const csv = stringify(rows, { header: true });

    const filename = `insightops-audit-${organizationId}-${Date.now()}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csv);
  } catch (error) {
    return next(error);
  }
}
