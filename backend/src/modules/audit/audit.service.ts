import { AuditLog, IAuditLog } from './audit.model';
import { getPaginatedData, PaginatedResult } from '../../utils/pagination';
import { logger } from '../../config/logger';

// List of fields to redact from audit metadata for safety compliance
const REDACTED_FIELDS = ['password', 'passwordHash', 'token', 'refreshToken', 'accessToken', 'clientSecret', 'secret'];

function sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
  const sanitized = { ...metadata };
  for (const key of Object.keys(sanitized)) {
    if (REDACTED_FIELDS.some(field => key.toLowerCase().includes(field))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeMetadata(sanitized[key]);
    }
  }
  return sanitized;
}

export async function logAction(
  organizationId: string,
  actorUserId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  metadata: Record<string, any> = {}
): Promise<IAuditLog> {
  const sanitizedMeta = sanitizeMetadata(metadata);

  const log = new AuditLog({
    organizationId,
    actorUserId,
    action,
    resourceType,
    resourceId,
    metadata: sanitizedMeta,
  });

  await log.save();
  
  logger.info({
    event: 'AUDIT_LOG_RECORDED',
    organizationId,
    actorUserId,
    action,
    resourceType,
    resourceId,
  });

  return log;
}

export async function getAuditLogs(
  organizationId: string,
  limit = 25,
  cursor?: string
): Promise<PaginatedResult<IAuditLog>> {
  return getPaginatedData(
    AuditLog,
    { organizationId },
    limit,
    cursor
  );
}
