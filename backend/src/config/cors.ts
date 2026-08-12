import cors from 'cors';
import { config } from './index';

const allowedOrigins = [config.FRONTEND_URL];

export const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // In development mode, allow requests with no origin (like mobile apps, curl, postman)
    if (!origin || allowedOrigins.includes(origin) || config.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS policy'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-organization-id'],
};
