import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      plan: { type: 'string', defaultValue: 'free' },
      creditsBalance: { type: 'number', defaultValue: 50 },
      creditsMonthlyReset: { type: 'number', defaultValue: 50 },
    },
  },
  trustedOrigins: [process.env.BETTER_AUTH_URL!, 'http://localhost:3000'],
});

export type Auth = typeof auth;
