import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth.js';
import { db } from '../db/index.js';
import { creditTransactions } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';

const credits = new Hono();

credits.use('*', requireAuth);

credits.get('/', async (c) => {
  const user = c.get('user');
  const transactions = await db
    .select()
    .from(creditTransactions)
    .where(eq(creditTransactions.userId, user.id))
    .orderBy(desc(creditTransactions.createdAt))
    .limit(50);

  return c.json({
    balance: user.creditsBalance,
    monthlyReset: user.creditsMonthlyReset,
    plan: user.plan,
    transactions,
  });
});

export { credits };
