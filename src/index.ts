import dotenv from 'dotenv';
dotenv.config();

import { createServer } from 'http';
import app from './app';
import { initializeSocketIO } from './socket';
import { setIO } from './socket/instance';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';
import { redis } from './lib/redis';

const PORT = process.env.PORT || 3001;

async function bootstrap() {
  try {
    await prisma.$connect();
    logger.info('Database connected successfully');

    await redis.ping();
    logger.info('Redis connected successfully');

    const httpServer = createServer(app);
    const io = initializeSocketIO(httpServer);
    setIO(io);

    httpServer.listen(PORT, () => {
      logger.info(`Arvana-Terra Backend running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  redis.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await prisma.$disconnect();
  redis.disconnect();
  process.exit(0);
});
