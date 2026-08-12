import { Request, Response, NextFunction } from 'express';
import * as expenseService from './expense.service';

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const organizationId = req.organizationId!;
    const actorUserId = req.user!.id;
    const expense = await expenseService.createExpense(organizationId, req.body, actorUserId);

    return res.status(201).json({
      success: true,
      data: expense,
    });
  } catch (error) {
    return next(error);
  }
}

export async function get(req: Request, res: Response, next: NextFunction) {
  try {
    const organizationId = req.organizationId!;
    const { expenseId } = req.params;
    const expense = await expenseService.getExpense(organizationId, expenseId);

    return res.status(200).json({
      success: true,
      data: expense,
    });
  } catch (error) {
    return next(error);
  }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const organizationId = req.organizationId!;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 25;
    const cursor = req.query.cursor as string | undefined;
    
    const filters = {
      category: req.query.category as string | undefined,
      status: req.query.status as string | undefined,
    };

    const result = await expenseService.listExpenses(organizationId, filters, limit, cursor);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const organizationId = req.organizationId!;
    const userRole = req.userRole!;
    const { expenseId } = req.params;

    const expense = await expenseService.updateExpense(
      organizationId,
      expenseId,
      req.body,
      userRole,
      req.user!.id
    );

    return res.status(200).json({
      success: true,
      data: expense,
    });
  } catch (error) {
    return next(error);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const organizationId = req.organizationId!;
    const { expenseId } = req.params;
    await expenseService.deleteExpense(organizationId, expenseId, req.user!.id);

    return res.status(200).json({
      success: true,
      message: 'Expense record deleted successfully',
    });
  } catch (error) {
    return next(error);
  }
}
