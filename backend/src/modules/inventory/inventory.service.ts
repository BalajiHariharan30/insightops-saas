import { InventoryItem, InventoryTransaction, IInventoryItem } from './inventory.model';
import { getPaginatedData, PaginatedResult } from '../../utils/pagination';
import { ConflictError, NotFoundError, AppError } from '../../utils/errors';
import { Types } from 'mongoose';
import { invalidateCachePattern } from '../../infrastructure/redis/cache.service';
import { emitToOrganization } from '../../infrastructure/sockets/socket';

export async function createInventoryItem(
  organizationId: string,
  payload: {
    sku: string;
    name: string;
    quantity: number;
    reorderPoint: number;
    unitCost: number;
    sellingPrice: number;
    supplier?: string;
  },
  actorUserId: string
): Promise<IInventoryItem> {
  const normalizedSku = payload.sku.toUpperCase().trim();
  
  const existingItem = await InventoryItem.findOne({
    organizationId,
    sku: normalizedSku,
  });

  if (existingItem) {
    throw new ConflictError(`Inventory item with SKU "${normalizedSku}" already exists`);
  }

  const item = new InventoryItem({
    ...payload,
    sku: normalizedSku,
    organizationId,
  });

  await item.save();
  await invalidateCachePattern(organizationId, 'analytics:*');
  emitToOrganization(organizationId, 'inventory.updated', item);

  // If initial stock is loaded, record transaction logs
  if (payload.quantity > 0) {
    await InventoryTransaction.create({
      organizationId,
      itemId: item._id,
      quantity: payload.quantity,
      type: 'INCOMING',
      actorUserId,
    });
  }

  return item;
}

export async function getInventoryItem(
  organizationId: string,
  itemId: string
): Promise<IInventoryItem> {
  // .lean() returns a plain JS object (no Mongoose overhead) for read-only use
  const item = await InventoryItem.findOne({ _id: itemId, organizationId }).lean();
  if (!item) {
    throw new NotFoundError('Inventory item not found');
  }
  return item as IInventoryItem;
}

export async function listInventoryItems(
  organizationId: string,
  limit = 25,
  cursor?: string
): Promise<PaginatedResult<IInventoryItem>> {
  return getPaginatedData(
    InventoryItem,
    { organizationId },
    limit,
    cursor
  );
}

export async function updateInventoryItem(
  organizationId: string,
  itemId: string,
  payload: {
    name?: string;
    reorderPoint?: number;
    unitCost?: number;
    sellingPrice?: number;
    supplier?: string;
  }
): Promise<IInventoryItem> {
  // findOneAndUpdate is atomic — avoids the find+assign+save round-trip
  const item = await InventoryItem.findOneAndUpdate(
    { _id: itemId, organizationId },
    { $set: payload },
    { new: true, runValidators: true }
  );
  if (!item) {
    throw new NotFoundError('Inventory item not found');
  }
  await invalidateCachePattern(organizationId, 'analytics:*');
  return item;
}

export async function adjustStock(
  organizationId: string,
  itemId: string,
  quantity: number,
  type: 'INCOMING' | 'OUTGOING' | 'ADJUSTMENT',
  actorUserId: string
): Promise<IInventoryItem> {
  const item = await InventoryItem.findOne({ _id: itemId, organizationId });
  if (!item) {
    throw new NotFoundError('Inventory item not found');
  }

  const newQuantity = item.quantity + quantity;

  if (newQuantity < 0) {
    throw new AppError('Adjustment leads to negative stock level', 'NEGATIVE_STOCK_VIOLATION', 400);
  }

  item.quantity = newQuantity;
  await item.save(); // pre-save hook updates status
  await invalidateCachePattern(organizationId, 'analytics:*');

  // Log transaction details
  await InventoryTransaction.create({
    organizationId,
    itemId: item._id,
    quantity,
    type,
    actorUserId,
  });

  emitToOrganization(organizationId, 'inventory.updated', item);
  return item;
}

export async function listTransactions(
  organizationId: string,
  itemId?: string,
  limit = 25,
  cursor?: string
): Promise<PaginatedResult<any>> {
  const filter: any = { organizationId };
  if (itemId) {
    filter.itemId = itemId;
  }

  return getPaginatedData(
    InventoryTransaction,
    filter,
    limit,
    cursor
  );
}
