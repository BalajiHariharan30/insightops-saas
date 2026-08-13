import { Request, Response, NextFunction } from 'express';
import { AuditLog } from './audit.model';

/** Escapes a CSV cell value — wraps in quotes if it contains commas, quotes, or newlines */
function csvCell(val: unknown): string {
  const str = val === null || val === undefined ? '' : String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Converts an array of objects to a CSV string */
function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return 'timestamp,action,resourceType,resourceId,actorUserId,metadata\n';
  const headers = ['timestamp', 'action', 'resourceType', 'resourceId', 'actorUserId', 'metadata'];
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => csvCell(row[h])).join(','));
  }
  return lines.join('\n');
}

export async function exportAuditCsv(req: Request, res: Response, next: NextFunction) {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: { message: 'x-organization-id header is required' },
      });
    }

    // Optional date range filters
    const { from, to } = req.query;
    const filter: Record<string, unknown> = { organizationId };
    if (from || to) {
      filter.timestamp = {};
      if (from) (filter.timestamp as any).$gte = new Date(from as string);
      if (to)   (filter.timestamp as any).$lte = new Date(to as string);
    }

    const logs = await AuditLog.find(filter)
      .sort({ timestamp: -1 })
      .limit(10000)
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

    const csv = toCsv(rows);
    const filename = `insightops-audit-${organizationId}-${Date.now()}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csv);
  } catch (error) {
    return next(error);
  }
}
