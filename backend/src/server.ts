import http from 'http';
import app from './app';
import { config } from './config';
import { connectDatabase, disconnectDatabase } from './infrastructure/database/mongoose';
import { logger } from './config/logger';
import { initializeSockets } from './infrastructure/sockets/socket';
import { initializeCronJobs } from './jobs';

const server = http.createServer(app);
const PORT = config.PORT;

async function startServer() {
  try {
    // Connect to database
    await connectDatabase();

    // Start Real-time Socket Server
    initializeSockets(server, config.FRONTEND_URL);

    // Initialize Cron Jobs
    initializeCronJobs();

    // Start listening
    server.listen(PORT, () => {
      logger.info(`🚀 InsightOps Server running in [${config.NODE_ENV}] mode on port ${PORT}`);
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
  logger.info(`⚠️ Received ${signal}. Starting graceful shutdown...`);
  
  server.close(async () => {
    logger.info('HTTP server closed.');
    try {
      await disconnectDatabase();
      logger.info('Database connections closed.');
      process.exit(0);
    } catch (err) {
      logger.error('Error during database disconnect:', err);
      process.exit(1);
    }
  });

  // Force close after 10s
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();
