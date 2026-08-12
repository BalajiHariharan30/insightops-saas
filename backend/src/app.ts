import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import { config } from './config';
import { corsOptions } from './config/cors';
import { errorHandler } from './middleware/error.middleware';
import { logger } from './config/logger';
import authRouter from './modules/auth/auth.routes';
import orgRouter from './modules/organizations/organization.routes';
import inventoryRouter from './modules/inventory/inventory.routes';
import expenseRouter from './modules/expenses/expense.routes';
import scheduleRouter from './modules/scheduling/schedule.routes';
import analyticsRouter from './modules/analytics/analytics.routes';
import askRouter from './modules/ai/ask.routes';
import alertRouter from './modules/alerts/alert.routes';
import reportRouter from './modules/reports/report.routes';
import billingRouter from './modules/billing/billing.routes';
import './config/passport'; // ensure passport config is executed
import { initializeSentry, registerSentryErrorHandler } from './config/sentry';
import { setupSwagger } from './config/swagger';

const app = express();

// Trust proxy for rate limiting behind Render's load balancer
app.set('trust proxy', 1);

// Initialize Sentry error tracing at the very beginning of the pipeline
initializeSentry(app);

// Set security HTTP headers
app.use(helmet());

// Configure Cross-Origin Resource Sharing
app.use(cors(corsOptions));

// Parsing incoming JSON and URL-encoded requests
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Parse cookies into req.cookies
app.use(cookieParser());

// Initialize Passport for OAuth processing
app.use(passport.initialize());

// Apply rate limiting (Max 100 requests per 15 minutes per IP)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Request tracking log middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info({
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      durationMs: Date.now() - start,
    });
  });
  next();
});

// Liveness check (checks if application is up)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() });
});

// Readiness check (checks if external dependencies are connected)
app.get('/ready', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1; // 1 = connected
  if (dbStatus) {
    res.status(200).json({ status: 'READY', db: 'CONNECTED' });
  } else {
    res.status(503).json({ status: 'NOT_READY', db: 'DISCONNECTED' });
  }
});

// Auth Routes registration
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/organizations', orgRouter);
app.use('/api/v1/inventory', inventoryRouter);
app.use('/api/v1/expenses', expenseRouter);
app.use('/api/v1/schedules', scheduleRouter);
app.use('/api/v1/analytics', analyticsRouter);
app.use('/api/v1/ask', askRouter);
app.use('/api/v1/alerts', alertRouter);
app.use('/api/v1/reports', reportRouter);
app.use('/api/v1/billing', billingRouter);

// Register Swagger Documentation Interactive UI Page
setupSwagger(app);

// Sentry error logger (must run BEFORE any custom error handler)
registerSentryErrorHandler(app);

// Global error handler middleware
app.use(errorHandler);

export default app;
