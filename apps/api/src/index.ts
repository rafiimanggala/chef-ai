import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { health } from './routes/health.js';
import { authRoutes } from './routes/auth.js';

const app = new Hono();

app.use('*', logger());
app.use('*', cors({
  origin: ['http://localhost:3000'],
  credentials: true,
}));

app.route('/health', health);
app.route('/auth', authRoutes);

const port = Number(process.env.API_PORT) || 3001;
console.log(`Chef AI API running on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};
