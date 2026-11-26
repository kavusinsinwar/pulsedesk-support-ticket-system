import cors from 'cors';
import express, { Express } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { openApiSpec } from './config/swagger';
import { initializeEventSubscribers } from './events';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import { apiRateLimiter } from './middlewares/rateLimit.middleware';
import v1Routes from './routes';

export function createApp(): Express {
  const app = express();
  app.set('trust proxy', 1);
  app.set('etag', false);

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
      credentials: true,
    })
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  if (env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  app.get('/', (_req, res) => {
    res.status(200).json({
      success: true,
      service: 'PulseDesk Support Ticket Management API',
      health: '/health',
      docs: '/api/docs',
    });
  });

  app.get('/health', (_req, res) => {
    res.status(200).json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  });

  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));
  app.use(
    '/api/v1',
    (_req, res, next) => {
      res.setHeader('Cache-Control', 'no-store');
      next();
    },
    apiRateLimiter,
    v1Routes
  );

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

initializeEventSubscribers();
const defaultApp = createApp();
export default defaultApp;
