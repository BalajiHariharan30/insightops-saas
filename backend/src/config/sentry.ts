import * as Sentry from '@sentry/node';
import { Express } from 'express';
import { config } from './index';
import { logger } from './logger';

export function initializeSentry(app: Express): void {
  if (config.SENTRY_DSN) {
    Sentry.init({
      dsn: config.SENTRY_DSN,
      integrations: [
        // Enable HTTP request/response tracing
        new Sentry.Integrations.Http({ tracing: true }),
        // Enable Express tracing middlewares
        new Sentry.Integrations.Express({ app }),
      ],
      tracesSampleRate: 1.0,   // Trace 100% of transactions (reduce to 0.2 in high-traffic prod)
      profilesSampleRate: 1.0, // Continuous profiling — flame graphs + bottleneck detection
      environment: config.NODE_ENV,
    });

    // RequestHandler creates a separate execution context for each request
    app.use(Sentry.Handlers.requestHandler());
    // TracingHandler creates trace spans for each request
    app.use(Sentry.Handlers.tracingHandler());

    logger.info('💚 Sentry application observability initialized successfully.');
  } else {
    logger.warn('⚠️ Sentry DSN key is missing from configurations. Error tracking is disabled.');
  }
}

export function registerSentryErrorHandler(app: Express): void {
  if (config.SENTRY_DSN) {
    // The Sentry error handler must be registered BEFORE other error middlewares
    app.use(Sentry.Handlers.errorHandler());
    logger.info('💚 Sentry error handler middleware registered.');
  }
}
