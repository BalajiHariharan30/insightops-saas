import https from 'https';
import { AIProvider, AIStructuredQueryResponse } from './ai.provider';
import { config } from '../../config';
import { logger } from '../../config/logger';
import { AppError } from '../../utils/errors';
import { STRUCTURED_QUERY_PROMPT } from './prompts/structured-query.prompt';

export class GeminiProvider implements AIProvider {
  private readonly apiKey: string;
  private readonly modelName = 'gemini-1.5-flash';

  constructor() {
    this.apiKey = config.AI_API_KEY;
  }

  public async generateStructuredQuery(
    prompt: string,
    schemaMetadata: string,
    historyContext: string = ''
  ): Promise<AIStructuredQueryResponse> {
    const systemInstruction = STRUCTURED_QUERY_PROMPT;
    const userPrompt = `
Database Schemas Context:
${schemaMetadata}
${historyContext}
Current User Question:
"${prompt}"
`;

    const responseText = await this.callGemini(systemInstruction, userPrompt, true);
    
    try {
      const parsed = JSON.parse(responseText);
      
      if (parsed.collection === 'error') {
        throw new AppError('AI was unable to represent the query safely', 'AI_SAFE_FALLBACK', 400);
      }

      return parsed as AIStructuredQueryResponse;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Gemini json parsing failed on response: ' + responseText);
      throw new AppError('Failed to parse structured response from AI', 'AI_PARSE_ERROR', 502);
    }
  }

  public async summarizeReport(dataSummary: string): Promise<string> {
    const systemInstruction = 'You are a professional operations consultant. Summarize this metrics dataset. Focus on actionable insights, low stock items, and high expenses. Output in Markdown.';
    return this.callGemini(systemInstruction, dataSummary, false);
  }

  private async callGemini(
    systemInstruction: string,
    prompt: string,
    requireJson: boolean
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.modelName}:generateContent?key=${this.apiKey}`;
      
      // Compose Gemini API payload
      const requestData = JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `${systemInstruction}\n\nUser Input:\n${prompt}`,
              },
            ],
          },
        ],
        generationConfig: requireJson ? { responseMimeType: 'application/json' } : undefined,
      });

      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(requestData),
        },
      };

      const req = https.request(url, options, (res) => {
        let body = '';
        res.setEncoding('utf8');
        
        res.on('data', (chunk) => {
          body += chunk;
        });

        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 400) {
            logger.error(`Gemini API error [${res.statusCode}]: ${body}`);
            return reject(new AppError(`Gemini service error: Code ${res.statusCode}`, 'AI_PROVIDER_ERROR', 502));
          }

          try {
            const parsedResponse = JSON.parse(body);
            const textContent = parsedResponse.candidates?.[0]?.content?.parts?.[0]?.text;
            
            if (!textContent) {
              return reject(new AppError('Empty response from AI engine', 'AI_EMPTY_RESPONSE', 502));
            }
            
            resolve(textContent.trim());
          } catch (err) {
            reject(new AppError('AI provider JSON decode exception', 'AI_DECODE_ERROR', 502));
          }
        });
      });

      req.on('error', (e) => {
        logger.error('Gemini HTTPS call error:', e);
        reject(new AppError('Connection to AI provider failed', 'AI_CONNECT_ERROR', 502));
      });

      req.write(requestData);
      req.end();
    });
  }
}
