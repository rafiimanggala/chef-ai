import { Hono } from 'hono';
import { db } from '../db/index.js';
import { plugins } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const pluginRoutes = new Hono();

pluginRoutes.get('/', async (c) => {
  const category = c.req.query('category');
  const type = c.req.query('type');

  const results = await db.select().from(plugins).where(eq(plugins.status, 'active'));

  const filtered = results.filter((p) => {
    if (category && p.category !== category) return false;
    if (type && p.type !== type) return false;
    return true;
  });

  return c.json({ plugins: filtered });
});

pluginRoutes.get('/:slug', async (c) => {
  const slug = c.req.param('slug');
  const [plugin] = await db.select().from(plugins).where(eq(plugins.slug, slug));

  if (!plugin) return c.json({ error: 'Plugin not found' }, 404);
  return c.json(plugin);
});

export { pluginRoutes };
