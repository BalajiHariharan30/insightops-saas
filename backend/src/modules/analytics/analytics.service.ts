import { Types } from 'mongoose';
import { Expense } from '../expenses/expense.model';
import { InventoryItem } from '../inventory/inventory.model';
import { Schedule } from '../scheduling/schedule.model';

export interface DashboardSummary {
  inventory: {
    totalItems: number;
    lowStockCount: number;
    outOfStockCount: number;
  };
  expenses: {
    currentMonthTotal: number;
    previousMonthTotal: number;
    percentageChange: number;
  };
  scheduling: {
    activeShiftsThisWeek: number;
  };
}

export async function getDashboardSummary(organizationId: string): Promise<DashboardSummary> {
  const orgId = new Types.ObjectId(organizationId);

  // 1. Inventory counts
  const inventoryCounts = await InventoryItem.aggregate([
    { $match: { organizationId: orgId } },
    {
      $group: {
        _id: null,
        totalItems: { $sum: 1 },
        lowStockCount: {
          $sum: { $cond: [{ $eq: ['$status', 'LOW_STOCK'] }, 1, 0] },
        },
        outOfStockCount: {
          $sum: { $cond: [{ $eq: ['$status', 'OUT_OF_STOCK'] }, 1, 0] },
        },
      },
    },
  ]);

  const inv = inventoryCounts[0] || { totalItems: 0, lowStockCount: 0, outOfStockCount: 0 };

  // 2. Expenses comparisons (current month vs previous month)
  const now = new Date();
  const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const expenseAgg = await Expense.aggregate([
    {
      $match: {
        organizationId: orgId,
        status: 'APPROVED',
        date: { $gte: startOfPreviousMonth },
      },
    },
    {
      $group: {
        _id: {
          $cond: [{ $gte: ['$date', startOfCurrentMonth] }, 'current', 'previous'],
        },
        total: { $sum: '$amount' },
      },
    },
  ]);

  let currentMonthTotal = 0;
  let previousMonthTotal = 0;

  expenseAgg.forEach((item) => {
    if (item._id === 'current') {
      currentMonthTotal = item.total;
    } else if (item._id === 'previous') {
      previousMonthTotal = item.total;
    }
  });

  let percentageChange = 0;
  if (previousMonthTotal > 0) {
    percentageChange = ((currentMonthTotal - previousMonthTotal) / previousMonthTotal) * 100;
  }

  // 3. Shifts this week
  const startOfWeek = new Date();
  startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7); // Next Sunday

  const activeShiftsThisWeek = await Schedule.countDocuments({
    organizationId: orgId,
    startDateTime: { $gte: startOfWeek, $lt: endOfWeek },
    status: 'PUBLISHED',
  });

  return {
    inventory: {
      totalItems: inv.totalItems,
      lowStockCount: inv.lowStockCount,
      outOfStockCount: inv.outOfStockCount,
    },
    expenses: {
      currentMonthTotal,
      previousMonthTotal,
      percentageChange,
    },
    scheduling: {
      activeShiftsThisWeek,
    },
  };
}

export async function getExpensesByCategory(organizationId: string): Promise<any[]> {
  const orgId = new Types.ObjectId(organizationId);

  return Expense.aggregate([
    {
      $match: {
        organizationId: orgId,
        status: 'APPROVED',
      },
    },
    {
      $group: {
        _id: '$category',
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { totalAmount: -1 } },
  ]);
}

export async function getInventoryValuation(organizationId: string): Promise<any> {
  const orgId = new Types.ObjectId(organizationId);

  const valuation = await InventoryItem.aggregate([
    { $match: { organizationId: orgId } },
    {
      $group: {
        _id: null,
        totalCostValue: { $sum: { $multiply: ['$quantity', '$unitCost'] } },
        totalRetailValue: { $sum: { $multiply: ['$quantity', '$sellingPrice'] } },
        totalItemsCount: { $sum: '$quantity' },
      },
    },
  ]);

  return valuation[0] || { totalCostValue: 0, totalRetailValue: 0, totalItemsCount: 0 };
}
