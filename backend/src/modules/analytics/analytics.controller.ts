import { Request, Response, NextFunction } from 'express';
import * as analyticsService from './analytics.service';
import { getCachedData, setCachedData } from '../../infrastructure/redis/cache.service';

export async function getSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const organizationId = req.organizationId!;
    const cacheKey = `org:${organizationId}:analytics:summary`;

    // Attempt cache read
    const cached = await getCachedData<any>(cacheKey);
    if (cached) {
      return res.status(200).json({
        success: true,
        data: cached,
        source: 'cache',
      });
    }

    // Cache miss: execute aggregation
    const summary = await analyticsService.getDashboardSummary(organizationId);
    
    // Save to cache (TTL: 5 minutes)
    await setCachedData(cacheKey, summary, 300);

    return res.status(200).json({
      success: true,
      data: summary,
      source: 'database',
    });
  } catch (error) {
    return next(error);
  }
}

export async function getCategoryExpenses(req: Request, res: Response, next: NextFunction) {
  try {
    const organizationId = req.organizationId!;
    const cacheKey = `org:${organizationId}:analytics:expenses_by_category`;

    const cached = await getCachedData<any[]>(cacheKey);
    if (cached) {
      return res.status(200).json({
        success: true,
        data: cached,
        source: 'cache',
      });
    }

    const data = await analyticsService.getExpensesByCategory(organizationId);
    await setCachedData(cacheKey, data, 300);

    return res.status(200).json({
      success: true,
      data,
      source: 'database',
    });
  } catch (error) {
    return next(error);
  }
}

export async function getValuation(req: Request, res: Response, next: NextFunction) {
  try {
    const organizationId = req.organizationId!;
    const cacheKey = `org:${organizationId}:analytics:inventory_valuation`;

    const cached = await getCachedData<any>(cacheKey);
    if (cached) {
      return res.status(200).json({
        success: true,
        data: cached,
        source: 'cache',
      });
    }

    const data = await analyticsService.getInventoryValuation(organizationId);
    await setCachedData(cacheKey, data, 300);

    return res.status(200).json({
      success: true,
      data,
      source: 'database',
    });
  } catch (error) {
    return next(error);
  }
}
