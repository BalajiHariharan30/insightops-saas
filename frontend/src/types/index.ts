// ──────────────────────────────────────────────
// InsightOps — Centralised Frontend Type Definitions
// ──────────────────────────────────────────────

// ── Auth / User ──────────────────────────────
export interface User {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
}

// ── Organization & Membership ─────────────────
export interface Organization {
  _id: string;
  name: string;
  createdAt: string;
}

export interface Membership {
  role: 'ADMIN' | 'STAFF';
  organization: Organization;
}

// ── Dashboard ─────────────────────────────────
export interface DashboardMetrics {
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

export interface AlertRecord {
  _id: string;
  type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  message: string;
  createdAt: string;
  status: 'ACTIVE' | 'DISMISSED';
}

// ── Chart Data ────────────────────────────────
export interface CategoryExpense {
  _id: string;       // category name
  totalAmount: number;
  count: number;
}

export interface InventoryValuation {
  totalCostValue: number;
  totalRetailValue: number;
  totalItemsCount: number;
}

// ── Expenses ──────────────────────────────────
export type GstType = 'NONE' | 'CGST_SGST' | 'IGST';
export type ExpenseStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Expense {
  _id: string;
  vendor: string;
  vendorGSTIN?: string;
  category: string;
  amount: number;
  gstType: GstType;
  gstRate?: number;
  gstAmount?: number;
  status: ExpenseStatus;
  isAnomaly: boolean;
  zScore?: number;
  upiTransactionId?: string;
  date: string;
  description?: string;
}

// ── Inventory ─────────────────────────────────
export type InventoryStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export interface InventoryItem {
  _id: string;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  unitCost: number;
  sellingPrice: number;
  status: InventoryStatus;
  reorderLevel: number;
  supplier?: string;
}

// ── Scheduling ────────────────────────────────
export type ShiftStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED';

export interface ScheduleShift {
  _id: string;
  employeeName: string;
  role: string;
  startDateTime: string;
  endDateTime: string;
  status: ShiftStatus;
  notes?: string;
}

// ── Billing ───────────────────────────────────
export type PlanKey = 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
export type BillingStatusType = 'ACTIVE' | 'INACTIVE' | 'CANCELLED' | 'PAST_DUE';

export interface BillingStatus {
  status: BillingStatusType;
  plan: PlanKey;
  currentPeriodEnd: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}

// ── AI Assistant ──────────────────────────────
export type VisualizationType = 'pie' | 'bar' | 'table';

export interface AIQueryResult {
  visualization: VisualizationType;
  collection: string;
  results: Record<string, unknown>[];
}
