export interface AgentSettings {
  max_steps: number;
  budget_credits: number;
  temperature: number;
  verify_output: boolean;
  timeout: number;
}

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
