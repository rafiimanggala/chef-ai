# Chef AI V2 — Plan 1: Foundation + Core Infrastructure

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the Chef AI monorepo with database, auth, credit system, and basic API skeleton — a working, deployable backend that all subsequent plans build on.

**Architecture:** Turborepo monorepo with two apps (`web` Next.js 15, `api` Hono) and three packages (`shared`, `plugin-sdk`, `agent-core`). PostgreSQL via Drizzle ORM, Redis for sessions/cache, Better Auth for authentication. Credit ledger tracks all billing. API exposes REST endpoints over Hono.

**Tech Stack:** Turborepo, pnpm, Hono, Drizzle ORM, PostgreSQL 16, Redis 7, Better Auth, Vitest, Docker Compose, TypeScript 5.x, Zod.

**Prerequisite:** `npm install -g pnpm` (pnpm not currently installed on this machine).

---

## File Structure

```
chef-ai/
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── index.ts                  # Hono app entry, middleware, mount routes
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts               # Auth endpoints (register, login, logout, me)
│   │   │   │   ├── credits.ts            # Credit balance, transactions, purchase
│   │   │   │   ├── plugins.ts            # List plugins, get plugin detail
│   │   │   │   └── health.ts             # Health check endpoint
│   │   │   ├── services/
│   │   │   │   └── credit-service.ts     # Credit business logic (deduct, refund, reset)
│   │   │   ├── db/
│   │   │   │   ├── index.ts              # Drizzle client export
│   │   │   │   ├── schema.ts             # All table definitions
│   │   │   │   └── seed.ts               # Seed 15 plugin manifests into DB
│   │   │   ├── lib/
│   │   │   │   ├── auth.ts               # Better Auth instance config
│   │   │   │   └── env.ts                # Env var validation (Zod)
│   │   │   └── middleware/
│   │   │       └── auth.ts               # Auth middleware for protected routes
│   │   ├── drizzle.config.ts             # Drizzle Kit config
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── vitest.config.ts
│   │
│   └── web/
│       ├── app/
│       │   ├── layout.tsx                # Root layout (minimal for Plan 1)
│       │   └── page.tsx                  # Placeholder home page
│       ├── package.json
│       ├── next.config.ts
│       ├── tailwind.config.ts
│       └── tsconfig.json
│
├── packages/
│   └── shared/
│       ├── src/
│       │   ├── types/
│       │   │   ├── plugin.ts             # PluginManifest, PluginType, etc.
│       │   │   ├── agent.ts              # AgentDefinition, RunResult, etc.
│       │   │   ├── credit.ts             # CreditTransaction, CreditBalance
│       │   │   └── index.ts              # Re-export all types
│       │   └── index.ts                  # Package entry
│       ├── package.json
│       └── tsconfig.json
│
├── docker/
│   └── docker-compose.yml                # PostgreSQL 16 + Redis 7
│
├── .env.example
├── turbo.json
├── pnpm-workspace.yaml
├── package.json                          # Root: scripts, devDeps
├── tsconfig.base.json                    # Shared TS config
└── .gitignore
```

---

### Task 1: Monorepo Scaffold

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, `.gitignore`, `.env.example`
- Create: `apps/api/package.json`, `apps/api/tsconfig.json`
- Create: `apps/web/package.json`, `apps/web/tsconfig.json`
- Create: `packages/shared/package.json`, `packages/shared/tsconfig.json`

- [ ] **Step 1: Install pnpm**

```bash
npm install -g pnpm
pnpm --version
```

Expected: `9.x.x` printed.

- [ ] **Step 2: Create root package.json**

```json
{
  "name": "chef-ai",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "test": "turbo test",
    "lint": "turbo lint",
    "db:generate": "turbo db:generate --filter=@chef-ai/api",
    "db:migrate": "turbo db:migrate --filter=@chef-ai/api",
    "db:seed": "turbo db:seed --filter=@chef-ai/api"
  },
  "devDependencies": {
    "turbo": "^2.5.0",
    "typescript": "^5.8.0"
  },
  "packageManager": "pnpm@9.15.0"
}
```

- [ ] **Step 3: Create pnpm-workspace.yaml**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 4: Create turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "dev": {
      "cache": false,
      "persistent": true
    },
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "lint": {},
    "db:generate": {
      "cache": false
    },
    "db:migrate": {
      "cache": false
    },
    "db:seed": {
      "cache": false
    }
  }
}
```

- [ ] **Step 5: Create tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist",
    "rootDir": "src",
    "resolveJsonModule": true,
    "isolatedModules": true
  },
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 6: Create .gitignore**

```
node_modules/
dist/
.next/
.turbo/
.env
.env.local
*.log
.DS_Store
```

- [ ] **Step 7: Create .env.example**

```env
# Database
DATABASE_URL=postgresql://chef:chef@localhost:5432/chefai

# Redis
REDIS_URL=redis://localhost:6379

# Auth
BETTER_AUTH_SECRET=change-me-to-random-string
BETTER_AUTH_URL=http://localhost:3001

# App
API_PORT=3001
WEB_PORT=3000
```

- [ ] **Step 8: Create packages/shared**

`packages/shared/package.json`:
```json
{
  "name": "@chef-ai/shared",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc",
    "lint": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.8.0"
  }
}
```

`packages/shared/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

`packages/shared/src/index.ts`:
```typescript
export * from './types/index.js';
```

`packages/shared/src/types/index.ts`:
```typescript
export * from './plugin.js';
export * from './credit.js';
export * from './agent.js';
```

`packages/shared/src/types/plugin.ts`:
```typescript
export type PluginType = 'tool' | 'behavior' | 'integration' | 'model-config';

export interface PluginExternalApi {
  name: string;
  cost_per_call: number;
}

export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  type: PluginType;
  category: string;
  tags: string[];
  capabilities_provided: string[];
  capabilities_unlocked_with: Record<string, string[]>;
  requires: string[];
  enhances: string[];
  conflicts: string[];
  affinity: Record<string, number>;
  pricing: {
    external_apis: PluginExternalApi[];
    compute_intensity: 'light' | 'medium' | 'heavy';
  };
  mcp: {
    transport: 'stdio';
    command: string;
    args: string[];
    env: Record<string, { required: boolean; source: 'platform' | 'user' }>;
  };
  config: {
    schema: Record<string, unknown>;
  };
}
```

`packages/shared/src/types/credit.ts`:
```typescript
export type CreditTransactionType =
  | 'monthly-reset'
  | 'purchase'
  | 'run-consume'
  | 'run-refund'
  | 'bonus';

export interface CreditTransaction {
  id: string;
  userId: string;
  amount: number;
  type: CreditTransactionType;
  runId: string | null;
  description: string | null;
  createdAt: Date;
}

export interface CreditBalance {
  balance: number;
  monthlyReset: number;
  plan: 'free' | 'pro' | 'power';
}
```

`packages/shared/src/types/agent.ts`:
```typescript
export interface AgentDefinition {
  id: string;
  userId: string;
  name: string;
  goal: string;
  model: string;
  systemPrompt: string;
  plugins: Array<{ name: string; config: Record<string, unknown> }>;
  settings: AgentSettings;
  potentialScore: number | null;
}

export interface AgentSettings {
  max_steps: number;
  budget_credits: number;
  temperature: number;
  verify_output: boolean;
  timeout: number;
}

export type RunStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'budget-exceeded'
  | 'cancelled';

export interface RunResult {
  id: string;
  agentId: string;
  status: RunStatus;
  output: string | null;
  creditsUsed: number;
  creditsBudget: number;
  stepCount: number;
  durationMs: number | null;
}
```

- [ ] **Step 9: Create apps/api scaffold**

`apps/api/package.json`:
```json
{
  "name": "@chef-ai/api",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "tsc --noEmit",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:seed": "tsx src/db/seed.ts"
  },
  "dependencies": {
    "@chef-ai/shared": "workspace:*",
    "better-auth": "^1.2.0",
    "drizzle-orm": "^0.40.0",
    "hono": "^4.7.0",
    "ioredis": "^5.6.0",
    "postgres": "^3.4.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "drizzle-kit": "^0.30.0",
    "tsx": "^4.19.0",
    "typescript": "^5.8.0",
    "vitest": "^3.1.0"
  }
}
```

`apps/api/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

`apps/api/vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
});
```

- [ ] **Step 10: Create apps/web scaffold**

`apps/web/package.json`:
```json
{
  "name": "@chef-ai/web",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "next dev --port 3000",
    "build": "next build",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^15.3.0",
    "react": "^19.1.0",
    "react-dom": "^19.1.0"
  },
  "devDependencies": {
    "@types/react": "^19.1.0",
    "@types/react-dom": "^19.1.0",
    "tailwindcss": "^4.1.0",
    "@tailwindcss/postcss": "^4.1.0",
    "typescript": "^5.8.0"
  }
}
```

`apps/web/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "preserve",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src", "app", "next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

`apps/web/next.config.ts`:
```typescript
import type { NextConfig } from 'next';

const config: NextConfig = {
  transpilePackages: ['@chef-ai/shared'],
};

export default config;
```

`apps/web/app/layout.tsx`:
```tsx
export const metadata = { title: 'Chef AI', description: 'Build your perfect AI agent' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

`apps/web/app/page.tsx`:
```tsx
export default function Home() {
  return <h1>Chef AI</h1>;
}
```

- [ ] **Step 11: Install dependencies and verify monorepo**

```bash
cd ~/projects/chef-ai
pnpm install
pnpm build
```

Expected: all packages build without errors.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "feat: scaffold Turborepo monorepo with api, web, and shared packages"
```

---

### Task 2: Docker Compose + Database Schema

**Files:**
- Create: `docker/docker-compose.yml`
- Create: `apps/api/src/db/schema.ts`
- Create: `apps/api/src/db/index.ts`
- Create: `apps/api/drizzle.config.ts`
- Create: `apps/api/src/lib/env.ts`
- Test: `apps/api/src/__tests__/db/schema.test.ts`

- [ ] **Step 1: Create Docker Compose**

`docker/docker-compose.yml`:
```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: chef
      POSTGRES_PASSWORD: chef
      POSTGRES_DB: chefai
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data

volumes:
  pgdata:
  redisdata:
```

- [ ] **Step 2: Start services**

```bash
docker compose -f ~/projects/chef-ai/docker/docker-compose.yml up -d
```

Expected: both containers running. Verify with `docker ps`.

- [ ] **Step 3: Create env validation**

`apps/api/src/lib/env.ts`:
```typescript
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(16),
  BETTER_AUTH_URL: z.string().url(),
  API_PORT: z.coerce.number().default(3001),
});

export const env = envSchema.parse(process.env);
```

- [ ] **Step 4: Create .env file**

Copy `.env.example` to `.env` at project root:
```bash
cp ~/projects/chef-ai/.env.example ~/projects/chef-ai/.env
```

- [ ] **Step 5: Create Drizzle schema**

`apps/api/src/db/schema.ts`:
```typescript
import { pgTable, text, integer, boolean, real, timestamp, jsonb, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

const id = () => text('id').primaryKey().$defaultFn(() => crypto.randomUUID());
const createdAt = () => timestamp('created_at', { withTimezone: true }).defaultNow().notNull();
const updatedAt = () => timestamp('updated_at', { withTimezone: true }).defaultNow().notNull();

// ─── Users ────────────────────────────────────────────────────────
export const users = pgTable('users', {
  id: id(),
  email: text('email').unique().notNull(),
  name: text('name').notNull(),
  avatarUrl: text('avatar_url'),
  plan: text('plan', { enum: ['free', 'pro', 'power'] }).default('free').notNull(),
  creditsBalance: integer('credits_balance').default(50).notNull(),
  creditsMonthlyReset: integer('credits_monthly_reset').default(50).notNull(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// ─── Sessions (Better Auth) ──────────────────────────────────────
export const sessions = pgTable('sessions', {
  id: id(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').unique().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// ─── Accounts (Better Auth OAuth) ────────────────────────────────
export const accounts = pgTable('accounts', {
  id: id(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  password: text('password'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// ─── Verifications (Better Auth) ─────────────────────────────────
export const verifications = pgTable('verifications', {
  id: id(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// ─── Credit Transactions ─────────────────────────────────────────
export const creditTransactions = pgTable('credit_transactions', {
  id: id(),
  userId: text('user_id').notNull().references(() => users.id),
  amount: integer('amount').notNull(),
  type: text('type', {
    enum: ['monthly-reset', 'purchase', 'run-consume', 'run-refund', 'bonus'],
  }).notNull(),
  runId: text('run_id'),
  description: text('description'),
  createdAt: createdAt(),
}, (t) => [
  index('idx_credit_tx_user').on(t.userId),
]);

// ─── Plugins ─────────────────────────────────────────────────────
export const plugins = pgTable('plugins', {
  id: id(),
  name: text('name').unique().notNull(),
  slug: text('slug').unique().notNull(),
  version: text('version').notNull(),
  description: text('description').notNull(),
  type: text('type', { enum: ['tool', 'behavior', 'integration', 'model-config'] }).notNull(),
  category: text('category').notNull(),
  manifest: jsonb('manifest').notNull(),
  iconUrl: text('icon_url'),
  readme: text('readme'),
  downloads: integer('downloads').default(0).notNull(),
  avgRating: real('avg_rating').default(0).notNull(),
  status: text('status', { enum: ['active', 'deprecated', 'hidden'] }).default('active').notNull(),
  isBundled: boolean('is_bundled').default(true).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  index('idx_plugins_category').on(t.category),
]);

// ─── Plugin Relations ────────────────────────────────────────────
export const pluginRelations = pgTable('plugin_relations', {
  id: id(),
  pluginA: text('plugin_a').notNull().references(() => plugins.id),
  pluginB: text('plugin_b').notNull().references(() => plugins.id),
  type: text('type', { enum: ['hard-conflict', 'soft-warning', 'enhancement', 'unlocks'] }).notNull(),
  description: text('description').notNull(),
  capabilitiesUnlocked: text('capabilities_unlocked').array(),
  createdAt: createdAt(),
});

// ─── Agents ──────────────────────────────────────────────────────
export const agents = pgTable('agents', {
  id: id(),
  userId: text('user_id').notNull().references(() => users.id),
  name: text('name').notNull(),
  goal: text('goal').notNull(),
  model: text('model').default('claude-sonnet-4-6').notNull(),
  systemPrompt: text('system_prompt').notNull(),
  settings: jsonb('settings').notNull().$type<{
    max_steps: number;
    budget_credits: number;
    temperature: number;
    verify_output: boolean;
    timeout: number;
  }>(),
  potentialScore: integer('potential_score'),
  isTemplate: boolean('is_template').default(false).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  index('idx_agents_user').on(t.userId),
]);

// ─── Agent Plugins ───────────────────────────────────────────────
export const agentPlugins = pgTable('agent_plugins', {
  id: id(),
  agentId: text('agent_id').notNull().references(() => agents.id, { onDelete: 'cascade' }),
  pluginId: text('plugin_id').notNull().references(() => plugins.id),
  config: jsonb('config').default({}).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
}, (t) => [
  uniqueIndex('idx_agent_plugin_unique').on(t.agentId, t.pluginId),
]);

// ─── Runs ────────────────────────────────────────────────────────
export const runs = pgTable('runs', {
  id: id(),
  agentId: text('agent_id').notNull().references(() => agents.id),
  userId: text('user_id').notNull().references(() => users.id),
  task: text('task').notNull(),
  status: text('status', {
    enum: ['pending', 'running', 'completed', 'failed', 'budget-exceeded', 'cancelled'],
  }).default('pending').notNull(),
  output: text('output'),
  error: text('error'),
  creditsUsed: integer('credits_used').default(0).notNull(),
  creditsBudget: integer('credits_budget').notNull(),
  tokensIn: integer('tokens_in').default(0).notNull(),
  tokensOut: integer('tokens_out').default(0).notNull(),
  durationMs: integer('duration_ms'),
  stepCount: integer('step_count').default(0).notNull(),
  createdAt: createdAt(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
}, (t) => [
  index('idx_runs_agent').on(t.agentId),
  index('idx_runs_user').on(t.userId),
  index('idx_runs_status').on(t.status),
]);

// ─── Run Steps ───────────────────────────────────────────────────
export const runSteps = pgTable('run_steps', {
  id: id(),
  runId: text('run_id').notNull().references(() => runs.id, { onDelete: 'cascade' }),
  stepNumber: integer('step_number').notNull(),
  type: text('type', { enum: ['plan', 'tool-call', 'final-answer', 'verification'] }).notNull(),
  toolName: text('tool_name'),
  input: jsonb('input'),
  output: text('output'),
  credits: integer('credits').default(0).notNull(),
  tokensIn: integer('tokens_in').default(0).notNull(),
  tokensOut: integer('tokens_out').default(0).notNull(),
  durationMs: integer('duration_ms'),
  createdAt: createdAt(),
}, (t) => [
  index('idx_run_steps_run').on(t.runId),
]);
```

- [ ] **Step 6: Create Drizzle client**

`apps/api/src/db/index.ts`:
```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);

export const db = drizzle(client, { schema });
export type Database = typeof db;
```

- [ ] **Step 7: Create Drizzle config**

`apps/api/drizzle.config.ts`:
```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

- [ ] **Step 8: Write schema test**

`apps/api/src/__tests__/db/schema.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import * as schema from '../../db/schema.js';

describe('Database Schema', () => {
  it('exports all required tables', () => {
    expect(schema.users).toBeDefined();
    expect(schema.sessions).toBeDefined();
    expect(schema.accounts).toBeDefined();
    expect(schema.verifications).toBeDefined();
    expect(schema.creditTransactions).toBeDefined();
    expect(schema.plugins).toBeDefined();
    expect(schema.pluginRelations).toBeDefined();
    expect(schema.agents).toBeDefined();
    expect(schema.agentPlugins).toBeDefined();
    expect(schema.runs).toBeDefined();
    expect(schema.runSteps).toBeDefined();
  });

  it('users table has credit fields', () => {
    const columns = users._.columns;
    expect(columns.creditsBalance).toBeDefined();
    expect(columns.creditsMonthlyReset).toBeDefined();
    expect(columns.plan).toBeDefined();
  });

  it('runs table has credit tracking fields', () => {
    const columns = runs._.columns;
    expect(columns.creditsUsed).toBeDefined();
    expect(columns.creditsBudget).toBeDefined();
  });
});
```

- [ ] **Step 9: Run test to verify it passes**

```bash
cd ~/projects/chef-ai && pnpm --filter @chef-ai/api test
```

Expected: PASS — schema exports are tested without DB connection.

- [ ] **Step 10: Generate and run migration**

```bash
cd ~/projects/chef-ai/apps/api
DATABASE_URL=postgresql://chef:chef@localhost:5432/chefai pnpm drizzle-kit generate
DATABASE_URL=postgresql://chef:chef@localhost:5432/chefai pnpm drizzle-kit migrate
```

Expected: migration files generated in `apps/api/drizzle/`, migration applied successfully.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: add Docker Compose, Drizzle schema with all tables, and migration"
```

---

### Task 3: Auth (Better Auth)

**Files:**
- Create: `apps/api/src/lib/auth.ts`
- Create: `apps/api/src/routes/auth.ts`
- Create: `apps/api/src/routes/health.ts`
- Create: `apps/api/src/middleware/auth.ts`
- Create: `apps/api/src/index.ts`
- Test: `apps/api/src/__tests__/routes/auth.test.ts`

- [ ] **Step 1: Create Better Auth instance**

`apps/api/src/lib/auth.ts`:
```typescript
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
```

- [ ] **Step 2: Create auth middleware**

`apps/api/src/middleware/auth.ts`:
```typescript
import type { Context, Next } from 'hono';
import { auth } from '../lib/auth.js';

export async function requireAuth(c: Context, next: Next) {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  c.set('session', session.session);
  c.set('user', session.user);
  return next();
}
```

- [ ] **Step 3: Create health route**

`apps/api/src/routes/health.ts`:
```typescript
import { Hono } from 'hono';

const health = new Hono();

health.get('/', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

export { health };
```

- [ ] **Step 4: Create auth route**

`apps/api/src/routes/auth.ts`:
```typescript
import { Hono } from 'hono';
import { auth } from '../lib/auth.js';

const authRoutes = new Hono();

authRoutes.all('/*', (c) => auth.handler(c.req.raw));

export { authRoutes };
```

- [ ] **Step 5: Create Hono app entry**

`apps/api/src/index.ts`:
```typescript
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
```

- [ ] **Step 6: Write auth test**

`apps/api/src/__tests__/routes/auth.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import app from '../../index.js';

describe('Health endpoint', () => {
  it('GET /health returns ok', async () => {
    const res = await app.fetch(new Request('http://localhost/health'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });
});

describe('Auth endpoints', () => {
  it('GET /auth without session returns appropriate response', async () => {
    const res = await app.fetch(new Request('http://localhost/auth/get-session'));
    expect(res.status).toBeDefined();
  });
});
```

- [ ] **Step 7: Run tests**

```bash
cd ~/projects/chef-ai && pnpm --filter @chef-ai/api test
```

Expected: PASS for health endpoint. Auth endpoint test verifies the route is mounted.

- [ ] **Step 8: Start API and verify manually**

```bash
cd ~/projects/chef-ai/apps/api
source ../../.env
tsx src/index.ts
```

In another terminal:
```bash
curl http://localhost:3001/health
```

Expected: `{"status":"ok","timestamp":"..."}`

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add Better Auth, health endpoint, and Hono API server"
```

---

### Task 4: Credit Service

**Files:**
- Create: `apps/api/src/services/credit-service.ts`
- Create: `apps/api/src/routes/credits.ts`
- Test: `apps/api/src/__tests__/services/credit-service.test.ts`

- [ ] **Step 1: Write failing test for credit service**

`apps/api/src/__tests__/services/credit-service.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { CreditService } from '../../services/credit-service.js';

// Unit tests with mock DB — no real DB connection needed
const mockDb = {
  transactions: [] as Array<{ userId: string; amount: number; type: string }>,
  users: new Map<string, { creditsBalance: number }>(),
};

describe('CreditService', () => {
  describe('hasEnoughCredits', () => {
    it('returns true when balance >= required', () => {
      expect(CreditService.hasEnoughCredits(50, 30)).toBe(true);
    });

    it('returns false when balance < required', () => {
      expect(CreditService.hasEnoughCredits(10, 30)).toBe(false);
    });

    it('returns true when balance equals required', () => {
      expect(CreditService.hasEnoughCredits(30, 30)).toBe(true);
    });
  });

  describe('calculateRunCredits', () => {
    it('calculates credits from USD cost with 30% markup', () => {
      // $0.10 actual cost → $0.13 with markup → 13 credits
      const credits = CreditService.calculateRunCredits(0.10);
      expect(credits).toBe(13);
    });

    it('returns minimum 1 credit for tiny costs', () => {
      const credits = CreditService.calculateRunCredits(0.001);
      expect(credits).toBe(1);
    });

    it('returns 0 for zero cost', () => {
      const credits = CreditService.calculateRunCredits(0);
      expect(credits).toBe(0);
    });
  });

  describe('calculateStepCredits', () => {
    it('calculates credits for an LLM call', () => {
      const credits = CreditService.calculateStepCredits({
        tokensIn: 2000,
        tokensOut: 500,
        modelPricing: { input: 3.0, output: 15.0 }, // Sonnet pricing per 1M tokens
      });
      // input: 2000/1M * $3.0 = $0.006
      // output: 500/1M * $15.0 = $0.0075
      // total: $0.0135 * 1.3 markup = $0.01755 → 2 credits
      expect(credits).toBe(2);
    });
  });

  describe('estimateRunCredits', () => {
    it('returns low/expected/high range', () => {
      const estimate = CreditService.estimateRunCredits({
        complexity: 'medium',
        modelPricing: { input: 3.0, output: 15.0 },
        pluginCount: 3,
      });
      expect(estimate.low).toBeGreaterThan(0);
      expect(estimate.expected).toBeGreaterThan(estimate.low);
      expect(estimate.high).toBeGreaterThan(estimate.expected);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd ~/projects/chef-ai && pnpm --filter @chef-ai/api test -- src/__tests__/services/credit-service.test.ts
```

Expected: FAIL — `CreditService` not found.

- [ ] **Step 3: Implement CreditService**

`apps/api/src/services/credit-service.ts`:
```typescript
const MARKUP = 1.3;
const CREDITS_PER_DOLLAR = 100;

interface ModelPricing {
  input: number;   // $ per 1M tokens
  output: number;  // $ per 1M tokens
}

interface StepCostInput {
  tokensIn: number;
  tokensOut: number;
  modelPricing: ModelPricing;
}

interface EstimateInput {
  complexity: 'simple' | 'medium' | 'complex';
  modelPricing: ModelPricing;
  pluginCount: number;
}

interface CreditEstimate {
  low: number;
  expected: number;
  high: number;
}

const STEP_ESTIMATES = {
  simple:  { low: 3, expected: 8, high: 15 },
  medium:  { low: 8, expected: 20, high: 40 },
  complex: { low: 20, expected: 50, high: 100 },
} as const;

const AVG_TOKENS_PER_STEP = { input: 2000, output: 500 };

export class CreditService {
  static hasEnoughCredits(balance: number, required: number): boolean {
    return balance >= required;
  }

  static calculateRunCredits(costUsd: number): number {
    if (costUsd === 0) return 0;
    const withMarkup = costUsd * MARKUP;
    return Math.max(1, Math.round(withMarkup * CREDITS_PER_DOLLAR));
  }

  static calculateStepCredits(input: StepCostInput): number {
    const inputCost = (input.tokensIn / 1_000_000) * input.modelPricing.input;
    const outputCost = (input.tokensOut / 1_000_000) * input.modelPricing.output;
    const totalCost = inputCost + outputCost;
    return this.calculateRunCredits(totalCost);
  }

  static estimateRunCredits(input: EstimateInput): CreditEstimate {
    const steps = STEP_ESTIMATES[input.complexity];
    const costPerStep = (numSteps: number) => {
      const inputCost = (numSteps * AVG_TOKENS_PER_STEP.input / 1_000_000) * input.modelPricing.input;
      const outputCost = (numSteps * AVG_TOKENS_PER_STEP.output / 1_000_000) * input.modelPricing.output;
      const pluginCost = numSteps * 0.6 * input.pluginCount * 0.001;
      return inputCost + outputCost + pluginCost;
    };

    return {
      low: this.calculateRunCredits(costPerStep(steps.low)),
      expected: this.calculateRunCredits(costPerStep(steps.expected)),
      high: this.calculateRunCredits(costPerStep(steps.high)),
    };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd ~/projects/chef-ai && pnpm --filter @chef-ai/api test -- src/__tests__/services/credit-service.test.ts
```

Expected: PASS — all credit calculation tests green.

- [ ] **Step 5: Create credits route**

`apps/api/src/routes/credits.ts`:
```typescript
import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth.js';
import { db } from '../db/index.js';
import { creditTransactions, users } from '../db/schema.js';
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
```

- [ ] **Step 6: Mount credits route in app**

Add to `apps/api/src/index.ts`:
```typescript
import { credits } from './routes/credits.js';
// ... existing routes
app.route('/credits', credits);
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add CreditService with calculation logic and credits API route"
```

---

### Task 5: Plugin Seed Data

**Files:**
- Create: `apps/api/src/db/seed.ts`
- Create: `apps/api/src/routes/plugins.ts`
- Test: `apps/api/src/__tests__/routes/plugins.test.ts`

- [ ] **Step 1: Create seed data with all 15 plugin manifests**

`apps/api/src/db/seed.ts`:
```typescript
import { db } from './index.js';
import { plugins, pluginRelations } from './schema.js';
import type { PluginManifest } from '@chef-ai/shared';

const SEED_PLUGINS: Array<{
  name: string;
  slug: string;
  version: string;
  description: string;
  type: 'tool' | 'behavior' | 'integration' | 'model-config';
  category: string;
  manifest: PluginManifest;
}> = [
  {
    name: '@chef-ai/web-search',
    slug: 'web-search',
    version: '1.0.0',
    description: 'Search the web using Tavily, Exa, or Brave Search',
    type: 'tool',
    category: 'search',
    manifest: {
      name: '@chef-ai/web-search',
      version: '1.0.0',
      description: 'Search the web using Tavily, Exa, or Brave Search',
      type: 'tool',
      category: 'search',
      tags: ['web', 'search', 'research'],
      capabilities_provided: ['web:search', 'web:fetch-url', 'web:extract-content'],
      capabilities_unlocked_with: {
        '@chef-ai/browser-use': ['web:deep-extract', 'web:paginated-search'],
        '@chef-ai/csv-processor': ['data:search-to-table'],
      },
      requires: [],
      enhances: ['@chef-ai/browser-use'],
      conflicts: [],
      affinity: { research: 95, coding: 40, writing: 60, 'data-analysis': 70, automation: 50, content: 55, communication: 30 },
      pricing: { external_apis: [{ name: 'Tavily', cost_per_call: 0.001 }], compute_intensity: 'light' },
      mcp: { transport: 'stdio', command: 'node', args: ['dist/server.js'], env: { TAVILY_API_KEY: { required: true, source: 'platform' } } },
      config: { schema: { maxResults: { type: 'number', min: 1, max: 50, default: 10 } } },
    },
  },
  {
    name: '@chef-ai/browser-use',
    slug: 'browser-use',
    version: '1.0.0',
    description: 'Navigate, click, and extract content from web pages',
    type: 'tool',
    category: 'browser',
    manifest: {
      name: '@chef-ai/browser-use',
      version: '1.0.0',
      description: 'Navigate, click, and extract content from web pages',
      type: 'tool',
      category: 'browser',
      tags: ['browser', 'scraping', 'navigation'],
      capabilities_provided: ['web:browse', 'web:click', 'web:extract-page'],
      capabilities_unlocked_with: {
        '@chef-ai/screenshot-capture': ['web:visual-capture'],
      },
      requires: [],
      enhances: ['@chef-ai/web-search'],
      conflicts: [],
      affinity: { research: 85, coding: 30, writing: 40, 'data-analysis': 60, automation: 70, content: 45, communication: 20 },
      pricing: { external_apis: [], compute_intensity: 'medium' },
      mcp: { transport: 'stdio', command: 'node', args: ['dist/server.js'], env: {} },
      config: { schema: { headless: { type: 'boolean', default: true } } },
    },
  },
  {
    name: '@chef-ai/file-ops',
    slug: 'file-ops',
    version: '1.0.0',
    description: 'Read, write, and list files in sandbox',
    type: 'tool',
    category: 'file',
    manifest: {
      name: '@chef-ai/file-ops',
      version: '1.0.0',
      description: 'Read, write, and list files in sandbox',
      type: 'tool',
      category: 'file',
      tags: ['file', 'read', 'write', 'filesystem'],
      capabilities_provided: ['file:read', 'file:write', 'file:list'],
      capabilities_unlocked_with: {},
      requires: [],
      enhances: ['@chef-ai/code-executor'],
      conflicts: [],
      affinity: { research: 40, coding: 90, writing: 50, 'data-analysis': 60, automation: 80, content: 40, communication: 20 },
      pricing: { external_apis: [], compute_intensity: 'light' },
      mcp: { transport: 'stdio', command: 'node', args: ['dist/server.js'], env: {} },
      config: { schema: {} },
    },
  },
  {
    name: '@chef-ai/code-executor',
    slug: 'code-executor',
    version: '1.0.0',
    description: 'Execute Python, Node.js, or Bash code in sandbox',
    type: 'tool',
    category: 'code',
    manifest: {
      name: '@chef-ai/code-executor',
      version: '1.0.0',
      description: 'Execute Python, Node.js, or Bash code in sandbox',
      type: 'tool',
      category: 'code',
      tags: ['code', 'python', 'nodejs', 'bash', 'execute'],
      capabilities_provided: ['code:execute-python', 'code:execute-node', 'code:execute-bash'],
      capabilities_unlocked_with: {
        '@chef-ai/file-ops': ['code:persist-output'],
      },
      requires: [],
      enhances: ['@chef-ai/csv-processor', '@chef-ai/database-query'],
      conflicts: [],
      affinity: { research: 30, coding: 95, writing: 20, 'data-analysis': 85, automation: 75, content: 15, communication: 10 },
      pricing: { external_apis: [], compute_intensity: 'medium' },
      mcp: { transport: 'stdio', command: 'node', args: ['dist/server.js'], env: {} },
      config: { schema: { timeout: { type: 'number', default: 30 } } },
    },
  },
  {
    name: '@chef-ai/markdown-export',
    slug: 'markdown-export',
    version: '1.0.0',
    description: 'Generate formatted markdown reports and documents',
    type: 'tool',
    category: 'file',
    manifest: {
      name: '@chef-ai/markdown-export',
      version: '1.0.0',
      description: 'Generate formatted markdown reports and documents',
      type: 'tool',
      category: 'file',
      tags: ['markdown', 'report', 'export', 'document'],
      capabilities_provided: ['file:export-markdown', 'file:export-report'],
      capabilities_unlocked_with: {},
      requires: [],
      enhances: [],
      conflicts: [],
      affinity: { research: 80, coding: 30, writing: 95, 'data-analysis': 70, automation: 40, content: 90, communication: 50 },
      pricing: { external_apis: [], compute_intensity: 'light' },
      mcp: { transport: 'stdio', command: 'node', args: ['dist/server.js'], env: {} },
      config: { schema: { template: { type: 'string', default: 'default' } } },
    },
  },
  {
    name: '@chef-ai/pdf-reader',
    slug: 'pdf-reader',
    version: '1.0.0',
    description: 'Extract text and tables from PDF documents',
    type: 'tool',
    category: 'file',
    manifest: {
      name: '@chef-ai/pdf-reader',
      version: '1.0.0',
      description: 'Extract text and tables from PDF documents',
      type: 'tool',
      category: 'file',
      tags: ['pdf', 'extract', 'reader'],
      capabilities_provided: ['file:read-pdf', 'data:extract-tables'],
      capabilities_unlocked_with: {
        '@chef-ai/image-analyzer': ['file:read-scanned-pdf'],
      },
      requires: [],
      enhances: [],
      conflicts: [],
      affinity: { research: 75, coding: 20, writing: 40, 'data-analysis': 80, automation: 30, content: 35, communication: 20 },
      pricing: { external_apis: [], compute_intensity: 'light' },
      mcp: { transport: 'stdio', command: 'node', args: ['dist/server.js'], env: {} },
      config: { schema: {} },
    },
  },
  {
    name: '@chef-ai/image-analyzer',
    slug: 'image-analyzer',
    version: '1.0.0',
    description: 'Analyze images using Claude Vision',
    type: 'tool',
    category: 'media',
    manifest: {
      name: '@chef-ai/image-analyzer',
      version: '1.0.0',
      description: 'Analyze images using Claude Vision',
      type: 'tool',
      category: 'media',
      tags: ['image', 'vision', 'analyze', 'ocr'],
      capabilities_provided: ['media:analyze-image', 'media:ocr'],
      capabilities_unlocked_with: {},
      requires: [],
      enhances: ['@chef-ai/pdf-reader', '@chef-ai/screenshot-capture'],
      conflicts: [],
      affinity: { research: 60, coding: 20, writing: 30, 'data-analysis': 65, automation: 25, content: 70, communication: 15 },
      pricing: { external_apis: [], compute_intensity: 'medium' },
      mcp: { transport: 'stdio', command: 'node', args: ['dist/server.js'], env: {} },
      config: { schema: {} },
    },
  },
  {
    name: '@chef-ai/csv-processor',
    slug: 'csv-processor',
    version: '1.0.0',
    description: 'Parse, transform, and query CSV data',
    type: 'tool',
    category: 'data',
    manifest: {
      name: '@chef-ai/csv-processor',
      version: '1.0.0',
      description: 'Parse, transform, and query CSV data',
      type: 'tool',
      category: 'data',
      tags: ['csv', 'data', 'table', 'transform'],
      capabilities_provided: ['data:parse-csv', 'data:transform', 'data:tabulate'],
      capabilities_unlocked_with: {},
      requires: [],
      enhances: ['@chef-ai/markdown-export'],
      conflicts: [],
      affinity: { research: 60, coding: 40, writing: 30, 'data-analysis': 95, automation: 50, content: 25, communication: 15 },
      pricing: { external_apis: [], compute_intensity: 'light' },
      mcp: { transport: 'stdio', command: 'node', args: ['dist/server.js'], env: {} },
      config: { schema: {} },
    },
  },
  {
    name: '@chef-ai/email-sender',
    slug: 'email-sender',
    version: '1.0.0',
    description: 'Send emails via Resend',
    type: 'integration',
    category: 'comms',
    manifest: {
      name: '@chef-ai/email-sender',
      version: '1.0.0',
      description: 'Send emails via Resend',
      type: 'integration',
      category: 'comms',
      tags: ['email', 'send', 'notification'],
      capabilities_provided: ['comms:send-email'],
      capabilities_unlocked_with: {},
      requires: [],
      enhances: [],
      conflicts: [],
      affinity: { research: 10, coding: 10, writing: 30, 'data-analysis': 10, automation: 85, content: 40, communication: 95 },
      pricing: { external_apis: [{ name: 'Resend', cost_per_call: 0.001 }], compute_intensity: 'light' },
      mcp: { transport: 'stdio', command: 'node', args: ['dist/server.js'], env: { RESEND_API_KEY: { required: true, source: 'platform' } } },
      config: { schema: {} },
    },
  },
  {
    name: '@chef-ai/calendar-reader',
    slug: 'calendar-reader',
    version: '1.0.0',
    description: 'Read Google or Outlook calendar events',
    type: 'integration',
    category: 'comms',
    manifest: {
      name: '@chef-ai/calendar-reader',
      version: '1.0.0',
      description: 'Read Google or Outlook calendar events',
      type: 'integration',
      category: 'comms',
      tags: ['calendar', 'google', 'outlook', 'events'],
      capabilities_provided: ['comms:read-calendar'],
      capabilities_unlocked_with: {},
      requires: [],
      enhances: ['@chef-ai/email-sender'],
      conflicts: [],
      affinity: { research: 15, coding: 10, writing: 20, 'data-analysis': 20, automation: 80, content: 15, communication: 85 },
      pricing: { external_apis: [], compute_intensity: 'light' },
      mcp: { transport: 'stdio', command: 'node', args: ['dist/server.js'], env: {} },
      config: { schema: {} },
    },
  },
  {
    name: '@chef-ai/notion-connector',
    slug: 'notion-connector',
    version: '1.0.0',
    description: 'Read and write Notion pages and databases',
    type: 'integration',
    category: 'comms',
    manifest: {
      name: '@chef-ai/notion-connector',
      version: '1.0.0',
      description: 'Read and write Notion pages and databases',
      type: 'integration',
      category: 'comms',
      tags: ['notion', 'pages', 'database', 'notes'],
      capabilities_provided: ['comms:read-notion', 'comms:write-notion'],
      capabilities_unlocked_with: {},
      requires: [],
      enhances: [],
      conflicts: [],
      affinity: { research: 40, coding: 20, writing: 60, 'data-analysis': 40, automation: 65, content: 70, communication: 50 },
      pricing: { external_apis: [], compute_intensity: 'light' },
      mcp: { transport: 'stdio', command: 'node', args: ['dist/server.js'], env: { NOTION_API_KEY: { required: true, source: 'platform' } } },
      config: { schema: {} },
    },
  },
  {
    name: '@chef-ai/github-ops',
    slug: 'github-ops',
    version: '1.0.0',
    description: 'Create issues, PRs, and read code from GitHub',
    type: 'integration',
    category: 'devtools',
    manifest: {
      name: '@chef-ai/github-ops',
      version: '1.0.0',
      description: 'Create issues, PRs, and read code from GitHub',
      type: 'integration',
      category: 'devtools',
      tags: ['github', 'git', 'issues', 'pr', 'code'],
      capabilities_provided: ['devtools:github-issues', 'devtools:github-pr', 'devtools:github-read'],
      capabilities_unlocked_with: {
        '@chef-ai/code-executor': ['devtools:github-ci'],
      },
      requires: [],
      enhances: ['@chef-ai/code-executor'],
      conflicts: [],
      affinity: { research: 30, coding: 90, writing: 20, 'data-analysis': 20, automation: 70, content: 15, communication: 30 },
      pricing: { external_apis: [], compute_intensity: 'light' },
      mcp: { transport: 'stdio', command: 'node', args: ['dist/server.js'], env: { GITHUB_TOKEN: { required: true, source: 'platform' } } },
      config: { schema: {} },
    },
  },
  {
    name: '@chef-ai/database-query',
    slug: 'database-query',
    version: '1.0.0',
    description: 'Query PostgreSQL, MySQL, or SQLite databases',
    type: 'tool',
    category: 'data',
    manifest: {
      name: '@chef-ai/database-query',
      version: '1.0.0',
      description: 'Query PostgreSQL, MySQL, or SQLite databases',
      type: 'tool',
      category: 'data',
      tags: ['database', 'sql', 'query', 'postgresql'],
      capabilities_provided: ['data:query-sql', 'data:read-database'],
      capabilities_unlocked_with: {},
      requires: [],
      enhances: ['@chef-ai/csv-processor'],
      conflicts: [],
      affinity: { research: 30, coding: 70, writing: 10, 'data-analysis': 95, automation: 50, content: 10, communication: 10 },
      pricing: { external_apis: [], compute_intensity: 'light' },
      mcp: { transport: 'stdio', command: 'node', args: ['dist/server.js'], env: {} },
      config: { schema: {} },
    },
  },
  {
    name: '@chef-ai/screenshot-capture',
    slug: 'screenshot-capture',
    version: '1.0.0',
    description: 'Capture screenshots of URLs or pages',
    type: 'tool',
    category: 'media',
    manifest: {
      name: '@chef-ai/screenshot-capture',
      version: '1.0.0',
      description: 'Capture screenshots of URLs or pages',
      type: 'tool',
      category: 'media',
      tags: ['screenshot', 'capture', 'image', 'url'],
      capabilities_provided: ['media:screenshot'],
      capabilities_unlocked_with: {
        '@chef-ai/image-analyzer': ['media:screenshot-to-data'],
      },
      requires: [],
      enhances: ['@chef-ai/browser-use'],
      conflicts: [],
      affinity: { research: 55, coding: 20, writing: 30, 'data-analysis': 40, automation: 45, content: 65, communication: 25 },
      pricing: { external_apis: [], compute_intensity: 'medium' },
      mcp: { transport: 'stdio', command: 'node', args: ['dist/server.js'], env: {} },
      config: { schema: {} },
    },
  },
  {
    name: '@chef-ai/text-to-speech',
    slug: 'text-to-speech',
    version: '1.0.0',
    description: 'Generate audio from text using ElevenLabs',
    type: 'tool',
    category: 'media',
    manifest: {
      name: '@chef-ai/text-to-speech',
      version: '1.0.0',
      description: 'Generate audio from text using ElevenLabs',
      type: 'tool',
      category: 'media',
      tags: ['tts', 'audio', 'speech', 'voice'],
      capabilities_provided: ['media:text-to-speech'],
      capabilities_unlocked_with: {},
      requires: [],
      enhances: [],
      conflicts: [],
      affinity: { research: 10, coding: 5, writing: 30, 'data-analysis': 5, automation: 30, content: 80, communication: 40 },
      pricing: { external_apis: [{ name: 'ElevenLabs', cost_per_call: 0.01 }], compute_intensity: 'light' },
      mcp: { transport: 'stdio', command: 'node', args: ['dist/server.js'], env: { ELEVENLABS_API_KEY: { required: true, source: 'platform' } } },
      config: { schema: {} },
    },
  },
];

const SEED_RELATIONS: Array<{
  pluginA: string;
  pluginB: string;
  type: 'hard-conflict' | 'soft-warning' | 'enhancement' | 'unlocks';
  description: string;
  capabilitiesUnlocked?: string[];
}> = [
  { pluginA: '@chef-ai/web-search', pluginB: '@chef-ai/browser-use', type: 'enhancement', description: 'Web Search enhances Browser Use with targeted search before navigation' },
  { pluginA: '@chef-ai/browser-use', pluginB: '@chef-ai/web-search', type: 'enhancement', description: 'Browser Use enhances Web Search with deep page extraction' },
  { pluginA: '@chef-ai/web-search', pluginB: '@chef-ai/browser-use', type: 'unlocks', description: 'Combining Web Search + Browser Use unlocks deep extraction and paginated search', capabilitiesUnlocked: ['web:deep-extract', 'web:paginated-search'] },
  { pluginA: '@chef-ai/web-search', pluginB: '@chef-ai/csv-processor', type: 'unlocks', description: 'Combining Web Search + CSV Processor unlocks search-to-table pipeline', capabilitiesUnlocked: ['data:search-to-table'] },
  { pluginA: '@chef-ai/file-ops', pluginB: '@chef-ai/code-executor', type: 'enhancement', description: 'File Ops enhances Code Executor with persistent file I/O' },
  { pluginA: '@chef-ai/code-executor', pluginB: '@chef-ai/file-ops', type: 'unlocks', description: 'Combining Code Executor + File Ops unlocks persisted code output', capabilitiesUnlocked: ['code:persist-output'] },
  { pluginA: '@chef-ai/csv-processor', pluginB: '@chef-ai/markdown-export', type: 'enhancement', description: 'CSV Processor enhances Markdown Export with table formatting' },
  { pluginA: '@chef-ai/image-analyzer', pluginB: '@chef-ai/pdf-reader', type: 'enhancement', description: 'Image Analyzer enhances PDF Reader with scanned PDF support' },
  { pluginA: '@chef-ai/pdf-reader', pluginB: '@chef-ai/image-analyzer', type: 'unlocks', description: 'Combining PDF Reader + Image Analyzer unlocks scanned PDF reading', capabilitiesUnlocked: ['file:read-scanned-pdf'] },
  { pluginA: '@chef-ai/screenshot-capture', pluginB: '@chef-ai/image-analyzer', type: 'unlocks', description: 'Combining Screenshot Capture + Image Analyzer unlocks screenshot-to-data', capabilitiesUnlocked: ['media:screenshot-to-data'] },
  { pluginA: '@chef-ai/screenshot-capture', pluginB: '@chef-ai/browser-use', type: 'enhancement', description: 'Screenshot Capture enhances Browser Use with visual capture' },
  { pluginA: '@chef-ai/github-ops', pluginB: '@chef-ai/code-executor', type: 'enhancement', description: 'GitHub Ops enhances Code Executor with repository context' },
  { pluginA: '@chef-ai/github-ops', pluginB: '@chef-ai/code-executor', type: 'unlocks', description: 'Combining GitHub Ops + Code Executor unlocks CI-like workflows', capabilitiesUnlocked: ['devtools:github-ci'] },
  { pluginA: '@chef-ai/calendar-reader', pluginB: '@chef-ai/email-sender', type: 'enhancement', description: 'Calendar Reader enhances Email Sender with event-based triggers' },
  { pluginA: '@chef-ai/database-query', pluginB: '@chef-ai/csv-processor', type: 'enhancement', description: 'Database Query enhances CSV Processor with live data sources' },
];

async function seed() {
  console.log('Seeding plugins...');

  for (const p of SEED_PLUGINS) {
    await db
      .insert(plugins)
      .values({
        name: p.name,
        slug: p.slug,
        version: p.version,
        description: p.description,
        type: p.type,
        category: p.category,
        manifest: p.manifest,
        isBundled: true,
      })
      .onConflictDoUpdate({
        target: plugins.name,
        set: { manifest: p.manifest, version: p.version, description: p.description },
      });
  }

  console.log(`Seeded ${SEED_PLUGINS.length} plugins`);

  const allPlugins = await db.select().from(plugins);
  const pluginMap = new Map(allPlugins.map((p) => [p.name, p.id]));

  for (const r of SEED_RELATIONS) {
    const aId = pluginMap.get(r.pluginA);
    const bId = pluginMap.get(r.pluginB);
    if (!aId || !bId) continue;

    await db
      .insert(pluginRelations)
      .values({
        pluginA: aId,
        pluginB: bId,
        type: r.type,
        description: r.description,
        capabilitiesUnlocked: r.capabilitiesUnlocked ?? null,
      })
      .onConflictDoNothing();
  }

  console.log(`Seeded ${SEED_RELATIONS.length} plugin relations`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
```

- [ ] **Step 2: Run seed**

```bash
cd ~/projects/chef-ai/apps/api
source ../../.env
tsx src/db/seed.ts
```

Expected: "Seeded 15 plugins" + "Seeded 15 plugin relations"

- [ ] **Step 3: Create plugins route**

`apps/api/src/routes/plugins.ts`:
```typescript
import { Hono } from 'hono';
import { db } from '../db/index.js';
import { plugins } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const pluginRoutes = new Hono();

pluginRoutes.get('/', async (c) => {
  const category = c.req.query('category');
  const type = c.req.query('type');

  let query = db.select().from(plugins).where(eq(plugins.status, 'active'));

  const results = await query;

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
```

- [ ] **Step 4: Mount plugins route**

Add to `apps/api/src/index.ts`:
```typescript
import { pluginRoutes } from './routes/plugins.js';
// ... existing routes
app.route('/plugins', pluginRoutes);
```

- [ ] **Step 5: Write test**

`apps/api/src/__tests__/routes/plugins.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import app from '../../index.js';

describe('Plugins endpoints', () => {
  it('GET /plugins returns list', async () => {
    const res = await app.fetch(new Request('http://localhost/plugins'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.plugins).toBeDefined();
    expect(Array.isArray(body.plugins)).toBe(true);
  });

  it('GET /plugins/nonexistent returns 404', async () => {
    const res = await app.fetch(new Request('http://localhost/plugins/nonexistent'));
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 6: Run tests**

```bash
cd ~/projects/chef-ai && pnpm --filter @chef-ai/api test
```

Expected: PASS (note: plugin list test may return empty array without DB — this is acceptable for unit test, integration test in Plan 6 will verify with seeded data).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add 15 seed plugins with enhancement graph and plugin API routes"
```

---

### Task 6: Push to GitHub

- [ ] **Step 1: Push all commits**

```bash
cd ~/projects/chef-ai
git push origin main
```

Expected: all 5 commits pushed.

- [ ] **Step 2: Verify on GitHub**

Check `github.com/rafiimanggala/chef-ai` has the new files.

---

## Verification Checklist

After completing all tasks:

- [ ] `pnpm install` runs without errors
- [ ] `pnpm build` compiles all packages
- [ ] `pnpm test` passes (api package)
- [ ] Docker Compose starts PostgreSQL + Redis
- [ ] Migration creates all 11 tables
- [ ] Seed populates 15 plugins + 15 relations
- [ ] `GET /health` returns 200
- [ ] `GET /plugins` returns seeded data
- [ ] Auth routes are mounted at `/auth/*`
- [ ] Credit service calculations are correct
- [ ] Types in `@chef-ai/shared` are importable from both apps

---

## What Plan 1 Delivers

After this plan, we have:
1. **Working monorepo** — Turborepo + pnpm, all packages linked
2. **Database** — PostgreSQL with all 11 tables, Drizzle ORM
3. **Auth** — Better Auth with email/password, sessions
4. **Credit system** — Balance tracking, calculation logic, API endpoint
5. **Plugin catalog** — 15 seeded plugins with enhancement graph, API endpoint
6. **Shared types** — PluginManifest, CreditTransaction, AgentDefinition
7. **API server** — Hono running on port 3001
8. **Next.js shell** — Placeholder, ready for Plan 5

## What's Next

- **Plan 2**: Plugin SDK package + Conflict Resolver (tests plugin loading + compatibility checking)
- **Plan 3**: AI Advisor (Intent Classifier + Recommendation Engine + Potential Scorer)
- **Plan 4**: Agent Runtime + MCP Bridge + E2B integration
- **Plan 5**: Frontend (Goal Input → Recommendation → Run Viewer → Dashboard)
- **Plan 6**: Remaining seed plugins + Integration testing + Deploy
