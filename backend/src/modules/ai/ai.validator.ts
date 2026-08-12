import { Types } from 'mongoose';
import { AIStructuredQueryResponse } from '../../infrastructure/ai/ai.provider';
import { ValidationError } from '../../utils/errors';

const ALLOWED_COLLECTIONS = ['inventoryitems', 'expenses', 'schedules'];
const FORBIDDEN_OPERATORS = ['$where', '$accumulator', '$function', '$out', '$merge'];

export function validateQueryAndInjectTenant(
  aiResult: AIStructuredQueryResponse,
  organizationId: string
): AIStructuredQueryResponse {
  // 1. Guard Collection Scoping
  if (!ALLOWED_COLLECTIONS.includes(aiResult.collection)) {
    throw new ValidationError(`AI requested unauthorized database access scope: [${aiResult.collection}]`);
  }

  // 2. Scan for Javascript Aggregation Injection attempts
  const pipelineStr = JSON.stringify(aiResult.pipeline);
  for (const op of FORBIDDEN_OPERATORS) {
    if (pipelineStr.includes(op)) {
      throw new ValidationError(`AI response rejected: Unsafe query operator detected [${op}]`);
    }
  }

  // 3. Prevent Tenant Leakage: Force-inject the organizationId filter at the top of the pipeline
  // If the pipeline is empty, create a simple match stage
  if (!aiResult.pipeline) {
    aiResult.pipeline = [];
  }

  // Ensure organizationId is cast to Mongoose ObjectId
  aiResult.pipeline.unshift({
    $match: { organizationId: new Types.ObjectId(organizationId) },
  });

  return aiResult;
}
