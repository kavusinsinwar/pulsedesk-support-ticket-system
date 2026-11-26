import http from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './config/prisma';
import { initializeEventSubscribers } from './events';
import { closeSocketServer, initSocketServer } from './realtime/socketServer';

async function bootstrap() {
  initializeEventSubscribers();

  const app = createApp();
  const httpServer = http.createServer(app);
  initSocketServer(httpServer);

  httpServer.listen(env.PORT, () => {
    console.log(`Server running on http://localhost:${env.PORT}`);
    console.log(`WebSocket (Socket.IO) server active on ws://localhost:${env.PORT}`);
    console.log(`Swagger API docs available at http://localhost:${env.PORT}/api/docs`);
  });

  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    closeSocketServer();
    httpServer.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
