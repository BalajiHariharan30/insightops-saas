export interface AIStructuredQueryResponse {
  collection: string;
  operation: string;
  pipeline: any[];
  visualization: 'bar' | 'line' | 'pie' | 'table' | 'card';
  chatResponse?: string;
}

export interface AIProvider {
  generateStructuredQuery(
    prompt: string,
    schemaMetadata: string
  ): Promise<AIStructuredQueryResponse>;
  
  summarizeReport(
    dataSummary: string
  ): Promise<string>;
}
