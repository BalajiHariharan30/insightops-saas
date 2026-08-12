import { Request, Response, NextFunction } from 'express';
import * as inventoryService from './inventory.service';

export async function createItem(req: Request, res: Response, next: NextFunction) {
  try {
    const organizationId = req.organizationId!;
    const actorUserId = req.user!.id;
    const item = await inventoryService.createInventoryItem(organizationId, req.body, actorUserId);

    return res.status(201).json({
      success: true,
      data: item,
    });
  } catch (error) {
    return next(error);
  }
}

export async function getItem(req: Request, res: Response, next: NextFunction) {
  try {
    const organizationId = req.organizationId!;
    const { itemId } = req.params;
    const item = await inventoryService.getInventoryItem(organizationId, itemId);

    return res.status(200).json({
      success: true,
      data: item,
    });
  } catch (error) {
    return next(error);
  }
}

export async function listItems(req: Request, res: Response, next: NextFunction) {
  try {
    const organizationId = req.organizationId!;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 25;
    const cursor = req.query.cursor as string | undefined;

    const result = await inventoryService.listInventoryItems(organizationId, limit, cursor);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateItem(req: Request, res: Response, next: NextFunction) {
  try {
    const organizationId = req.organizationId!;
    const { itemId } = req.params;
    const item = await inventoryService.updateInventoryItem(organizationId, itemId, req.body);

    return res.status(200).json({
      success: true,
      data: item,
    });
  } catch (error) {
    return next(error);
  }
}

export async function adjustItemStock(req: Request, res: Response, next: NextFunction) {
  try {
    const organizationId = req.organizationId!;
    const actorUserId = req.user!.id;
    const { itemId } = req.params;
    const { quantity, type } = req.body;

    const item = await inventoryService.adjustStock(
      organizationId,
      itemId,
      quantity,
      type,
      actorUserId
    );

    return res.status(200).json({
      success: true,
      data: item,
    });
  } catch (error) {
    return next(error);
  }
}

export async function getTransactions(req: Request, res: Response, next: NextFunction) {
  try {
    const organizationId = req.organizationId!;
    const itemId = req.query.itemId as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 25;
    const cursor = req.query.cursor as string | undefined;

    const result = await inventoryService.listTransactions(
      organizationId,
      itemId,
      limit,
      cursor
    );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}
