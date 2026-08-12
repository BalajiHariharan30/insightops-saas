import { Request, Response, NextFunction } from 'express';
import * as askService from './ask.service';
import { ValidationError } from '../../utils/errors';

export async function ask(req: Request, res: Response, next: NextFunction) {
  try {
    const organizationId = req.organizationId!;
    const userId = req.user!.id;
    const { prompt, conversationHistory } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      throw new ValidationError('Question prompt is required and must be a string');
    }

    // Accept optional conversation history for context-aware follow-up questions
    const history = Array.isArray(conversationHistory) ? conversationHistory : [];

    const output = await askService.processAskQuery(organizationId, userId, prompt, history);

    return res.status(200).json({
      success: true,
      data: output,
    });
  } catch (error) {
    return next(error);
  }
}
