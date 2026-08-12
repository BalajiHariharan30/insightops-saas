import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';
import { config } from './index';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'InsightOps API Documentation',
      version: '1.0.0',
      description: 'API documentation for InsightOps AI-powered business operations dashboard.',
    },
    servers: [
      {
        url: `http://localhost:${config.PORT}`,
        description: 'Development Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your short-lived access JWT',
        },
        tenantIdHeader: {
          type: 'apiKey',
          in: 'header',
          name: 'x-organization-id',
          description: 'Target tenant Organization ID header context',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
        tenantIdHeader: [],
      },
    ],
  },
  apis: ['./src/modules/**/*.ts', './src/app.ts'], // Scan for swagger annotations in modules
};

const swaggerSpec = swaggerJSDoc(options);

export function setupSwagger(app: Express): void {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}
export default setupSwagger;
