import { Organization, IOrganization } from './organization.model';
import { OrganizationMember, IOrganizationMember } from './member.model';
import { User } from '../users/user.model';
import { ConflictError, NotFoundError, AppError } from '../../utils/errors';
import { sendEmail } from '../../infrastructure/email/email.service';

export async function createOrganization(
  userId: string,
  name: string,
  slug: string
): Promise<IOrganization> {
  const existingOrg = await Organization.findOne({ slug });
  if (existingOrg) {
    throw new ConflictError('An organization with this URL slug already exists');
  }

  const org = new Organization({ name, slug });
  await org.save();

  const member = new OrganizationMember({
    userId,
    organizationId: org._id,
    role: 'ADMIN',
    status: 'ACTIVE',
  });
  await member.save();

  return org;
}

export async function listUserOrganizations(userId: string): Promise<any[]> {
  const memberships = await OrganizationMember.find({ userId, status: 'ACTIVE' })
    .populate('organizationId')
    .exec();
    
  return memberships.map(m => ({
    membershipId: m._id,
    role: m.role,
    organization: m.organizationId,
  }));
}

export async function inviteMember(
  organizationId: string,
  email: string,
  role: 'ADMIN' | 'STAFF'
): Promise<IOrganizationMember> {
  let user = await User.findOne({ email });
  
  if (!user) {
    // Create a placeholder user for the invitee
    user = new User({
      name: email.split('@')[0],
      email,
      isVerified: false,
    });
    await user.save();
  }

  const existingMember = await OrganizationMember.findOne({
    userId: user._id,
    organizationId,
  });

  if (existingMember) {
    throw new ConflictError('User is already a member of this organization');
  }

  const member = new OrganizationMember({
    userId: user._id,
    organizationId,
    role,
    status: 'INVITED',
  });
  await member.save();

  const org = await Organization.findById(organizationId);

  // Send simulated invitation email
  await sendEmail({
    to: email,
    subject: `Invitation to join ${org?.name || 'an organization'} on InsightOps`,
    body: `Hello,\n\nYou have been invited to join ${org?.name} as a ${role}. Access your account using your email to accept the invitation.\n\nThanks,\nInsightOps Team`,
  });

  return member;
}

export async function listOrganizationMembers(organizationId: string): Promise<any[]> {
  const members = await OrganizationMember.find({ organizationId })
    .populate('userId', 'name email isVerified')
    .exec();
  return members;
}

export async function updateMemberRole(
  organizationId: string,
  memberId: string,
  newRole: 'ADMIN' | 'STAFF'
): Promise<IOrganizationMember> {
  const membership = await OrganizationMember.findOne({ _id: memberId, organizationId });
  if (!membership) {
    throw new NotFoundError('Membership record not found');
  }

  if (membership.role === 'ADMIN' && newRole === 'STAFF') {
    // Ensure we are not leaving the organization without an ADMIN
    const adminCount = await OrganizationMember.countDocuments({
      organizationId,
      role: 'ADMIN',
      status: 'ACTIVE',
    });
    
    if (adminCount <= 1) {
      throw new AppError('Cannot demote the last ADMIN in this organization', 'LAST_ADMIN_DEMOTION', 400);
    }
  }

  membership.role = newRole;
  await membership.save();
  return membership;
}

export async function removeMember(
  organizationId: string,
  memberId: string
): Promise<void> {
  const membership = await OrganizationMember.findOne({ _id: memberId, organizationId });
  if (!membership) {
    throw new NotFoundError('Membership record not found');
  }

  if (membership.role === 'ADMIN') {
    // Ensure we are not removing the last ADMIN
    const adminCount = await OrganizationMember.countDocuments({
      organizationId,
      role: 'ADMIN',
      status: 'ACTIVE',
    });
    
    if (adminCount <= 1) {
      throw new AppError('Cannot remove the last ADMIN in this organization', 'LAST_ADMIN_REMOVAL', 400);
    }
  }

  await OrganizationMember.deleteOne({ _id: memberId });
}
