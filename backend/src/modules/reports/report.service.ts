import { Report, IReport } from './report.model';
import { Expense } from '../expenses/expense.model';
import { InventoryItem } from '../inventory/inventory.model';
import { Schedule } from '../scheduling/schedule.model';
import { GeminiProvider } from '../../infrastructure/ai/gemini.provider';
import { NotFoundError } from '../../utils/errors';
import { Types } from 'mongoose';
import { emitToOrganization } from '../../infrastructure/sockets/socket';

const aiProvider = new GeminiProvider();

export async function generateReport(
  organizationId: string,
  type: 'WEEKLY' | 'MONTHLY'
): Promise<IReport> {
  const orgId = new Types.ObjectId(organizationId);
  const now = new Date();
  
  let daysToAggregate = 7;
  if (type === 'MONTHLY') {
    daysToAggregate = 30;
  }

  const startDate = new Date();
  startDate.setDate(now.getDate() - daysToAggregate);
  const endDate = now;

  // 1. Gather Metrics - Expenses approved during interval
  const expenseMetrics = await Expense.aggregate([
    {
      $match: {
        organizationId: orgId,
        status: 'APPROVED',
        date: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
  ]);

  const expenses = expenseMetrics[0] || { total: 0, count: 0 };

  // 2. Gather Metrics - Low stock levels
  const lowStockItems = await InventoryItem.find({
    organizationId,
    status: { $in: ['LOW_STOCK', 'OUT_OF_STOCK'] },
  }).select('name sku quantity reorderPoint').exec();

  // 3. Gather Metrics - Total shifts scheduled
  const shiftsCount = await Schedule.countDocuments({
    organizationId,
    startDateTime: { $gte: startDate, $lte: endDate },
  });

  const metrics = {
    expenses: {
      totalApprovedAmount: expenses.total,
      approvedCount: expenses.count,
    },
    inventory: {
      lowStockItemsCount: lowStockItems.length,
      lowStockItemsList: lowStockItems.map(item => ({
        sku: item.sku,
        name: item.name,
        qty: item.quantity,
        threshold: item.reorderPoint,
      })),
    },
    scheduling: {
      totalShiftsAssigned: shiftsCount,
    },
  };

  // 4. Create raw text baseline for AI summarization
  const rawSummaryText = `
Report Period: ${startDate.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })} to ${endDate.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}
Report Type: ${type}

Financial Metrics:
- Total Approved Expenses: ₹${metrics.expenses.totalApprovedAmount.toLocaleString('en-IN')}
- Number of Transactions: ${metrics.expenses.approvedCount}

Inventory Stock Alerts:
- Low/Out-Of-Stock Products: ${metrics.inventory.lowStockItemsCount} items
- Details of alert items:
${metrics.inventory.lowStockItemsList.map(i => `  * SKU: ${i.sku} | Name: ${i.name} | Current Qty: ${i.qty} (Reorder at: ${i.threshold})`).join('\n')}

Employee Shifts Assigned:
- Total Scheduled Shifts: ${metrics.scheduling.totalShiftsAssigned} shifts
  `;

  // 5. Instantiate a report record (PENDING status)
  const report = new Report({
    organizationId,
    type,
    startDate,
    endDate,
    metrics,
    status: 'PENDING',
  });
  await report.save();

  // 6. Invoke AI Provider to compile insights asynchronously (prevent API blocking)
  // Standard Request/Response wrapper
  try {
    const summary = await aiProvider.summarizeReport(rawSummaryText);
    report.summaryText = summary;
    report.status = 'GENERATED';
    await report.save();
    emitToOrganization(organizationId, 'report.generated', report);
  } catch (error) {
    report.status = 'FAILED';
    await report.save();
    throw error;
  }

  return report;
}

export async function listReports(organizationId: string): Promise<IReport[]> {
  return Report.find({ organizationId }).sort({ createdAt: -1 }).exec();
}

export async function getReport(organizationId: string, reportId: string): Promise<IReport> {
  const report = await Report.findOne({ _id: reportId, organizationId });
  if (!report) {
    throw new NotFoundError('Report not found');
  }
  return report;
}
