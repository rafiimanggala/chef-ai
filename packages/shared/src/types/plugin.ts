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
