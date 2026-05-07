import { pgTable, text, integer, boolean, real, timestamp, jsonb, uniqueIndex, index } from 'drizzle-orm/pg-core';

const id = () => text('id').primaryKey().$defaultFn(() => crypto.randomUUID());
const createdAt = () => timestamp('created_at', { withTimezone: true }).defaultNow().notNull();
const updatedAt = () => timestamp('updated_at', { withTimezone: true }).defaultNow().notNull();

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

export const verifications = pgTable('verifications', {
  id: id(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

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

export const pluginRelations = pgTable('plugin_relations', {
  id: id(),
  pluginA: text('plugin_a').notNull().references(() => plugins.id),
  pluginB: text('plugin_b').notNull().references(() => plugins.id),
  type: text('type', { enum: ['hard-conflict', 'soft-warning', 'enhancement', 'unlocks'] }).notNull(),
  description: text('description').notNull(),
  capabilitiesUnlocked: text('capabilities_unlocked').array(),
  createdAt: createdAt(),
});

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

export const agentPlugins = pgTable('agent_plugins', {
  id: id(),
  agentId: text('agent_id').notNull().references(() => agents.id, { onDelete: 'cascade' }),
  pluginId: text('plugin_id').notNull().references(() => plugins.id),
  config: jsonb('config').default({}).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
}, (t) => [
  uniqueIndex('idx_agent_plugin_unique').on(t.agentId, t.pluginId),
]);

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
