import { Request, Response, NextFunction } from 'express';
import { OrganizationMember } from '../modules/organizations/member.model';
import { AuthorizationError } from '../utils/errors';

export function requireRole(allowedRoles: ('ADMIN' | 'STAFF')[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const organizationId = req.headers['x-organization-id'] as string;

      if (!userId) {
        throw new AuthorizationError('Authentication credentials not found');
      }

      if (!organizationId) {
        throw new AuthorizationError('Organization context header (x-organization-id) is missing');
      }

      const membership = await OrganizationMember.findOne({
        userId,
        organizationId,
        status: 'ACTIVE',
      });

      if (!membership || !allowedRoles.includes(membership.role)) {
        throw new AuthorizationError('You do not have access to this resource or organization');
      }

      // Inject tenant parameters into the request object
      req.organizationId = organizationId;
      req.userRole = membership.role;
      
      return next();
    } catch (error) {
      return next(error);
    }
  };
}
