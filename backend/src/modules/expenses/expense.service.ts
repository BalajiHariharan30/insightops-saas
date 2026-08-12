import { Expense, IExpense } from './expense.model';
import { getPaginatedData, PaginatedResult } from '../../utils/pagination';
import { NotFoundError, AuthorizationError } from '../../utils/errors';
import { invalidateCachePattern } from '../../infrastructure/redis/cache.service';
import { detectZScoreAnomaly } from '../../utils/math';
import { Alert } from '../alerts/alert.model';
import { emitToOrganization } from '../../infrastructure/sockets/socket';
import { logAction } from '../audit/audit.service';

export async function createExpense(
  organizationId: string,
  payload: {
    amount: number;
    category: string;
    description?: string;
    date?: string | Date;
    vendor: string;
    receiptUrl?: string;
  },
  actorUserId: string
): Promise<IExpense> {
  const expenseDate = payload.date ? new Date(payload.date) : new Date();

  const expense = new Expense({
    ...payload,
    date: expenseDate,
    organizationId,
    actorUserId,
    status: 'PENDING', // Default to pending approval
  });

  await expense.save();
  await invalidateCachePattern(organizationId, 'analytics:*');
  emitToOrganization(organizationId, 'expense.created', expense);

  // Record Audit Log entry
  await logAction(organizationId, actorUserId, 'EXPENSE_CREATED', 'Expense', expense._id.toString(), {
    amount: payload.amount,
    category: payload.category,
    vendor: payload.vendor,
  });

  // Trigger Outlier Anomaly Detection (using approved items in same category)
  try {
    const historicalExpenses = await Expense.find({
      organizationId,
      category: payload.category,
      status: 'APPROVED',
    }).select('amount').exec();

    const historicalValues = historicalExpenses.map(e => e.amount);
    const result = detectZScoreAnomaly(payload.amount, historicalValues, 3.0);

    if (result.isAnomaly) {
      const alert = await Alert.create({
        organizationId,
        type: 'ANOMALY_EXPENSE',
        severity: 'WARNING',
        message: `Unusual expense detected: ${payload.vendor} expense of ${payload.amount} under category '${payload.category}' is ${result.zScore.toFixed(1)} standard deviations above normal.`,
        metadata: {
          amount: payload.amount,
          category: payload.category,
          zScore: result.zScore,
          expenseId: expense._id,
        },
      });
      emitToOrganization(organizationId, 'expense.anomaly_detected', alert);
    }
  } catch (err) {
    // Avoid crashing expense submission if anomaly checks fail
    console.error('Failed to run expense anomaly detection:', err);
  }

  return expense;
}

export async function getExpense(
  organizationId: string,
  expenseId: string
): Promise<IExpense> {
  const expense = await Expense.findOne({ _id: expenseId, organizationId });
  if (!expense) {
    throw new NotFoundError('Expense record not found');
  }
  return expense;
}

export async function listExpenses(
  organizationId: string,
  filters: { category?: string; status?: string } = {},
  limit = 25,
  cursor?: string
): Promise<PaginatedResult<IExpense>> {
  const query: any = { organizationId };

  if (filters.category) {
    query.category = filters.category;
  }
  if (filters.status) {
    query.status = filters.status;
  }

  return getPaginatedData(Expense, query, limit, cursor);
}

export async function updateExpense(
  organizationId: string,
  expenseId: string,
  payload: {
    amount?: number;
    category?: string;
    description?: string;
    date?: string;
    vendor?: string;
    status?: 'PENDING' | 'APPROVED' | 'REJECTED';
    receiptUrl?: string;
  },
  userRole: 'ADMIN' | 'STAFF',
  actorUserId: string
): Promise<IExpense> {
  const expense = await Expense.findOne({ _id: expenseId, organizationId });
  if (!expense) {
    throw new NotFoundError('Expense record not found');
  }

  // RBAC Safeguard: Staff members cannot approve or reject expenses
  if (payload.status && payload.status !== expense.status && userRole !== 'ADMIN') {
    throw new AuthorizationError('Only administrators are authorized to update expense approval status');
  }

  Object.assign(expense, payload);
  await expense.save();
  await invalidateCachePattern(organizationId, 'analytics:*');

  // Record Audit Log entry
  await logAction(organizationId, actorUserId, 'EXPENSE_UPDATED', 'Expense', expense._id.toString(), {
    updatedFields: Object.keys(payload),
    status: payload.status,
  });

  return expense;
}

export async function deleteExpense(
  organizationId: string,
  expenseId: string,
  actorUserId: string
): Promise<void> {
  const result = await Expense.deleteOne({ _id: expenseId, organizationId });
  if (result.deletedCount === 0) {
    throw new NotFoundError('Expense record not found');
  }
  await invalidateCachePattern(organizationId, 'analytics:*');

  // Record Audit Log entry
  await logAction(organizationId, actorUserId, 'EXPENSE_DELETED', 'Expense', expenseId);
}
