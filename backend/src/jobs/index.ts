import cron from 'node-cron';
import { RefreshToken } from '../modules/auth/refresh-token.model';
import { InventoryItem } from '../modules/inventory/inventory.model';
import { Alert } from '../modules/alerts/alert.model';
import { logger } from '../config/logger';

export function initializeCronJobs(): void {
  logger.info('⏰ Registering background cron jobs...');

  // 1. Expired Token Purging Job (Runs daily at midnight)
  cron.schedule('0 0 * * *', async () => {
    try {
      const result = await RefreshToken.deleteMany({
        expiresAt: { $lt: new Date() },
      });
      logger.info(`🧹 Cron Clean Session: Deleted ${result.deletedCount} expired refresh tokens.`);
    } catch (error) {
      logger.error('Cron Purge Session error:', error);
    }
  });

  // 2. Daily Low Stock Scanner Sweep (Runs daily at 1:00 AM)
  cron.schedule('0 1 * * *', async () => {
    try {
      logger.info('🔍 Cron low-stock sweep initiated...');
      const lowStockItems = await InventoryItem.find({
        status: { $in: ['LOW_STOCK', 'OUT_OF_STOCK'] },
      }).exec();

      for (const item of lowStockItems) {
        // Assert alert doesn't already exist to prevent spam
        const alertExists = await Alert.exists({
          organizationId: item.organizationId,
          type: 'LOW_STOCK',
          status: 'ACTIVE',
          'metadata.itemId': item._id,
        });

        if (!alertExists) {
          await Alert.create({
            organizationId: item.organizationId,
            type: 'LOW_STOCK',
            severity: item.status === 'OUT_OF_STOCK' ? 'CRITICAL' : 'WARNING',
            message: `Stock alert: "${item.name}" (SKU: ${item.sku}) level is at ${item.quantity} (reorder point: ${item.reorderPoint})`,
            metadata: {
              itemId: item._id,
              qty: item.quantity,
              sku: item.sku,
            },
          });
        }
      }
      logger.info(`🔍 Low stock sweep complete. Scanned ${lowStockItems.length} items.`);
    } catch (error) {
      logger.error('Cron stock check error:', error);
    }
  });

  /**
   * Horizontal Scaling Warning:
   * 
   * In a horizontally scaled production system (e.g. running 5 instances of the API),
   * node-cron will execute on ALL 5 containers simultaneously, causing duplicate work,
   * race conditions, and heavy DB contention.
   * 
   * Production remediation:
   * Swap node-cron for a distributed queue system like BullMQ (backed by Redis locks),
   * or run cron jobs on a single dedicated worker container.
   */
}
