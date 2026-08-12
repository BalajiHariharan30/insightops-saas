import bcrypt from 'bcrypt';
import { User } from '../../modules/users/user.model';
import { Organization } from '../../modules/organizations/organization.model';
import { OrganizationMember } from '../../modules/organizations/member.model';
import { InventoryItem } from '../../modules/inventory/inventory.model';
import { Expense } from '../../modules/expenses/expense.model';
import { logger } from '../../config/logger';

export async function seedDatabase(): Promise<void> {
  try {
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      logger.info('🌱 Database already populated. Skipping default seed data.');
      return;
    }

    logger.info('🌱 Seeding default organization and administrator account...');

    // 1. Create Default Organization
    const defaultOrg = new Organization({
      name: 'InsightOps Demo',
      slug: 'insightops-demo',
      timezone: 'UTC',
      isActive: true,
    });
    await defaultOrg.save();

    // 2. Create Default Admin User
    const passwordHash = await bcrypt.hash('Password123!', 10);
    const defaultAdmin = new User({
      email: 'admin@insightops.com',
      name: 'Demo Administrator',
      passwordHash,
      isVerified: true,
    });
    await defaultAdmin.save();

    // 3. Bind Admin to Organization
    const membership = new OrganizationMember({
      userId: defaultAdmin._id,
      organizationId: defaultOrg._id,
      role: 'ADMIN',
      status: 'ACTIVE',
    });
    await membership.save();

    const orgId = defaultOrg._id;
    const userId = defaultAdmin._id;

    // 4. Seed Demo Inventory Items
    const inventoryItems = [
      { organizationId: orgId, sku: 'LAP-MAC-001', name: 'MacBook Pro 16"', quantity: 24, reorderPoint: 5, unitCost: 1800, sellingPrice: 2499, supplier: 'Apple Inc.', status: 'IN_STOCK' },
      { organizationId: orgId, sku: 'MON-DEL-27', name: 'Dell 27" 4K Monitor', quantity: 8, reorderPoint: 10, unitCost: 380, sellingPrice: 599, supplier: 'Dell Technologies', status: 'LOW_STOCK' },
      { organizationId: orgId, sku: 'KBD-LOG-MX', name: 'Logitech MX Keys Keyboard', quantity: 52, reorderPoint: 15, unitCost: 60, sellingPrice: 109, supplier: 'Logitech', status: 'IN_STOCK' },
      { organizationId: orgId, sku: 'MSE-LOG-MX', name: 'Logitech MX Master 3 Mouse', quantity: 47, reorderPoint: 10, unitCost: 55, sellingPrice: 99, supplier: 'Logitech', status: 'IN_STOCK' },
      { organizationId: orgId, sku: 'CHR-ERM-ADJ', name: 'Ergonomic Office Chair', quantity: 3, reorderPoint: 5, unitCost: 320, sellingPrice: 549, supplier: 'Herman Miller', status: 'LOW_STOCK' },
      { organizationId: orgId, sku: 'SSD-SAM-1TB', name: 'Samsung 1TB NVMe SSD', quantity: 0, reorderPoint: 20, unitCost: 70, sellingPrice: 119, supplier: 'Samsung Electronics', status: 'OUT_OF_STOCK' },
      { organizationId: orgId, sku: 'CAM-LOG-4K', name: 'Logitech 4K Webcam', quantity: 19, reorderPoint: 8, unitCost: 90, sellingPrice: 149, supplier: 'Logitech', status: 'IN_STOCK' },
      { organizationId: orgId, sku: 'HUB-ANK-USB', name: 'Anker 10-Port USB Hub', quantity: 35, reorderPoint: 10, unitCost: 30, sellingPrice: 59, supplier: 'Anker', status: 'IN_STOCK' },
    ];
    await InventoryItem.insertMany(inventoryItems);

    // 5. Seed Demo Expenses (last 30 days)
    const now = new Date();
    const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);
    const expenses = [
      { organizationId: orgId, actorUserId: userId, amount: 4200, category: 'Software', description: 'Annual AWS cloud hosting', date: daysAgo(2), vendor: 'Amazon Web Services', status: 'APPROVED' },
      { organizationId: orgId, actorUserId: userId, amount: 890, category: 'Office Supplies', description: 'Stationery & printer ink restock', date: daysAgo(4), vendor: 'Staples Inc.', status: 'APPROVED' },
      { organizationId: orgId, actorUserId: userId, amount: 1350, category: 'Travel', description: 'Client site visit airfare', date: daysAgo(6), vendor: 'IndiGo Airlines', status: 'PENDING' },
      { organizationId: orgId, actorUserId: userId, amount: 299, category: 'Software', description: 'Figma team subscription', date: daysAgo(8), vendor: 'Figma Inc.', status: 'APPROVED' },
      { organizationId: orgId, actorUserId: userId, amount: 75000, category: 'Rent', description: 'Monthly office rent - August', date: daysAgo(10), vendor: 'Prestige Properties', status: 'APPROVED' },
      { organizationId: orgId, actorUserId: userId, amount: 3200, category: 'Equipment', description: 'Server rack expansion', date: daysAgo(12), vendor: 'Dell Technologies', status: 'APPROVED' },
      { organizationId: orgId, actorUserId: userId, amount: 650, category: 'Marketing', description: 'Google Ads campaign August', date: daysAgo(14), vendor: 'Google LLC', status: 'APPROVED' },
      { organizationId: orgId, actorUserId: userId, amount: 180, category: 'Software', description: 'Slack Business plan', date: daysAgo(16), vendor: 'Salesforce (Slack)', status: 'APPROVED' },
      { organizationId: orgId, actorUserId: userId, amount: 12000, category: 'Payroll', description: 'Freelancer contractor payment', date: daysAgo(18), vendor: 'Toptal', status: 'PENDING' },
      { organizationId: orgId, actorUserId: userId, amount: 430, category: 'Travel', description: 'Team lunch & transport', date: daysAgo(20), vendor: 'Zomato', status: 'REJECTED' },
    ];
    await Expense.insertMany(expenses);

    logger.info('🌱 Database seeding completed successfully.');
    logger.info('🔑 Default Credentials: [admin@insightops.com] / [Password123!]');
    logger.info(`📦 Seeded ${inventoryItems.length} inventory items and ${expenses.length} expenses.`);
  } catch (error) {
    logger.error('❌ Failed to seed default database:', error);
  }
}
