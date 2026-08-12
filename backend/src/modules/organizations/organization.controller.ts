import { Request, Response, NextFunction } from 'express';
import * as orgService from './organization.service';
import { getAuditLogs } from '../audit/audit.service';

export async function createOrg(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const { name, slug } = req.body;
    const org = await orgService.createOrganization(userId, name, slug);

    return res.status(201).json({
      success: true,
      data: org,
    });
  } catch (error) {
    return next(error);
  }
}

export async function listUserOrgs(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const memberships = await orgService.listUserOrganizations(userId);

    return res.status(200).json({
      success: true,
      data: memberships,
    });
  } catch (error) {
    return next(error);
  }
}

export async function listMembers(req: Request, res: Response, next: NextFunction) {
  try {
    const organizationId = req.organizationId!;
    const members = await orgService.listOrganizationMembers(organizationId);

    return res.status(200).json({
      success: true,
      data: members,
    });
  } catch (error) {
    return next(error);
  }
}

export async function invite(req: Request, res: Response, next: NextFunction) {
  try {
    const organizationId = req.organizationId!;
    const { email, role } = req.body;
    const member = await orgService.inviteMember(organizationId, email, role);

    return res.status(201).json({
      success: true,
      data: member,
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateRole(req: Request, res: Response, next: NextFunction) {
  try {
    const organizationId = req.organizationId!;
    const { memberId } = req.params;
    const { role } = req.body;
    const member = await orgService.updateMemberRole(organizationId, memberId, role);

    return res.status(200).json({
      success: true,
      data: member,
    });
  } catch (error) {
    return next(error);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const organizationId = req.organizationId!;
    const { memberId } = req.params;
    await orgService.removeMember(organizationId, memberId);

    return res.status(200).json({
      success: true,
      message: 'Member removed successfully from the organization',
    });
  } catch (error) {
    return next(error);
  }
}

export async function listAuditLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const organizationId = req.organizationId!;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 25;
    const cursor = req.query.cursor as string | undefined;

    const result = await getAuditLogs(organizationId, limit, cursor);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}
