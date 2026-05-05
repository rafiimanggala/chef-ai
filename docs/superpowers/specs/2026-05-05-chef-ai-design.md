# Chef AI — Composable AI Agent Platform

**Date**: 2026-05-05
**Status**: Design — Pending User Review
**Author**: Claude (autonomous, AUTO mode)

---

## 1. Vision

Chef AI is a platform where users "compose" AI agents from curated plugins — like a chef selecting ingredients for a recipe. It fills the gap between Manus AI (autonomous but broken, G2 2.2/5, credit drain) and n8n (powerful but steep learning curve, workflow-first not agent-first).

**One-line pitch**: "Compose your AI agent from curated plugins. No coding. Transparent pricing. It just works."

**Core loop**: User describes goal → platform suggests plugins → user customizes → agent runs → transparent billing

---

## 2. Project Decomposition

Chef AI has 7 independent subsystems. Too large for a single spec. Decomposed into 3 phases:

### Dependency Graph

```
SP0: Foundation (monorepo, DB, auth)
 ├── SP1: Plugin SDK + Format
 │    ├── SP2: Agent Runtime (needs plugins to execute)
 │    │    └── SP3: Web Platform (needs runtime + plugins + auth)
 │    └── SP4: Conflict Resolver (needs plugin manifests)
 │         └── SP5: Plugin Marketplace (needs web + plugins + conflicts)
 └── SP6: Cloud Runtime (needs runtime to host)
      └── SP7: Community/Recipes (needs marketplace + cloud)
```

### Phase Map

| Phase | Sub-projects | Duration | Validates |
|-------|-------------|----------|-----------|
| **1 — MVP** | SP0 + SP1 + SP2 + SP3 | 10-14 wk | "Can composable agents from plugins actually work?" |
| **2 — Marketplace** | SP4 + SP5 | 8-10 wk | "Will developers publish plugins? Will users pay?" |
| **3 — Scale** | SP6 + SP7 | 8-12 wk | "Can we host and monetize at scale?" |

**This spec covers Phase 1 MVP only.** Each subsequent phase gets its own spec after Phase 1 validates the core hypothesis.

---

## 3. Phase 1 MVP — Scope

### What MVP Proves

1. Plugin format works — third-party tools can be packaged and loaded
2. Agent runtime works — multi-step agent execution with composed plugins
3. Builder UI works — non-technical users can compose agents
4. Cost transparency works — users see estimated cost before running

### What MVP Does NOT Include

- Cloud/hosted agent execution (local Docker only)
- Marketplace (no publishing/discovery yet, only bundled plugins)
- Revenue sharing / payments
- Community features (recipes, forums)
- Full conflict resolver (basic compatibility checks only)

---

## 4. Architecture Overview

### Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Monorepo** | Turborepo + pnpm | Fast builds, shared packages, Rafii knows Next.js ecosystem |
| **Frontend** | Next.js 15 (App Router) + Tailwind + shadcn/ui | Production-grade, SSR, great DX |
| **Backend API** | Hono (on Node.js/Bun) | Lightweight, fast, TypeScript-native, runs anywhere |
| **Database** | PostgreSQL 16 + Drizzle ORM | Reliable, pgvector for future search, Drizzle = type-safe |
| **Cache** | Redis 7 | Session store, rate limiting, agent state pub/sub |
| **AI SDK** | Vercel AI SDK 4.x | Multi-model (Claude/GPT/Gemini), streaming, tool use built-in |
| **Plugin Runtime** | MCP (stdio transport) + Docker | Standard protocol, sandboxed execution |
| **Auth** | Better Auth | Open-source, self-hosted, no vendor lock-in |
| **Container** | Docker SDK (dockerode) | Plugin isolation, resource limits |
| **Hosting** | Vercel (frontend) + Railway (API + DB + Redis) | Fast deploy, good free tiers |
| **Testing** | Vitest + Playwright | Unit/integration + E2E |

### Monorepo Structure

```
chef-ai/
├── apps/
│   ├── web/                    # Next.js 15 — Agent Builder UI
│   │   ├── app/
│   │   │   ├── (auth)/         # Login, register
│   │   │   ├── (dashboard)/    # Dashboard, agent list, runs
│   │   │   ├── agents/
│   │   │   │   ├── [id]/       # Agent detail, configure, run
│   │   │   │   └── new/        # Agent builder (compose from plugins)
│   │   │   ├── plugins/        # Plugin browser (bundled plugins)
│   │   │   └── api/            # Next.js API routes (BFF pattern)
│   │   └── components/
│   │       ├── agent-builder/  # Plugin picker, config editor
│   │       ├── plugin-card/    # Plugin display component
│   │       ├── run-viewer/     # Real-time agent execution view
│   │       └── cost-preview/   # Estimated cost display
│   │
│   └── api/                    # Hono API server
│       ├── routes/
│       │   ├── agents.ts       # CRUD agents
│       │   ├── plugins.ts      # List, get plugin info
│       │   ├── runs.ts         # Execute agent, get results
│       │   └── auth.ts         # Auth endpoints
│       ├── services/
│       │   ├── agent-runtime/  # Core execution engine
│       │   ├── plugin-loader/  # Load + validate plugins
│       │   ├── cost-estimator/ # Pre-execution cost preview
│       │   └── conflict-checker/ # Basic compatibility check
│       └── db/
│           ├── schema.ts       # Drizzle schema
│           └── migrations/     # SQL migrations
│
├── packages/
│   ├── plugin-sdk/             # @chef-ai/plugin-sdk — npm package
│   │   ├── src/
│   │   │   ├── types.ts        # Plugin manifest types
│   │   │   ├── create-plugin.ts # Plugin factory function
│   │   │   ├── mcp-adapter.ts  # MCP server wrapper
│   │   │   └── testing.ts      # Plugin test utilities
│   │   └── package.json
│   │
│   ├── shared/                 # @chef-ai/shared
│   │   ├── types/              # Shared TypeScript types
│   │   ├── constants/          # Shared constants
│   │   └── utils/              # Shared utilities
│   │
│   └── agent-core/             # @chef-ai/agent-core
│       ├── src/
│       │   ├── runtime.ts      # Agent execution loop
│       │   ├── planner.ts      # Task decomposition
│       │   ├── executor.ts     # Tool execution
│       │   ├── verifier.ts     # Output verification
│       │   ├── cost-tracker.ts # Real-time cost tracking
│       │   └── models/         # Model adapters (Claude, GPT, Gemini)
│       └── package.json
│
├── plugins/                    # Seed plugins (bundled with MVP)
│   ├── web-search/             # @chef-ai/plugin-web-search
│   ├── browser-use/            # @chef-ai/plugin-browser-use
│   ├── file-ops/               # @chef-ai/plugin-file-ops
│   ├── code-executor/          # @chef-ai/plugin-code-executor
│   ├── markdown-export/        # @chef-ai/plugin-markdown-export
│   ├── pdf-reader/             # @chef-ai/plugin-pdf-reader
│   ├── image-analyzer/         # @chef-ai/plugin-image-analyzer
│   ├── csv-processor/          # @chef-ai/plugin-csv-processor
│   ├── email-sender/           # @chef-ai/plugin-email-sender
│   ├── calendar-reader/        # @chef-ai/plugin-calendar-reader
│   ├── notion-connector/       # @chef-ai/plugin-notion-connector
│   ├── github-ops/             # @chef-ai/plugin-github-ops
│   ├── database-query/         # @chef-ai/plugin-database-query
│   ├── screenshot-capture/     # @chef-ai/plugin-screenshot-capture
│   └── text-to-speech/         # @chef-ai/plugin-text-to-speech
│
├── docker/
│   ├── plugin-sandbox/         # Dockerfile for plugin execution
│   └── docker-compose.yml      # Local dev (PostgreSQL + Redis)
│
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
└── .env.example
```

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (Next.js)                       │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌───────────┐  │
│  │  Agent   │  │  Plugin  │  │    Run    │  │   Cost    │  │
│  │  Builder │  │  Browser │  │   Viewer  │  │  Preview  │  │
│  └────┬─────┘  └────┬─────┘  └─────┬─────┘  └─────┬─────┘  │
│       └──────────────┴──────────────┴──────────────┘        │
│                          │ HTTP/SSE                          │
└──────────────────────────┼──────────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────┐
│                      API (Hono)                              │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌───────────┐  │
│  │  Agent   │  │  Plugin  │  │   Run     │  │   Auth    │  │
│  │  Routes  │  │  Routes  │  │   Routes  │  │  Routes   │  │
│  └────┬─────┘  └────┬─────┘  └─────┬─────┘  └───────────┘  │
│       │              │              │                         │
│  ┌────┴──────────────┴──────────────┴────────────────────┐  │
│  │              SERVICES LAYER                            │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐ │  │
│  │  │   Agent     │  │   Plugin     │  │  Conflict    │ │  │
│  │  │   Runtime   │  │   Loader     │  │  Checker     │ │  │
│  │  └──────┬──────┘  └──────┬───────┘  └──────────────┘ │  │
│  │         │                │                             │  │
│  │  ┌──────┴──────┐  ┌─────┴────────┐  ┌──────────────┐ │  │
│  │  │   Cost      │  │   MCP        │  │   Model      │ │  │
│  │  │   Estimator │  │   Bridge     │  │   Router     │ │  │
│  │  └─────────────┘  └──────┬───────┘  └──────────────┘ │  │
│  └───────────────────────────┼───────────────────────────┘  │
└──────────────────────────────┼──────────────────────────────┘
                               │ stdio/Docker
┌──────────────────────────────┼──────────────────────────────┐
│                    PLUGIN SANDBOX (Docker)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │web-search│  │browser-  │  │file-ops  │  │code-exec │    │
│  │  (MCP)   │  │use (MCP) │  │  (MCP)   │  │  (MCP)   │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
└─────────────────────────────────────────────────────────────┘
                               │
┌──────────────────────────────┼──────────────────────────────┐
│                    DATA LAYER                                │
│  ┌─────────────┐      ┌─────────────┐                       │
│  │  PostgreSQL  │      │    Redis    │                       │
│  │  (agents,    │      │  (sessions, │                       │
│  │   plugins,   │      │   run state,│                       │
│  │   runs)      │      │   pub/sub)  │                       │
│  └─────────────┘      └─────────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Plugin System Design

### 5.1 Plugin Manifest (chef.plugin.json)

Every plugin has a manifest file that declares its capabilities, dependencies, conflicts, and configuration.

```jsonc
{
  // Identity
  "name": "@chef-ai/web-search",
  "version": "1.0.0",
  "description": "Search the web using Tavily, Exa, or Brave Search",
  "author": {
    "name": "Chef AI",
    "email": "plugins@chefai.dev"
  },
  "license": "MIT",
  "homepage": "https://chefai.dev/plugins/web-search",
  
  // Classification
  "type": "tool",           // tool | behavior | integration | model-config
  "category": "search",     // search | browser | file | code | data | comms | media | ai | devtools
  "tags": ["web", "search", "research", "tavily", "exa"],
  
  // Capability declarations (used by conflict resolver)
  "capabilities": [
    "web:search",
    "web:fetch-url",
    "web:extract-content"
  ],
  
  // Dependency management
  "requires": [],                          // plugins that MUST also be installed
  "enhances": ["@chef-ai/browser-use"],    // plugins that benefit from this one
  "conflicts": ["@chef-ai/offline-mode"],  // plugins that CANNOT coexist
  
  // Agent type affinity (0-100, used for smart suggestions)
  "affinity": {
    "research": 95,
    "coding": 40,
    "writing": 60,
    "data-analysis": 70,
    "automation": 50
  },
  
  // Cost model
  "pricing": {
    "model": "per-use",     // free | per-use | flat-monthly
    "estimatedCostPerUse": 0.002,
    "costFactors": ["api-calls-to-tavily", "result-count"]
  },
  
  // Runtime configuration (user-customizable)
  "config": {
    "schema": {
      "provider": {
        "type": "enum",
        "values": ["tavily", "exa", "brave"],
        "default": "tavily",
        "description": "Search provider to use"
      },
      "maxResults": {
        "type": "number",
        "min": 1,
        "max": 50,
        "default": 10,
        "description": "Maximum results per search"
      },
      "includeRawContent": {
        "type": "boolean",
        "default": false,
        "description": "Include full page content in results"
      }
    }
  },
  
  // MCP server specification
  "mcp": {
    "transport": "stdio",
    "command": "node",
    "args": ["dist/server.js"],
    "env": {
      "TAVILY_API_KEY": { "required": true, "source": "user-secret" },
      "EXA_API_KEY": { "required": false, "source": "user-secret" }
    }
  },
  
  // Plugin metadata
  "icon": "./assets/icon.svg",
  "screenshots": ["./assets/screenshot-1.png"],
  "readme": "./README.md"
}
```

### 5.2 Plugin Types

| Type | Purpose | Example |
|------|---------|---------|
| **tool** | Adds executable tools to the agent | web-search, file-ops, code-executor |
| **behavior** | Modifies agent behavior via system prompt injection | "always-verify", "step-by-step", "concise-output" |
| **integration** | Connects to external services | notion-connector, github-ops, slack-bot |
| **model-config** | Overrides model settings | "use-claude-opus", "low-temperature", "long-context" |

### 5.3 Plugin SDK

The SDK provides a factory function for creating plugins:

```typescript
// packages/plugin-sdk/src/create-plugin.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

interface PluginDefinition {
  manifest: PluginManifest;
  tools: ToolDefinition[];
  resources?: ResourceDefinition[];
  prompts?: PromptDefinition[];
  setup?: (config: Record<string, unknown>) => Promise<void>;
  teardown?: () => Promise<void>;
}

function createPlugin(definition: PluginDefinition): McpServer {
  const server = new McpServer({
    name: definition.manifest.name,
    version: definition.manifest.version,
  });

  for (const tool of definition.tools) {
    server.tool(tool.name, tool.description, tool.schema, tool.handler);
  }

  if (definition.resources) {
    for (const resource of definition.resources) {
      server.resource(resource.name, resource.uri, resource.handler);
    }
  }

  return server;
}
```

### 5.4 Example Plugin Implementation

```typescript
// plugins/web-search/src/server.ts
import { createPlugin } from '@chef-ai/plugin-sdk';
import { z } from 'zod';

const plugin = createPlugin({
  manifest: require('../chef.plugin.json'),
  
  tools: [
    {
      name: 'search_web',
      description: 'Search the web for information on any topic',
      schema: {
        query: z.string().describe('Search query'),
        maxResults: z.number().optional().default(10),
        provider: z.enum(['tavily', 'exa', 'brave']).optional(),
      },
      handler: async ({ query, maxResults, provider }, config) => {
        const selectedProvider = provider || config.provider || 'tavily';
        
        switch (selectedProvider) {
          case 'tavily':
            return await searchTavily(query, maxResults);
          case 'exa':
            return await searchExa(query, maxResults);
          case 'brave':
            return await searchBrave(query, maxResults);
        }
      },
    },
    {
      name: 'fetch_url',
      description: 'Fetch and extract content from a URL',
      schema: {
        url: z.string().url().describe('URL to fetch'),
        format: z.enum(['markdown', 'text', 'html']).optional().default('markdown'),
      },
      handler: async ({ url, format }) => {
        const content = await fetchAndExtract(url);
        return formatContent(content, format);
      },
    },
  ],
});

plugin.start();
```

### 5.5 Plugin Lifecycle

```
Install → Validate Manifest → Check Conflicts → Load Config → Start MCP Server → Ready
                                    ↓ (conflict found)
                              Show Warning → User Resolves → Continue
```

1. **Install**: Download plugin package (npm registry or Chef AI registry)
2. **Validate**: Parse chef.plugin.json, verify required fields, check version compatibility
3. **Conflict Check**: Compare capabilities with already-installed plugins
4. **Config**: Merge default config with user overrides, resolve env vars / secrets
5. **Start**: Spawn MCP server process (stdio transport)
6. **Ready**: Plugin tools available to agent runtime

---

## 6. Agent Runtime Design

### 6.1 Agent Definition

```jsonc
{
  "id": "ag_abc123",
  "name": "Deep Research Agent",
  "description": "Researches any topic across multiple sources and produces a structured report",
  "model": "claude-sonnet-4-6",
  "systemPrompt": "You are a thorough research agent. For every task:\n1. Break down the research question\n2. Search multiple sources\n3. Cross-reference findings\n4. Produce a structured report with citations",
  "plugins": [
    {
      "name": "@chef-ai/web-search",
      "config": { "provider": "tavily", "maxResults": 20 }
    },
    {
      "name": "@chef-ai/browser-use",
      "config": { "headless": true }
    },
    {
      "name": "@chef-ai/markdown-export",
      "config": { "template": "research-report" }
    }
  ],
  "settings": {
    "maxSteps": 100,
    "maxTokens": 200000,
    "budgetLimit": 2.00,
    "temperature": 0.3,
    "verifyOutput": true,
    "timeout": 600
  }
}
```

### 6.2 Execution Loop

The agent runtime implements an agentic loop (plan → execute → verify):

```
User Task
    │
    ▼
┌─────────────────┐
│   PLAN PHASE    │ ← LLM decomposes task into steps
│   (1 LLM call)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  EXECUTE PHASE  │ ← Loop: pick tool → call → observe
│  (N iterations) │
│                 │   ┌──────────────────────────┐
│  For each step: │   │ 1. LLM selects tool      │
│                 │──▶│ 2. Plugin executes tool   │
│                 │   │ 3. Result fed back to LLM │
│                 │   │ 4. Cost tracked            │
│                 │   │ 5. Budget check            │
│                 │   └──────────────────────────┘
│                 │
│  Stop when:     │
│  - Task complete│
│  - Budget hit   │
│  - Max steps    │
│  - Error        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  VERIFY PHASE   │ ← LLM checks output matches task
│  (1 LLM call)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    RESULT       │ → Structured output + cost report
└─────────────────┘
```

### 6.3 Runtime Implementation (Core)

```typescript
// packages/agent-core/src/runtime.ts

interface AgentRunOptions {
  agent: AgentDefinition;
  task: string;
  onStep?: (step: RunStep) => void;      // Real-time updates (SSE)
  onCostUpdate?: (cost: CostReport) => void;
  signal?: AbortSignal;                    // Cancellation
}

interface RunResult {
  id: string;
  status: 'completed' | 'failed' | 'budget-exceeded' | 'cancelled';
  output: string;
  steps: RunStep[];
  cost: CostReport;
  duration: number;
  tokensUsed: { input: number; output: number };
}

async function runAgent(options: AgentRunOptions): Promise<RunResult> {
  const { agent, task, onStep, onCostUpdate, signal } = options;
  
  // 1. Load and start all plugins
  const plugins = await loadPlugins(agent.plugins);
  const tools = collectTools(plugins);
  
  // 2. Build system prompt (agent prompt + plugin prompts + behavior plugins)
  const systemPrompt = buildSystemPrompt(agent, plugins);
  
  // 3. Initialize model via AI SDK
  const model = getModel(agent.model);
  
  // 4. Initialize cost tracker
  const costTracker = new CostTracker(agent.settings.budgetLimit);
  
  // 5. Execute agentic loop
  const messages: Message[] = [{ role: 'user', content: task }];
  const steps: RunStep[] = [];
  
  while (steps.length < agent.settings.maxSteps) {
    if (signal?.aborted) break;
    if (costTracker.isOverBudget()) break;
    
    // LLM decides next action
    const response = await generateText({
      model,
      system: systemPrompt,
      messages,
      tools,
      temperature: agent.settings.temperature,
      maxTokens: 4096,
    });
    
    costTracker.addLLMCall(response.usage);
    
    // No tool calls = agent is done
    if (!response.toolCalls?.length) {
      steps.push({ type: 'final-answer', content: response.text });
      onStep?.({ type: 'final-answer', content: response.text });
      break;
    }
    
    // Execute tool calls
    for (const toolCall of response.toolCalls) {
      const plugin = findPluginForTool(plugins, toolCall.toolName);
      const result = await executeToolInSandbox(plugin, toolCall);
      
      costTracker.addToolCall(toolCall.toolName, result.cost);
      
      const step: RunStep = {
        type: 'tool-call',
        toolName: toolCall.toolName,
        input: toolCall.args,
        output: result.content,
        cost: result.cost,
        duration: result.duration,
      };
      
      steps.push(step);
      onStep?.(step);
      onCostUpdate?.(costTracker.getReport());
      
      messages.push(
        { role: 'assistant', content: '', toolCalls: [toolCall] },
        { role: 'tool', toolCallId: toolCall.id, content: result.content }
      );
    }
  }
  
  // 6. Verify output (optional)
  let finalOutput = steps.at(-1)?.content || '';
  if (agent.settings.verifyOutput) {
    const verification = await verifyOutput(model, task, finalOutput, steps);
    if (!verification.passed) {
      finalOutput = `[VERIFICATION WARNING]: ${verification.reason}\n\n${finalOutput}`;
    }
  }
  
  // 7. Cleanup plugins
  await shutdownPlugins(plugins);
  
  return {
    id: generateId(),
    status: costTracker.isOverBudget() ? 'budget-exceeded' : 'completed',
    output: finalOutput,
    steps,
    cost: costTracker.getReport(),
    duration: Date.now() - startTime,
    tokensUsed: costTracker.getTotalTokens(),
  };
}
```

### 6.4 Multi-Model Support

```typescript
// packages/agent-core/src/models/index.ts
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';

const MODEL_MAP = {
  'claude-opus-4-6': anthropic('claude-opus-4-6'),
  'claude-sonnet-4-6': anthropic('claude-sonnet-4-6'),
  'claude-haiku-4-5': anthropic('claude-haiku-4-5-20251001'),
  'gpt-4.1': openai('gpt-4.1'),
  'gpt-4.1-mini': openai('gpt-4.1-mini'),
  'gemini-2.5-pro': google('gemini-2.5-pro-preview-05-06'),
  'gemini-2.5-flash': google('gemini-2.5-flash-preview-04-17'),
} as const;

// Cost per 1M tokens (input/output) for budget estimation
const MODEL_PRICING = {
  'claude-opus-4-6':    { input: 15.00, output: 75.00 },
  'claude-sonnet-4-6':  { input: 3.00,  output: 15.00 },
  'claude-haiku-4-5':   { input: 0.80,  output: 4.00 },
  'gpt-4.1':            { input: 2.00,  output: 8.00 },
  'gpt-4.1-mini':       { input: 0.40,  output: 1.60 },
  'gemini-2.5-pro':     { input: 1.25,  output: 10.00 },
  'gemini-2.5-flash':   { input: 0.15,  output: 0.60 },
} as const;
```

### 6.5 Cost Estimation (Pre-Execution Preview)

Before an agent runs, users see an estimated cost range:

```typescript
// packages/agent-core/src/cost-tracker.ts

interface CostEstimate {
  low: number;      // Best case (cache hits, few steps)
  expected: number;  // Average case
  high: number;      // Worst case (max steps, no cache)
  breakdown: {
    llmCost: { low: number; expected: number; high: number };
    pluginCost: { low: number; expected: number; high: number };
  };
}

function estimateCost(agent: AgentDefinition, taskComplexity: 'simple' | 'medium' | 'complex'): CostEstimate {
  const pricing = MODEL_PRICING[agent.model];
  
  const stepEstimates = {
    simple: { low: 3, expected: 8, high: 15 },
    medium: { low: 8, expected: 20, high: 40 },
    complex: { low: 20, expected: 50, high: 100 },
  };
  
  const steps = stepEstimates[taskComplexity];
  const avgTokensPerStep = { input: 2000, output: 500 };
  
  const llmCost = (numSteps: number) => {
    const inputCost = (numSteps * avgTokensPerStep.input * pricing.input) / 1_000_000;
    const outputCost = (numSteps * avgTokensPerStep.output * pricing.output) / 1_000_000;
    return inputCost + outputCost;
  };
  
  const pluginCost = (numSteps: number) => {
    return agent.plugins.reduce((sum, p) => {
      const manifest = getPluginManifest(p.name);
      return sum + (manifest.pricing.estimatedCostPerUse * numSteps * 0.6); // ~60% of steps use tools
    }, 0);
  };
  
  return {
    low: llmCost(steps.low) + pluginCost(steps.low),
    expected: llmCost(steps.expected) + pluginCost(steps.expected),
    high: llmCost(steps.high) + pluginCost(steps.high),
    breakdown: {
      llmCost: { low: llmCost(steps.low), expected: llmCost(steps.expected), high: llmCost(steps.high) },
      pluginCost: { low: pluginCost(steps.low), expected: pluginCost(steps.expected), high: pluginCost(steps.high) },
    },
  };
}
```

---

## 7. Data Model

### 7.1 Database Schema

```sql
-- Users
CREATE TABLE users (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email       TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  avatar_url  TEXT,
  plan        TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  api_keys    JSONB DEFAULT '{}',  -- encrypted model API keys
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Plugins (bundled in MVP, user-published in Phase 2)
CREATE TABLE plugins (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name        TEXT UNIQUE NOT NULL,        -- @chef-ai/web-search
  slug        TEXT UNIQUE NOT NULL,        -- web-search
  version     TEXT NOT NULL,
  description TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('tool', 'behavior', 'integration', 'model-config')),
  category    TEXT NOT NULL,
  manifest    JSONB NOT NULL,              -- full chef.plugin.json
  author_id   TEXT REFERENCES users(id),
  icon_url    TEXT,
  readme      TEXT,
  downloads   INTEGER DEFAULT 0,
  avg_rating  REAL DEFAULT 0,
  status      TEXT DEFAULT 'active' CHECK (status IN ('active', 'deprecated', 'hidden')),
  is_bundled  BOOLEAN DEFAULT false,       -- true for MVP seed plugins
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Plugin compatibility rules (for conflict checker)
CREATE TABLE plugin_conflicts (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  plugin_a    TEXT NOT NULL REFERENCES plugins(id),
  plugin_b    TEXT NOT NULL REFERENCES plugins(id),
  type        TEXT NOT NULL CHECK (type IN ('hard-conflict', 'soft-warning', 'enhancement')),
  description TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(plugin_a, plugin_b)
);

-- Agents (user-created compositions)
CREATE TABLE agents (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id       TEXT NOT NULL REFERENCES users(id),
  name          TEXT NOT NULL,
  description   TEXT,
  model         TEXT NOT NULL DEFAULT 'claude-sonnet-4-6',
  system_prompt TEXT NOT NULL,
  settings      JSONB NOT NULL DEFAULT '{"maxSteps": 50, "budgetLimit": 1.0, "temperature": 0.3, "verifyOutput": true, "timeout": 300}',
  is_public     BOOLEAN DEFAULT false,
  is_template   BOOLEAN DEFAULT false,     -- pre-built agent templates
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Agent-Plugin junction (which plugins are in each agent)
CREATE TABLE agent_plugins (
  id        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  agent_id  TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  plugin_id TEXT NOT NULL REFERENCES plugins(id),
  config    JSONB DEFAULT '{}',            -- user overrides for this plugin
  sort_order INTEGER DEFAULT 0,
  UNIQUE(agent_id, plugin_id)
);

-- Agent runs (execution history)
CREATE TABLE runs (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  agent_id    TEXT NOT NULL REFERENCES agents(id),
  user_id     TEXT NOT NULL REFERENCES users(id),
  task        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'budget-exceeded', 'cancelled')),
  output      TEXT,
  error       TEXT,
  cost_usd    REAL DEFAULT 0,
  tokens_in   INTEGER DEFAULT 0,
  tokens_out  INTEGER DEFAULT 0,
  duration_ms INTEGER,
  step_count  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Individual steps within a run
CREATE TABLE run_steps (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  run_id      TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('plan', 'tool-call', 'final-answer', 'verification')),
  tool_name   TEXT,
  input       JSONB,
  output      TEXT,
  cost_usd    REAL DEFAULT 0,
  tokens_in   INTEGER DEFAULT 0,
  tokens_out  INTEGER DEFAULT 0,
  duration_ms INTEGER,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- User secrets (encrypted API keys for plugins)
CREATE TABLE user_secrets (
  id        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id   TEXT NOT NULL REFERENCES users(id),
  key       TEXT NOT NULL,                -- e.g., TAVILY_API_KEY
  value     TEXT NOT NULL,                -- encrypted
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, key)
);

-- Indexes
CREATE INDEX idx_agents_user ON agents(user_id);
CREATE INDEX idx_runs_agent ON runs(agent_id);
CREATE INDEX idx_runs_user ON runs(user_id);
CREATE INDEX idx_runs_status ON runs(status);
CREATE INDEX idx_run_steps_run ON run_steps(run_id);
CREATE INDEX idx_plugins_category ON plugins(category);
CREATE INDEX idx_plugins_type ON plugins(type);
```

---

## 8. API Design

### 8.1 REST Endpoints

```
Authentication:
POST   /auth/register            Create account
POST   /auth/login               Login
POST   /auth/logout              Logout
GET    /auth/me                  Current user

Plugins:
GET    /plugins                  List all plugins (filterable by category, type)
GET    /plugins/:slug            Get plugin detail
GET    /plugins/:slug/manifest   Get raw manifest

Agents:
GET    /agents                   List user's agents
POST   /agents                   Create agent
GET    /agents/:id               Get agent detail
PUT    /agents/:id               Update agent
DELETE /agents/:id               Delete agent
POST   /agents/:id/clone         Clone an agent

Agent Plugins:
POST   /agents/:id/plugins       Add plugin to agent
DELETE /agents/:id/plugins/:pid  Remove plugin from agent
PUT    /agents/:id/plugins/:pid  Update plugin config

Runs:
POST   /agents/:id/run           Start agent run (returns run ID)
GET    /runs/:id                 Get run result
GET    /runs/:id/stream          SSE stream for real-time updates
POST   /runs/:id/cancel          Cancel running agent
GET    /runs                     List user's run history

Cost:
POST   /agents/:id/estimate      Estimate cost for a task

Conflicts:
POST   /agents/:id/check         Check plugin compatibility

Secrets:
GET    /secrets                  List user's secret keys (names only)
POST   /secrets                  Add/update a secret
DELETE /secrets/:key             Delete a secret
```

### 8.2 Real-Time Updates (SSE)

Agent execution streams events via Server-Sent Events:

```typescript
// Event types
type RunEvent =
  | { type: 'run:started'; runId: string }
  | { type: 'step:planning'; content: string }
  | { type: 'step:tool-call'; toolName: string; input: unknown }
  | { type: 'step:tool-result'; toolName: string; output: string; cost: number }
  | { type: 'step:thinking'; content: string }
  | { type: 'cost:update'; current: number; limit: number; estimate: CostEstimate }
  | { type: 'run:completed'; output: string; cost: CostReport }
  | { type: 'run:failed'; error: string }
  | { type: 'run:cancelled' }
  | { type: 'verification:result'; passed: boolean; reason: string };
```

---

## 9. Web Platform (Agent Builder UI)

### 9.1 Key Pages

| Page | Route | Purpose |
|------|-------|---------|
| Landing | `/` | Product intro, value props, sign up CTA |
| Dashboard | `/dashboard` | Agent list, recent runs, usage stats |
| New Agent | `/agents/new` | Agent builder — the core UX |
| Agent Detail | `/agents/[id]` | Configure, run, view history |
| Run Viewer | `/runs/[id]` | Real-time execution view |
| Plugin Browser | `/plugins` | Browse all available plugins |
| Plugin Detail | `/plugins/[slug]` | Plugin info, reviews, install |
| Settings | `/settings` | API keys, secrets, profile, billing |

### 9.2 Agent Builder Flow (Core UX)

This is the most important page — where users "compose" their agent.

**Step 1: Describe Your Goal**
```
┌──────────────────────────────────────────────────────────┐
│  What do you want your agent to do?                       │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ "Research competitors and produce a comparison table" │ │
│  └──────────────────────────────────────────────────────┘ │
│  [AI suggests plugins based on your goal]                 │
└──────────────────────────────────────────────────────────┘
```

**Step 2: AI Suggests Plugins**
```
┌──────────────────────────────────────────────────────────┐
│  Suggested plugins for "competitor research":             │
│                                                           │
│  ✅ Web Search       — Search multiple providers          │
│  ✅ Browser Use      — Navigate and extract from websites │
│  ✅ CSV Processor    — Create comparison tables           │
│  ✅ Markdown Export  — Format final report                │
│  ☐  Image Analyzer  — Optional: analyze screenshots      │
│                                                           │
│  ⚠️  No conflicts detected                               │
│  💰 Estimated cost: $0.05 - $0.30 per run                │
│                                                           │
│  [Customize] [Add More Plugins] [Continue →]              │
└──────────────────────────────────────────────────────────┘
```

**Step 3: Configure Agent**
```
┌──────────────────────────────────────────────────────────┐
│  Agent Name: [ Competitor Research Agent              ]   │
│  Model:      [ Claude Sonnet 4.6           ▼]            │
│  Max Steps:  [ 50  ]   Budget: [ $1.00 ]                 │
│  Verify Output: [✅]   Temperature: [0.3]                │
│                                                           │
│  System Prompt:                                           │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ You are a thorough competitor research agent.        │ │
│  │ For every task:                                       │ │
│  │ 1. Identify the key competitors                       │ │
│  │ 2. Research each competitor's features and pricing    │ │
│  │ 3. Create a comparison table                          │ │
│  │ 4. Produce a structured report                        │ │
│  └──────────────────────────────────────────────────────┘ │
│  [← Back]  [Save Agent]  [Save & Run →]                  │
└──────────────────────────────────────────────────────────┘
```

**Step 4: Run & Watch**
```
┌──────────────────────────────────────────────────────────┐
│  Running: Competitor Research Agent                        │
│  Task: "Compare Manus AI vs n8n vs Dify for agent..."    │
│                                                           │
│  Steps:                                                   │
│  ✅ 1. Planning research approach              $0.002     │
│  ✅ 2. search_web("Manus AI features 2026")   $0.005     │
│  ✅ 3. fetch_url("manus.ai/pricing")          $0.001     │
│  🔄 4. search_web("n8n AI agent features")    $0.003     │
│  ⏳ 5. ...                                                │
│                                                           │
│  Cost: $0.011 / $1.00 budget                              │
│  ████░░░░░░░░░░░░░░░░ 1.1%                               │
│                                                           │
│  [Cancel Run]                                             │
└──────────────────────────────────────────────────────────┘
```

### 9.3 Plugin Browser

```
┌──────────────────────────────────────────────────────────┐
│  🔍 Search plugins...                                     │
│  [All] [Search] [Browser] [File] [Code] [Data] [Comms]  │
│                                                           │
│  ┌─────────────────────┐  ┌─────────────────────┐        │
│  │ 🔎 Web Search        │  │ 🌐 Browser Use       │        │
│  │ Search via Tavily,   │  │ Navigate, click,    │        │
│  │ Exa, or Brave        │  │ extract from pages  │        │
│  │ ⭐ 4.8 | 1.2K uses   │  │ ⭐ 4.5 | 890 uses   │        │
│  │ [Add to Agent]       │  │ [Add to Agent]      │        │
│  └─────────────────────┘  └─────────────────────┘        │
│                                                           │
│  ┌─────────────────────┐  ┌─────────────────────┐        │
│  │ 📁 File Operations   │  │ 💻 Code Executor     │        │
│  │ Read, write, list   │  │ Run Python, Node,   │        │
│  │ files in sandbox    │  │ Bash in sandbox     │        │
│  │ ⭐ 4.9 | 2.1K uses   │  │ ⭐ 4.7 | 1.5K uses   │        │
│  │ [Add to Agent]       │  │ [Add to Agent]      │        │
│  └─────────────────────┘  └─────────────────────┘        │
└──────────────────────────────────────────────────────────┘
```

### 9.4 Design Reference

Follow `ui-design-protocol.md` rules. Primary reference sites:
- **linear.app** — Agent builder layout, sidebar navigation, dark mode
- **vercel.com** — Dashboard cards, run history table, clean whitespace
- **raycast.com** — Plugin browser, search interaction, card design

Design tokens:
- Primary: slate-900 (dark theme preferred for dev tools)
- Accent: emerald-500 (fresh, "chef/organic" feeling — differentiate from typical blue)
- Font: Inter (body) + JetBrains Mono (code/config)
- Border radius: 8px default
- Spacing: 8px base unit grid

---

## 10. Seed Plugins (MVP)

15 bundled plugins covering common agent use cases:

| # | Plugin | Type | Category | What It Does |
|---|--------|------|----------|-------------|
| 1 | web-search | tool | search | Search via Tavily/Exa/Brave |
| 2 | browser-use | tool | browser | Navigate, click, extract from web pages |
| 3 | file-ops | tool | file | Read/write/list files in sandbox |
| 4 | code-executor | tool | code | Execute Python/Node/Bash in sandbox |
| 5 | markdown-export | tool | file | Generate formatted markdown reports |
| 6 | pdf-reader | tool | file | Extract text/tables from PDFs |
| 7 | image-analyzer | tool | media | Analyze images via Claude Vision |
| 8 | csv-processor | tool | data | Parse, transform, query CSV data |
| 9 | email-sender | integration | comms | Send emails via Resend/SendGrid |
| 10 | calendar-reader | integration | comms | Read Google/Outlook calendar |
| 11 | notion-connector | integration | comms | Read/write Notion pages and databases |
| 12 | github-ops | integration | devtools | Create issues, PRs, read code |
| 13 | database-query | tool | data | Query PostgreSQL/MySQL/SQLite |
| 14 | screenshot-capture | tool | media | Capture screenshots of URLs |
| 15 | text-to-speech | tool | media | Generate audio from text |

### Pre-Built Agent Templates (using seed plugins)

| Template | Plugins Used | Target User |
|----------|-------------|-------------|
| Research Agent | web-search + browser-use + markdown-export | Researchers, analysts |
| Content Writer | web-search + image-analyzer + markdown-export | Content creators |
| Code Assistant | code-executor + github-ops + file-ops | Developers |
| Data Analyst | csv-processor + database-query + markdown-export | Data analysts |
| Email Automator | web-search + email-sender + calendar-reader | Business users |
| Social Monitor | web-search + browser-use + csv-processor | Marketing teams |

---

## 11. Conflict Checker (Simplified for MVP)

Full conflict resolver is Phase 2. MVP has basic compatibility checking:

### 11.1 Conflict Types

| Type | Severity | Example |
|------|----------|---------|
| **hard-conflict** | BLOCK | offline-mode + web-search (contradictory) |
| **soft-warning** | WARN | two search plugins (redundant) |
| **enhancement** | INFO | browser-use enhances web-search |

### 11.2 Check Algorithm (MVP)

```typescript
interface ConflictCheckResult {
  compatible: boolean;
  conflicts: Array<{
    pluginA: string;
    pluginB: string;
    type: 'hard-conflict' | 'soft-warning' | 'enhancement';
    description: string;
  }>;
  score: number; // 0-100 compatibility score
}

function checkCompatibility(plugins: PluginManifest[]): ConflictCheckResult {
  const conflicts = [];
  
  for (let i = 0; i < plugins.length; i++) {
    for (let j = i + 1; j < plugins.length; j++) {
      const a = plugins[i];
      const b = plugins[j];
      
      // 1. Explicit conflicts
      if (a.conflicts?.includes(b.name) || b.conflicts?.includes(a.name)) {
        conflicts.push({
          pluginA: a.name,
          pluginB: b.name,
          type: 'hard-conflict',
          description: `${a.name} explicitly conflicts with ${b.name}`,
        });
      }
      
      // 2. Capability overlap
      const overlap = a.capabilities.filter(c => b.capabilities.includes(c));
      if (overlap.length > 0) {
        conflicts.push({
          pluginA: a.name,
          pluginB: b.name,
          type: 'soft-warning',
          description: `Both provide: ${overlap.join(', ')}. May cause redundant tool calls.`,
        });
      }
      
      // 3. Enhancement detection
      if (a.enhances?.includes(b.name) || b.enhances?.includes(a.name)) {
        conflicts.push({
          pluginA: a.name,
          pluginB: b.name,
          type: 'enhancement',
          description: `${a.name} enhances ${b.name}`,
        });
      }
    }
  }
  
  const hardConflicts = conflicts.filter(c => c.type === 'hard-conflict').length;
  const softConflicts = conflicts.filter(c => c.type === 'soft-warning').length;
  const enhancements = conflicts.filter(c => c.type === 'enhancement').length;
  
  const score = Math.max(0, 100 - (hardConflicts * 50) - (softConflicts * 10) + (enhancements * 5));
  
  return {
    compatible: hardConflicts === 0,
    conflicts,
    score: Math.min(100, score),
  };
}
```

---

## 12. Security Considerations

| Concern | Mitigation |
|---------|-----------|
| Plugin code execution | Docker sandbox with resource limits (CPU, memory, network) |
| User API keys | Encrypted at rest (AES-256-GCM), never logged, never sent to plugins directly |
| Plugin access to secrets | Secrets injected as env vars into sandbox, plugin declares which it needs |
| Malicious plugins | MVP: only bundled plugins. Phase 2: review process before marketplace listing |
| Agent budget overrun | Hard budget limit, checked before every LLM call and tool execution |
| Network isolation | Plugin containers on isolated Docker network, no access to host |
| Input validation | Zod schemas on all API inputs, plugin manifest validation |
| Auth | Better Auth with session tokens, CSRF protection |

---

## 13. Testing Strategy

| Layer | Tool | What to Test |
|-------|------|-------------|
| Plugin SDK | Vitest | Manifest validation, plugin creation, MCP adapter |
| Agent Runtime | Vitest | Execution loop, cost tracking, budget enforcement, tool routing |
| Conflict Checker | Vitest | All conflict types, edge cases, score calculation |
| API Routes | Vitest + Supertest | CRUD operations, auth, error handling |
| Frontend | Playwright | Agent builder flow, plugin browser, run viewer |
| Integration | Docker + Vitest | Full agent run with real plugins in sandbox |

### Key Test Scenarios

1. Agent runs to completion with 3 plugins → correct output + cost report
2. Agent hits budget limit → stops gracefully, no charge beyond limit
3. Plugin conflict detected → user warned before agent creation
4. Agent cancellation → all plugins cleaned up, partial cost reported
5. Plugin crashes → agent continues with remaining plugins, error logged
6. Invalid manifest → rejected at plugin load time with clear error

---

## 14. Deployment Plan

### Local Development

```bash
# Prerequisites: Docker, Node.js 22+, pnpm
git clone https://github.com/rafiimanggalajapamel/chef-ai
cd chef-ai
pnpm install
docker compose up -d  # PostgreSQL + Redis
pnpm db:migrate
pnpm dev              # Starts Next.js + Hono + seed plugins
```

### Production

| Service | Platform | Config |
|---------|----------|--------|
| Frontend (Next.js) | Vercel | Auto-deploy from main branch |
| API (Hono) | Railway | Dockerfile, auto-deploy |
| PostgreSQL | Railway | Managed, daily backups |
| Redis | Railway | Managed |
| Plugin Sandbox | Same Railway instance | Docker-in-Docker or Sysbox |

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# Auth
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=https://api.chefai.dev

# AI Models (platform-level keys for cost estimation)
ANTHROPIC_API_KEY=...
OPENAI_API_KEY=...
GOOGLE_GENERATIVE_AI_API_KEY=...

# Email (for auth flows)
RESEND_API_KEY=...

# App
NEXT_PUBLIC_API_URL=https://api.chefai.dev
NEXT_PUBLIC_APP_URL=https://chefai.dev
```

---

## 15. MVP Build Plan

| No | Task | Duration | Dependencies |
|----|------|----------|-------------|
| 1 | Monorepo setup (Turborepo + pnpm + configs) | 1 day | — |
| 2 | Database schema + Drizzle setup + migrations | 2 days | 1 |
| 3 | Auth (Better Auth + sessions) | 2 days | 1, 2 |
| 4 | Plugin SDK package (@chef-ai/plugin-sdk) | 3 days | 1 |
| 5 | Build 5 core seed plugins (search, browser, file, code, markdown) | 5 days | 4 |
| 6 | Agent runtime core (execution loop + cost tracker) | 5 days | 4 |
| 7 | Multi-model support (Vercel AI SDK integration) | 2 days | 6 |
| 8 | MCP bridge (load plugins as MCP servers) | 3 days | 4, 6 |
| 9 | Docker sandbox for plugin execution | 3 days | 8 |
| 10 | API routes (agents CRUD, plugins list, runs) | 3 days | 2, 3, 6 |
| 11 | SSE streaming for real-time run updates | 2 days | 10 |
| 12 | Cost estimation endpoint | 1 day | 6, 10 |
| 13 | Conflict checker (basic) | 2 days | 4 |
| 14 | Frontend: Layout + auth pages | 2 days | 3 |
| 15 | Frontend: Dashboard | 2 days | 10, 14 |
| 16 | Frontend: Plugin browser | 2 days | 10, 14 |
| 17 | Frontend: Agent builder (core UX) | 5 days | 10, 12, 13, 14 |
| 18 | Frontend: Run viewer (real-time) | 3 days | 11, 14 |
| 19 | Build remaining 10 seed plugins | 7 days | 4, 9 |
| 20 | Pre-built agent templates (6 templates) | 2 days | 5, 19 |
| 21 | Integration testing | 3 days | All |
| 22 | E2E testing (Playwright) | 3 days | All |
| 23 | Deploy (Vercel + Railway) | 2 days | All |
| 24 | Landing page | 2 days | 14 |

**Total: ~64 working days (~13 weeks)**

Critical path: 1 → 4 → 6 → 8 → 9 → 10 → 17 → 21 → 23

---

## 16. Success Metrics (MVP)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Agent completion rate | >80% | Runs that complete without error |
| Average cost per run | <$0.50 | Across all agent types |
| Agent builder time | <5 min | Time from "new agent" to first run |
| Plugin load success | >95% | Plugins that start without error |
| Cost estimation accuracy | ±30% | Estimated vs actual cost |
| User satisfaction | >4/5 | Post-run survey (optional) |

---

## 17. Risks and Mitigations

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Docker-in-Docker complexity on Railway | HIGH | Use Sysbox or switch to Fly Machines if blocked |
| Plugin sandbox escape | HIGH | Network isolation, resource limits, read-only filesystem |
| Multi-model API cost during development | MEDIUM | Use cheapest models (Haiku/Flash) for testing, mock for unit tests |
| Scope creep (marketplace features) | MEDIUM | Hard scope boundary — MVP has NO marketplace, only bundled plugins |
| Plugin SDK adoption (Phase 2) | MEDIUM | Ensure SDK is simple enough that creating a plugin takes <30 minutes |
| Solo dev burnout (13 weeks) | HIGH | Parallelize with Agent Teams, maintain daily logs, take breaks |

---

## 18. Open Questions for User Review

1. **Domain name**: chefai.dev? chefagent.com? composai.dev?
2. **Dark vs Light theme default**: Both? Dark-first (dev tool feel)?
3. **Free tier limits**: How many agents? How many runs per month? Budget cap?
4. **Model API keys**: User provides own keys (BYOK) or platform provides?
5. **Open source**: Fully open-source from day 1? Or closed-source MVP, open-source later?
6. **Plugin execution**: Docker mandatory or optional? (Some plugins don't need sandboxing)

---

## Appendix A: Future Phase Outlines

### Phase 2: Marketplace + Conflict Resolver (8-10 weeks)

- Plugin publishing flow (upload, validate, review)
- Marketplace UI (search, filter, featured, trending)
- Full conflict resolver (dependency graph, compatibility scoring, auto-suggestions)
- Ratings and reviews system
- Plugin analytics (downloads, usage, revenue)
- Stripe Connect integration (85/15 revenue split)
- Plugin versioning and update notifications

### Phase 3: Cloud Runtime + Community (8-12 weeks)

- Managed cloud execution (E2B or Fly Machines)
- Agent scheduling (cron-based recurring runs)
- Recipes (pre-built agent + plugin combos, shareable)
- Community forum per plugin
- Recipe marketplace (free + paid)
- Webhook integrations (trigger agents from external events)
- API access (run agents programmatically)
- Enterprise features (SSO, audit logs, team workspaces)

---

## Appendix B: Competitive Landscape (Updated May 2026)

Research agents performed deep web research. Key findings:

### Direct Competitors

| Platform | Status (May 2026) | Threat to Chef AI |
|----------|-------------------|-------------------|
| **Manus AI** | Independent again (Meta $2B acquisition blocked by China Apr 2026). ~100 employees. Free (1K+300/day credits), Pro $20-200/mo. G2 2.2/5 unchanged. Credit drain = #1 complaint. | LOW — broken UX validates our thesis |
| **n8n** | $2.5B valuation, 600+ nodes, 8,300+ templates. Template-based, NOT plugin marketplace with rev share. AI Agent node + 70+ LangChain nodes. | MEDIUM — could add marketplace |
| **Dify.ai** | 100K+ GitHub stars, $180M valuation. Plugin system v1.0 launched. Dify Marketplace live. Enterprise-focused (30+ Fortune 500). | MEDIUM — plugin system growing |
| **CrewAI** | AMP (Agent Management Platform) launched. Visual editor + managed deploy. $99+/mo. No plugin marketplace. | LOW — dev-only, no marketplace |
| **LangGraph** | Platform pricing: seat + usage-based. LangSmith Studio for visual prototyping. Dev-centric. | LOW — wrong audience |
| **OpenAI Codex** | 90+ plugins (MCP-native) since March 2026. Private marketplace for enterprise. Coding-only. | MEDIUM — MCP plugin standard |
| **Flowise** | ACQUIRED by Workday (Aug 2025). Future direction unclear. 30K+ GitHub stars. | LOW — corporate now |
| **Lindy AI** | No-code agent builder. SOC 2 + HIPAA. 98% satisfaction (109 reviews). Agent swarms. | HIGH — closest to our UX target |

### NEW Competitors (Discovered in Research)

| Platform | What | Threat |
|----------|------|--------|
| **Skills.sh** (Vercel-backed, Jan 2026) | npm-style package manager for agent skills. 87K+ unique skills tracked. Works across Claude Code, Codex CLI, Cursor. | HIGH — skills registry already exists |
| **Agensi Pro** | Curated marketplace, security-scanned, creators keep 80% revenue, $9/mo Pro. | HIGH — our exact marketplace model |
| **Composio** | Integration layer for AI agents. 500+ tools, native MCP. OAuth handling, 20+ frameworks. | MEDIUM — tools layer, not builder |
| **Google Agent Marketplace** | Gemini Enterprise Agent Platform. Agent Marketplace launching **Q4 2026**. A2A protocol v1.2 (150 orgs). | CRITICAL — 6-month window |

### Unsolved Industry Problems (Opportunity)

Research confirmed multi-agent coordination is FUNDAMENTALLY UNSOLVED:

| Problem | Data | Chef AI Advantage |
|---------|------|-------------------|
| Token waste | MetaGPT 72% duplication, CAMEL 86%, AgentVerse 53%. 1.5-7x overconsumption. | Dedup layer + shared context between plugins |
| Conflict resolution | Agents with conflicting instructions bounce tasks endlessly. NO platform solves this. | **Conflict Resolver = our unique moat** |
| Autonomy vs coherence | Central tension in all multi-agent systems | Plugin composition = user controls coherence |
| Diagnostics | Failures "incredibly difficult to diagnose" in autonomous agents | Step-by-step run viewer with per-tool cost |

### Revised Positioning

```
         Developer-Only                    Non-Developer Friendly
              │                                    │
 LangGraph ───┤                                    │
 CrewAI ──────┤                                    │
 Composio ────┤                                    │
              │         ┌──────────┐               │
              │         │ Chef AI  │ ◄── SWEET SPOT│
              │         └──────────┘               │
              │    Dify ──┤        ├── Lindy       │
              │           │        │               │
              │    n8n ───┤        ├── Manus       │
              │                                    │
         Full Control                       Black Box
```

Chef AI occupies the "dual-mode" position: visual builder for non-devs, code escape hatch for devs. With the only conflict resolver in the market.

### Window Analysis

- **Skills.sh** covers skill REGISTRY but not agent BUILDER + RUNTIME
- **Agensi Pro** covers marketplace + rev share but not composable agent builder
- **Google Q4 2026** = hard deadline. Must have traction before Google launches.
- **Nobody combines**: builder + marketplace + conflict resolver + transparent pricing

**Action**: MVP must ship within 13 weeks (by ~August 2026) to establish position before Google's Q4 launch.

---

## Appendix C: Marketplace Architecture (From Research)

### Plugin Registry Design (npm-inspired)

Based on npm's 3-layer architecture:

1. **Metadata layer** (PostgreSQL) — plugin manifests, versions, descriptions. Fast reads.
2. **Binary layer** (S3/R2 object storage) — plugin bundles (tarballs). CDN-cached.
3. **Search layer** (pgvector + full-text) — semantic + keyword search.

Separate metadata from binaries = critical for performance at scale.

### Semantic Discovery (Phase 2)

```sql
-- pgvector HNSW index for plugin discovery
CREATE EXTENSION vector;

ALTER TABLE plugins ADD COLUMN description_embedding vector(768);

CREATE INDEX idx_plugins_embedding 
  ON plugins USING hnsw (description_embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 200);

-- Hybrid search: 50% semantic + 20% keyword + 20% popularity + 10% rating
```

Embedding model: **Nomic Embed v2** (free, self-hosted, 768d, best quality/size ratio for short text matching).

### Payment Architecture (Phase 2)

Stripe Connect with Express accounts + Destination Charges:

```
POST /v1/payment_intents
  amount: 2900            // $29.00 plugin subscription
  application_fee_amount: 435  // $4.35 (15% platform fee)
  transfer_data[destination]: "acct_SELLER123"
```

Platform net after Stripe fees: ~12% (15% fee - ~3% Stripe processing).

### Quality Gates (Phase 2)

| Gate | Type | Check |
|------|------|-------|
| G1: Schema | Automated | Manifest validates against JSON schema |
| G2: Build | Automated | Plugin builds, passes lint |
| G3: Sandbox | Automated | Runs without crashes in sandbox |
| G4: Permissions | Automated | Declared permissions match actual usage |
| G5: Performance | Automated | Execution time < threshold, memory < limit |
| G6: Security | Automated | No hardcoded secrets, no unauthorized network |
| G7: Compatibility | Automated | Works with declared platform version |
| G8: Content | Manual | Description matches functionality |

### Cold Start Strategy (Refined)

Based on Figma (5-phase) + Hugging Face + Shopify patterns:

| Phase | Strategy | Timeline |
|-------|----------|----------|
| 1 | Single-player mode — platform valuable without marketplace | MVP (wk 1-13) |
| 2 | Seed 15-20 first-party plugins covering core use cases | MVP (wk 1-13) |
| 3 | Auto-wrap popular MCP servers + n8n nodes as Chef AI plugins | Phase 2 (wk 14-24) |
| 4 | Open marketplace with 85/15 rev share incentive | Phase 2 (wk 14-24) |
| 5 | Niche community first (AI sales agents) then expand | Phase 3 (wk 25+) |

---

## Appendix D: Research Sources

### Competitive Research (May 2026)
- Manus: CNBC (Meta acquisition blocked), eesel AI (pricing), G2 reviews, Lindy comparison
- n8n: ConnectSafely (pricing), n8n.io (AI agents), StartupOwl (review 2026)
- Dify: GitHub (100K+ stars), AWS Lambda case study, v1.0 plugin ecosystem blog
- CrewAI: VisionStack (review), CostBench (pricing), dasroot (MCP integration)
- LangGraph: langchain.com (platform pricing), ZenML (pricing guide)
- OpenAI Codex: openai.com (announcement), Tosea (guide 2026)
- Flowise: Voiceflow (Workday acquisition), aiagentshub (comparison)
- Skills.sh: agensi.io (marketplace comparison)
- Agensi Pro: agensi.io (learn pages)
- Composio: composio.dev, agensi.io (alternatives)
- Google: TNW (Cloud Next 2026), Google Cloud blog (Enterprise Agent Platform)
- Multi-agent problems: Cogent (failure playbook), Cognitive Corp, Codebridge

### Marketplace Architecture Research
- npm: registry docs, new registry architecture blog, package metadata format
- VS Code: extension anatomy, manifest, activation events, contribution points
- Stripe Connect: destination charges docs, marketplace guide
- Cold start: First Round Review (Figma phases), platform chronicles
- Quality gates: Chrome Web Store review, Shopify app review, Figma guidelines
- Semantic search: pgvector guide, Supabase vector database, MTEB benchmarks
- Embeddings: Nomic Embed v2, OpenAI text-embedding-3, Voyage AI

---

## Appendix E: Runtime Architecture (From Research)

### MCP as Plugin Wire Format — Validated

MCP is the correct foundation for Chef AI plugins. Key findings:

- **20,000+ MCP servers** on mcp.so, GitHub MCP Registry, Smithery (7,000+)
- JSON-RPC 2.0 with 3 primitives: Tools (executable), Resources (read-only), Prompts (templates)
- Transport: stdio (local) or Streamable HTTP (remote/cloud)
- `@ai-sdk/mcp` stable in Vercel AI SDK 6 — native MCP consumption
- CrewAI has `MCPServerAdapter` for direct integration

**Gaps MCP doesn't solve** (Chef AI must add):
- No dependency resolution between servers
- No versioning scheme (Server Cards coming 2026 but not shipped)
- No conflict resolution for overlapping tool names
- Auth story still maturing (DPoP, Workload Identity = proposals)

**Decision**: MCP as wire format + Chef AI manifest layer for versioning, dependencies, conflicts.

### AI SDK 6 — Multi-Model Runtime

AI SDK 6 (Dec 2025) key features for Chef AI:

1. **Gateway pattern**: Provider routing with fallback chain
2. **Tool policy**: Auto/requires-approval per tool (maps to plugin permissions)
3. **ToolLoopAgent**: Defines agent once (model + instructions + tools), reuses
4. **Native MCP**: `@ai-sdk/mcp` for consuming MCP servers as tool sources
5. **Provider-agnostic**: `anthropic/claude-sonnet-4-6`, `openai/gpt-4.1`, `google/gemini-2.5-pro`

```typescript
// AI SDK 6 gateway fallback
const result = streamText({
  model: 'anthropic/claude-sonnet-4-6',
  providerOptions: {
    gateway: {
      order: ['anthropic'],
      models: ['openai/gpt-4.1', 'google/gemini-2.5-flash'], // fallback
    },
  },
});
```

### E2B Sandbox Details

- Firecracker microVMs (full OS isolation, not container)
- Cold start: 80-150ms (vs Docker seconds)
- Pricing: $150/mo Pro, per-second billing, paused = free
- Manus uses E2B as full virtual computer per session (27 tools)
- ~$16,800/yr for 200 concurrent sandboxes

**Alternatives**: Modal (GPU), Fly Sprites (persistent), Daytona ($24M Series A Feb 2026), Docker (cheapest, self-hosted)

**Decision**: Docker for MVP (Phase 1), E2B for cloud execution (Phase 3)

### Orchestration Pattern Comparison

| Framework | Token Efficiency | State Management | MCP Support | Best For |
|-----------|-----------------|------------------|-------------|----------|
| LangGraph | ~2,000 tok/task | TypedDict + checkpointing | Manual | Deterministic workflows |
| CrewAI | ~3,500 tok/task | Role-based | MCPServerAdapter | Rapid prototyping |
| AutoGen | ~8,000 tok/task | Manual tracking | Manual | Conversational refinement |
| **AI SDK 6** | ~2,000 tok/task | Custom (flexible) | `@ai-sdk/mcp` native | **Multi-model + MCP** |

**Decision**: AI SDK 6 for the runtime (TypeScript, multi-model, native MCP, tool policies). LangGraph-inspired state management pattern (TypedDict → Zod schemas, checkpointing → Redis).

### Plugin Dependency Resolution — Novel

A Technical Disclosure exists for "Skill Instruction File Dependency Resolution and Version Pinning for AI Agent Runtimes" (tdcommons.org/dpubs_series/9912). Key concepts:

1. Semver-style version constraints (like npm)
2. Inter-skill `requires` declarations form dependency graph
3. Resolver computes consistent version assignment
4. Structured conflict report for incompatible requirements
5. Sidecar lockfile for reproducibility

**Unique challenges for AI plugins** (beyond npm):
- Capability conflicts: two plugins exposing same-named tools
- Context window budget: more plugins = more tool descriptions = higher token cost
- Runtime conflicts: Plugin A needs Python 3.11, Plugin B needs 3.9
- Auth scope conflicts: overlapping OAuth permissions

**No existing project solves this** — Chef AI's conflict resolver = genuine innovation.

---

## Appendix F: Key Architecture Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Plugin format | MCP + Chef manifest | Industry standard wire format + custom registry layer |
| AI runtime | Vercel AI SDK 6 | Multi-model, native MCP, TypeScript, tool policies |
| Sandbox (MVP) | Docker | Free, self-hosted, adequate for Phase 1 |
| Sandbox (Scale) | E2B | 80ms cold start, proven by Manus, per-second billing |
| State management | Zod schemas + Redis | LangGraph-inspired but TypeScript-native |
| Dependency resolution | Custom npm-inspired | No existing solution for AI capability conflicts |
| Database | PostgreSQL + Drizzle | Reliable, pgvector for future search, type-safe ORM |
| Frontend | Next.js 15 + shadcn/ui | Production-grade, great DX, Rafii's stack |
| Monorepo | Turborepo + pnpm | Fast builds, strict dependencies (no phantom deps) |
| Auth | Better Auth | Open-source, self-hosted, no vendor lock-in |
| Payments (Phase 2) | Stripe Connect Express | Destination charges, application_fee_amount for 85/15 |
| Search (Phase 2) | pgvector + Nomic Embed v2 | Free embeddings, HNSW index, hybrid search |
| Model pricing source | Vercel AI SDK pricing + manual override | Up-to-date, covers all major models |
