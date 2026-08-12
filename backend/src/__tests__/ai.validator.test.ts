import { validateQueryAndInjectTenant } from '../modules/ai/ai.validator';
import { AIStructuredQueryResponse } from '../../src/infrastructure/ai/ai.provider';

describe('AI Query Sandbox Security', () => {
  it('successfully injects organizationId into correct schema pipelines', () => {
    const input: AIStructuredQueryResponse = {
      collection: 'expenses',
      operation: 'aggregate',
      pipeline: [{ $group: { _id: '$category', total: { $sum: '$amount' } } }],
      visualization: 'pie',
    };

    const validated = validateQueryAndInjectTenant(input, '507f1f77bcf86cd799439011');
    // The organizationId filter must be prepended as stage 0
    expect(validated.pipeline[0]).toEqual({
      $match: { organizationId: expect.anything() },
    });
  });

  it('rejects pipelines targeting unauthorized collections', () => {
    const input: AIStructuredQueryResponse = {
      collection: 'users', // private user schema bypass attempt
      operation: 'aggregate',
      pipeline: [],
      visualization: 'table',
    };

    expect(() => validateQueryAndInjectTenant(input, '507f1f77bcf86cd799439011')).toThrow(
      'AI requested unauthorized database access scope: [users]'
    );
  });

  it('detects and throws on unsafe pipeline operators', () => {
    const input: AIStructuredQueryResponse = {
      collection: 'expenses',
      operation: 'aggregate',
      pipeline: [{ $match: { $where: 'this.amount > 0' } }], // JS aggregation injection
      visualization: 'card',
    };

    expect(() => validateQueryAndInjectTenant(input, '507f1f77bcf86cd799439011')).toThrow(
      'Unsafe query operator detected [$where]'
    );
  });
});
