import { GeminiProvider } from '../../infrastructure/ai/gemini.provider';
import { validateQueryAndInjectTenant } from './ai.validator';
import { InventoryItem } from '../inventory/inventory.model';
import { Expense } from '../expenses/expense.model';
import { Schedule } from '../scheduling/schedule.model';
import { Alert } from '../alerts/alert.model';
import { OrganizationMember } from '../organizations/member.model';
import { AIQueryHistory } from './history.model';
import { AppError } from '../../utils/errors';
import { logger } from '../../config/logger';

const aiProvider = new GeminiProvider();

const SCHEMA_METADATA = `
InsightOps MongoDB Collections Schema:

1. Collection: "inventoryitems"
   Purpose: Tracks inventory and stock details
   Fields:
     - sku: string (Unique identifier/part number)
     - name: string (Product/item name)
     - quantity: number (Current stock level)
     - reorderPoint: number (Low stock trigger threshold)
     - unitCost: number (Wholesale purchasing price in INR ₹)
     - sellingPrice: number (Retail sales price in INR ₹)
     - supplier: string (Supplier name)
     - status: enum ["IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK"]

2. Collection: "expenses"
   Purpose: Logs business costs and financial outlays (all amounts in INR ₹)
   Fields:
     - amount: number (Expense value in INR ₹)
     - category: string (e.g. "Office Rent", "Software & SaaS", "Hardware & Equipment", "Marketing & Ads")
     - description: string (Short expense summary)
     - date: Date (Expense date)
     - vendor: string (Merchant name)
     - status: enum ["PENDING", "APPROVED", "REJECTED"]
     - gstType: string (CGST_SGST, IGST, NONE)
     - gstAmount: number (GST charged in INR ₹)

3. Collection: "schedules"
   Purpose: Tracks staff shifts
   Fields:
     - userId: ObjectId (Employee reference)
     - startDateTime: Date (Shift start)
     - endDateTime: Date (Shift end)
     - roleRequired: string (e.g. "Developer", "Manager", "Cashier")
     - status: enum ["DRAFT", "PUBLISHED"]

4. Collection: "alerts"
   Purpose: System-generated anomaly and stock alerts
   Fields:
     - type: enum ["LOW_STOCK", "ANOMALY_EXPENSE", "OUT_OF_STOCK"]
     - severity: enum ["WARNING", "CRITICAL"]
     - message: string (Human-readable alert description)
     - status: enum ["ACTIVE", "DISMISSED"]
`;

const MODEL_MAP: Record<string, any> = {
  inventoryitems: InventoryItem,
  expenses: Expense,
  schedules: Schedule,
  alerts: Alert,
};

export async function processAskQuery(
  organizationId: string,
  userId: string,
  prompt: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
): Promise<any> {
  let collectionName = '';
  try {
    // Build context from conversation history for memory
    const historyContext = conversationHistory.length > 0
      ? `\nPrevious conversation context:\n${conversationHistory.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n')}\n`
      : '';

    // 1. Generate Structured Query from AI with conversation context
    const structuredQuery = await aiProvider.generateStructuredQuery(
      prompt,
      SCHEMA_METADATA,
      historyContext
    );
    collectionName = structuredQuery.collection;

    // 2. Run Query Sandboxing & Security Validation + Inject Tenancy scoping
    const validated = validateQueryAndInjectTenant(structuredQuery, organizationId);

    // 3. Map collection identifier to Mongoose model reference
    const model = MODEL_MAP[validated.collection];
    if (!model) {
      throw new AppError('AI mapped query to an unsupported entity reference', 'AI_UNKNOWN_MODEL', 500);
    }

    // 4. Run aggregate query sandbox execution (read-only)
    const results = await model.aggregate(validated.pipeline).exec();

    // 5. Save audit history (Success)
    await AIQueryHistory.create({
      organizationId,
      userId,
      prompt,
      success: true,
      collectionTarget: validated.collection,
    });

    return {
      query: {
        collection: validated.collection,
        visualization: validated.visualization,
        pipeline: validated.pipeline,
      },
      results,
    };
  } catch (error: any) {
    logger.error('API_ASK_ERROR', error);
    
    await AIQueryHistory.create({
      organizationId,
      userId,
      prompt,
      success: false,
      collectionTarget: collectionName || undefined,
      errorMsg: error.message || 'Unknown processing error',
    });

    throw error;
  }
}
