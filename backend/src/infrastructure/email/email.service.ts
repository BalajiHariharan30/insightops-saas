import { logger } from '../../config/logger';

export interface EmailPayload {
  to: string;
  subject: string;
  body: string;
}

export async function sendEmail({ to, subject, body }: EmailPayload): Promise<void> {
  // In portfolio mode / development mode, we output the emails to log output to bypass paid API costs
  logger.info({
    event: 'EMAIL_SENT_SIMULATOR',
    to,
    subject,
    bodyLength: body.length,
    instructions: '--- SIMULATED EMAIL START ---',
    content: body,
    instructionsEnd: '--- SIMULATED EMAIL END ---',
  });
  
  // Future production implementation would call nodemailer, SendGrid, or AWS SES
  return Promise.resolve();
}
