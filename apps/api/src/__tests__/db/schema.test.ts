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
    expect(schema.users.creditsBalance).toBeDefined();
    expect(schema.users.creditsMonthlyReset).toBeDefined();
    expect(schema.users.plan).toBeDefined();
  });

  it('runs table has credit tracking fields', () => {
    expect(schema.runs.creditsUsed).toBeDefined();
    expect(schema.runs.creditsBudget).toBeDefined();
  });
});
