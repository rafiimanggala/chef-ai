# Chef AI V2 — Guided Assembly AI Agent Platform

**Date**: 2026-05-08
**Status**: Design — Pending User Review
**Replaces**: `2026-05-05-chef-ai-design.md` (archived)
**Author**: Rafii + Claude (brainstorming session)

---

## 1. Vision

Chef AI is a platform where non-technical users describe what they need, and AI builds the perfect agent for them — the right plugins, zero conflicts, transparent cost.

**One-line pitch**: "Tell us what you need. We'll build your perfect AI agent."

**Positioning**: OpenRouter (proxy + billing) + PCPartPicker (recommendation + compatibility) + agent runtime. Combined into one consumer product.

**Core loop**:
```
User describe goal (natural language)
    → Intent Classifier analyze needs (LLM: Haiku)
    → Recommendation Engine suggest plugin combo (deterministic)
    → Potential Scorer show % + improvement tips (deterministic)
    → Conflict Resolver check compatibility (graph-based)
    → User approve (1-click) or tweak
    → Agent run di cloud (E2B sandbox, zero setup)
    → Real-time progress + per-step credit tracking
    → Result + cost report
```

### Why Not Manus

Manus = "give me your task, I do everything." Black box, credit drain, G2 2.2/5.

Chef AI = "tell me what you need, I build the best agent for you." Transparent, guided, user sees what plugins are used, why they were chosen, how much each step costs, and what could be improved.

### Why Not n8n/Dify

n8n/Dify = developer workflow tools. Steep learning curve, node-based editor, config-heavy.

Chef AI = consumer product. One text input, AI handles the rest. Non-technical user never sees "MCP", "Docker", or "API key".

### Target User

Non-technical users who want AI agent capabilities but don't know:
1. What plugins/tools exist (thousands of MCPs, skills, plugins scattered)
2. Which ones are good (quality varies wildly)
3. Which ones conflict (Plugin A + B = error)
4. Which combos unlock full potential (Plugin A + C = 10x more powerful)

Chef AI closes all 4 gaps.

---

## 2. AI Advisor System (Core Innovation)

The AI Advisor is what makes Chef AI unique. No competitor has this. 3 components:

### 2.1 Intent Classifier

Single LLM call (Haiku/Flash — cheap, fast) that maps natural language to structured intent.

**Input**: user's goal in natural language
**Output**: structured classification

```typescript
interface IntentClassification {
  agent_type: 'research' | 'coding' | 'writing' | 'data-analysis' | 'automation' | 'content' | 'communication';
  capability_needs: string[];      // e.g., ["web:search", "web:browse", "data:tabulate"]
  complexity: 'simple' | 'medium' | 'complex';
  estimated_steps: { low: number; high: number };
  keywords: string[];              // extracted domain keywords for plugin matching
}
```

Example:
```
Input:  "Riset kompetitor fintech di Southeast Asia"
Output: {
  agent_type: "research",
  capability_needs: ["web:search", "web:browse", "web:extract-content", "data:tabulate", "file:export-report"],
  complexity: "medium",
  estimated_steps: { low: 20, high: 40 },
  keywords: ["competitor", "fintech", "southeast asia", "research"]
}
```

### 2.2 Recommendation Engine

Deterministic (no LLM). Takes capability_needs → matches to plugin catalog.

**Scoring formula**:
```
plugin_relevance = affinity[agent_type] × capability_match_ratio × popularity_weight
```

Where:
- `affinity[agent_type]` = plugin's declared affinity score (0-100) for the classified agent type
- `capability_match_ratio` = how many of the user's capability_needs this plugin covers (0-1)
- `popularity_weight` = 0.8 + (0.2 × normalized_usage_rank) — slight boost for well-used plugins

**Output**: ranked plugin list, split into:
- `selected` (top N that cover core needs, auto-checked)
- `suggested` (plugins that would improve score, shown as "unlock more")
- `excluded` (plugins with hard conflicts against selected ones)

```typescript
interface Recommendation {
  selected: PluginWithScore[];     // auto-checked, covers core needs
  suggested: PluginSuggestion[];   // "add this to unlock X%"
  excluded: PluginConflict[];      // can't coexist with selected
  agent_config: {
    model: string;                 // recommended model based on complexity
    system_prompt: string;         // auto-generated from goal + plugins
    max_steps: number;
    budget_credits: number;
  };
}

interface PluginSuggestion {
  plugin: PluginManifest;
  score_delta: number;             // e.g., +7%
  reason: string;                  // "Format hasil riset jadi report terstruktur"
  unlocks: string[];               // new capabilities enabled
}
```

**MVP**: static affinity matrix (manually tuned per plugin). Phase 2: collaborative filtering from real user data ("users with similar goals used these plugins").

### 2.3 Potential Scorer

Deterministic. Calculates overall "agent potential" score 0-100%.

**Formula**:
```
score = coverage_score + synergy_bonus - conflict_penalty

coverage_score = (capabilities_covered / capabilities_needed) × 80
synergy_bonus = enhancement_pairs × 3 + unlocked_capabilities × 2  (max 20)
conflict_penalty = soft_conflicts × 5 + hard_conflicts × 50
```

**Breakdown output**:
```typescript
interface PotentialScore {
  overall: number;                 // 0-100
  breakdown: {
    coverage: number;              // 0-80 (how much of the goal is covered)
    synergy: number;               // 0-20 (enhancement bonuses)
    conflicts: number;             // negative penalties
  };
  improvements: Array<{
    action: 'add' | 'replace' | 'remove';
    plugin: string;
    delta: number;                 // score change if action taken
    reason: string;                // human-readable explanation
    unlocks: string[];             // new capabilities
  }>;
  warnings: Array<{
    type: 'soft-conflict' | 'redundancy' | 'missing-critical';
    description: string;
  }>;
}
```

### Enhancement Graph

Data structure that powers synergy detection and "unlock" suggestions.

Plugins declare `capabilities_unlocked_with` in their manifest:
```json
{
  "capabilities_provided": ["web:search", "web:fetch-url"],
  "capabilities_unlocked_with": {
    "@chef-ai/browser-use": ["web:deep-extract", "web:paginated-search"],
    "@chef-ai/csv-processor": ["data:search-to-table"]
  }
}
```

Scorer traverses this graph to find:
- Active enhancement paths (both plugins present)
- Potential unlocks (add one plugin to unlock new capabilities)
- Redundancies (two plugins providing same capability)

This makes suggestions **explainable**: "Add Browser Use → score +15% because it unlocks deep-extract and paginated-search with Web Search" — not a magic number.

### Data Flow (Complete)

```
User Goal (text)
    │
    ▼
Intent Classifier (LLM: Haiku, ~0.2s, ~0.001 credits)
    │
    ├── agent_type: "research"
    ├── capability_needs: ["web:search", "web:browse", ...]
    └── complexity: "medium"
            │
            ▼
Recommendation Engine (deterministic, <50ms)
    │
    ├── selected: [web-search, browser-use, csv-processor]
    ├── suggested: [markdown-export (+7%), image-analyzer (+5%)]
    └── agent_config: {model, prompt, steps, budget}
            │
            ▼
Potential Scorer (deterministic, <50ms)
    │
    ├── overall: 82%
    ├── breakdown: {coverage: 72, synergy: +10, conflicts: 0}
    └── improvements: [{add markdown-export, +7%}, ...]
            │
            ▼
Conflict Resolver (graph traversal, <50ms)
    │
    ├── hard_conflicts: []
    ├── soft_warnings: []
    └── enhancements: [{web-search enhances browser-use}]
            │
            ▼
UI renders recommendation + score + suggestions
    │
    Total advisor latency: <500ms (1 LLM call + 3 deterministic)
```

Only 1 LLM call in the entire advisor flow. Everything else is deterministic. Fast, predictable, cheap.

---

## 3. Execution Model (Cloud-First)

### 3.1 Zero Setup Execution

Users never install Docker, configure API keys, or manage infrastructure.

```
User klik [Run Agent]
    → API create run record (PostgreSQL)
    → Spawn E2B sandbox (80-150ms cold start)
    → Load selected plugins (MCP servers in sandbox)
    → Inject platform API keys (encrypted env vars)
    → Set resource limits (CPU, RAM, network, timeout)
    → Agent Runtime execute in sandbox
    → SSE stream progress to frontend
    → Cost tracker update per step (credits)
    → Run complete → result stored → sandbox destroyed
    → User sees: output + cost report + step history
```

### 3.2 Why E2B

| Factor | Docker (self-hosted) | E2B |
|--------|---------------------|-----|
| Cold start | 2-5s | 80-150ms |
| Isolation | Container (shared kernel) | Firecracker microVM (full OS) |
| Infra management | Self-managed | Managed |
| Scaling | Manual | Auto-scale |
| Security | Adequate | Superior (VM-level) |
| Cost | Cheaper at low volume | $150/mo Pro, per-second billing |

**Decision**: E2B for production. Docker for local development only.

### 3.3 Credit System

```
1 credit = $0.01

Credit consumption per run:
├── LLM cost (actual provider cost) × 1.3 markup → credits
├── Plugin API cost (actual) × 1.3 markup → credits
└── Sandbox compute (per-second) → credits
```

**Pricing tiers**:

| Plan | Price | Credits | Target |
|------|-------|---------|--------|
| Free | $0 | 50/month | Try it out (1-3 simple runs) |
| Pro | $15/mo | 500/month | Regular user (15-30 runs) |
| Power | $49/mo | 2000/month | Heavy user (60-120 runs) |
| Overage | — | $0.012/credit | 20% premium over base rate |

**Example run costs**:

| Task Type | Credits | Dollar Equivalent |
|-----------|---------|-------------------|
| Simple web research | 10-20 | $0.10-$0.20 |
| Deep competitor analysis | 25-50 | $0.25-$0.50 |
| Data processing (CSV) | 5-15 | $0.05-$0.15 |
| Content generation | 15-30 | $0.15-$0.30 |
| Complex multi-source research | 50-100 | $0.50-$1.00 |

### 3.4 Cost Transparency (Anti-Manus)

Three layers of transparency that Manus doesn't have:

**1. Pre-run estimate**: Before clicking Run, user sees "Estimated: 15-45 credits"

**2. Real-time tracking**: During execution, credit progress bar + per-step cost visible

**3. Hard budget limit**: User sets max credits per run. Agent stops if limit hit. Never surprise billing. Cancel = refund unused credits.

### 3.5 Platform API Keys

Chef AI platform holds API keys for all providers. Users never see or manage API keys.

| Provider | What For |
|----------|----------|
| Anthropic (Claude) | LLM calls |
| OpenAI (GPT) | LLM calls (alternative) |
| Google (Gemini) | LLM calls (alternative) |
| Tavily | Web search plugin |
| Exa | Web search plugin (alternative) |
| Resend | Email sender plugin |

Keys injected into E2B sandbox as encrypted environment variables. Per-user rate limiting to prevent abuse. Keys never exposed to user or plugin code.

Revenue model: platform buys API access → sells to users via credits with 30% markup.

---

## 4. Plugin System

### 4.1 What's Preserved from V1

- Plugin manifest format (`chef.plugin.json`)
- Plugin types: tool, behavior, integration, model-config
- Plugin SDK (`@chef-ai/plugin-sdk`)
- MCP as wire format (stdio transport)
- Capability declarations
- `requires` / `enhances` / `conflicts` fields
- 15 seed plugins

### 4.2 What Changed

**Manifest additions**:

```jsonc
{
  "name": "@chef-ai/web-search",
  "version": "1.0.0",
  "description": "Search the web using Tavily, Exa, or Brave Search",

  "type": "tool",
  "category": "search",
  "tags": ["web", "search", "research"],

  // Capabilities — EXPANDED for recommendation engine
  "capabilities_provided": [
    "web:search",
    "web:fetch-url",
    "web:extract-content"
  ],
  // NEW: cross-plugin capability unlocks
  "capabilities_unlocked_with": {
    "@chef-ai/browser-use": ["web:deep-extract", "web:paginated-search"],
    "@chef-ai/csv-processor": ["data:search-to-table"]
  },

  // Compatibility (unchanged)
  "requires": [],
  "enhances": ["@chef-ai/browser-use"],
  "conflicts": ["@chef-ai/offline-mode"],

  // Affinity (unchanged)
  "affinity": {
    "research": 95,
    "coding": 40,
    "writing": 60,
    "data-analysis": 70,
    "automation": 50
  },

  // Pricing — CHANGED: platform-managed, declare external costs only
  "pricing": {
    "external_apis": [
      { "name": "Tavily", "cost_per_call": 0.001 }
    ],
    "compute_intensity": "light"    // light | medium | heavy
  },

  // MCP — CHANGED: env source is "platform" not "user-secret"
  "mcp": {
    "transport": "stdio",
    "command": "node",
    "args": ["dist/server.js"],
    "env": {
      "TAVILY_API_KEY": { "required": true, "source": "platform" }
    }
  },

  // Config — user-customizable via "Customize" panel (unchanged)
  "config": {
    "schema": {
      "maxResults": { "type": "number", "min": 1, "max": 50, "default": 10 }
    }
  }
}
```

Key changes:
- `capabilities_unlocked_with`: powers enhancement graph + potential scorer
- `pricing.external_apis`: platform calculates total credit cost
- `env.source: "platform"`: platform provides keys, not user

### 4.3 Plugin Types (Unchanged)

| Type | Purpose | Example |
|------|---------|---------|
| **tool** | Adds executable tools to the agent | web-search, file-ops, code-executor |
| **behavior** | Modifies agent behavior via system prompt | "always-verify", "step-by-step", "concise-output" |
| **integration** | Connects to external services | notion-connector, github-ops, slack-bot |
| **model-config** | Overrides model settings | "use-claude-opus", "low-temperature", "long-context" |

### 4.4 Plugin SDK (Unchanged)

```typescript
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
      },
      handler: async ({ query, maxResults }, config) => {
        return await searchTavily(query, maxResults);
      },
    },
  ],
});

plugin.start();
```

### 4.5 Plugin Lifecycle (Updated for Cloud)

```
V1: Install → Validate → Conflict Check → Load Config → Start MCP → Ready
V2: User adds plugin → Validate Manifest → Conflict Check → Ready (no install needed)
    At run time: Spawn sandbox → Load plugins in sandbox → Inject keys → Start MCP → Execute
```

Users don't "install" plugins. They select them. Plugins are loaded into the cloud sandbox only when an agent runs.

### 4.6 Seed Plugins (15, Unchanged)

| # | Plugin | Type | Category |
|---|--------|------|----------|
| 1 | web-search | tool | search |
| 2 | browser-use | tool | browser |
| 3 | file-ops | tool | file |
| 4 | code-executor | tool | code |
| 5 | markdown-export | tool | file |
| 6 | pdf-reader | tool | file |
| 7 | image-analyzer | tool | media |
| 8 | csv-processor | tool | data |
| 9 | email-sender | integration | comms |
| 10 | calendar-reader | integration | comms |
| 11 | notion-connector | integration | comms |
| 12 | github-ops | integration | devtools |
| 13 | database-query | tool | data |
| 14 | screenshot-capture | tool | media |
| 15 | text-to-speech | tool | media |

---

## 5. Agent Runtime

### 5.1 Agent Definition (Simplified)

Users don't manually create this. The AI Advisor generates it from the goal + recommended plugins.

```jsonc
{
  "id": "ag_abc123",
  "name": "Fintech Competitor Research",    // auto-generated from goal
  "goal": "Riset kompetitor fintech di Southeast Asia",
  "model": "claude-sonnet-4-6",            // AI-recommended based on complexity
  "system_prompt": "...",                    // auto-generated from goal + plugins
  "plugins": [
    { "name": "@chef-ai/web-search", "config": { "maxResults": 20 } },
    { "name": "@chef-ai/browser-use", "config": { "headless": true } },
    { "name": "@chef-ai/csv-processor", "config": {} }
  ],
  "settings": {
    "max_steps": 50,
    "budget_credits": 45,                   // user's credit limit for this run
    "temperature": 0.3,
    "verify_output": true,
    "timeout": 300
  }
}
```

### 5.2 Execution Loop (Unchanged from V1, runs in E2B)

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
│                 │   │ 4. Credits tracked         │
│                 │   │ 5. Budget check            │
│                 │   └──────────────────────────┘
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
│    RESULT       │ → Output + credit report + step history
└─────────────────┘
```

### 5.3 Multi-Model Support (Updated pricing)

```typescript
const MODEL_MAP = {
  'claude-opus-4-6': anthropic('claude-opus-4-6'),
  'claude-sonnet-4-6': anthropic('claude-sonnet-4-6'),
  'claude-haiku-4-5': anthropic('claude-haiku-4-5-20251001'),
  'gpt-4.1': openai('gpt-4.1'),
  'gpt-4.1-mini': openai('gpt-4.1-mini'),
  'gemini-2.5-pro': google('gemini-2.5-pro-preview-05-06'),
  'gemini-2.5-flash': google('gemini-2.5-flash-preview-04-17'),
} as const;

const MODEL_PRICING = {  // per 1M tokens
  'claude-opus-4-6':    { input: 15.00, output: 75.00 },
  'claude-sonnet-4-6':  { input: 3.00,  output: 15.00 },
  'claude-haiku-4-5':   { input: 0.80,  output: 4.00 },
  'gpt-4.1':            { input: 2.00,  output: 8.00 },
  'gpt-4.1-mini':       { input: 0.40,  output: 1.60 },
  'gemini-2.5-pro':     { input: 1.25,  output: 10.00 },
  'gemini-2.5-flash':   { input: 0.15,  output: 0.60 },
} as const;

// AI Advisor auto-selects model based on complexity:
// simple → gemini-2.5-flash (cheapest), medium → claude-sonnet-4-6, complex → claude-opus-4-6
// User can override in "Customize" panel
```

### 5.4 Cost Tracking (Credits)

```typescript
interface CreditTracker {
  budget: number;           // user's credit limit for this run
  consumed: number;         // credits used so far
  breakdown: {
    llm: number;            // LLM call credits
    plugins: number;        // plugin API credits
    compute: number;        // sandbox compute credits
  };
  steps: Array<{
    step_number: number;
    tool_name: string;
    credits: number;
  }>;
}

// Conversion: actual_cost_usd × 1.3 markup × 100 = credits
// Example: $0.003 LLM call → $0.003 × 1.3 × 100 = 0.39 → rounds to 1 credit minimum
```

---

## 6. Web Platform UX

### 6.1 Page Structure

| Page | Route | Purpose |
|------|-------|---------|
| Landing | `/` | Product intro, value prop, sign up |
| **Goal Input** | `/new` | Single text input — core entry point |
| **Recommendation** | `/new/review` | AI suggestion + potential score |
| Dashboard | `/dashboard` | Agent list, recent runs, credit balance |
| Run Viewer | `/runs/[id]` | Real-time execution + credit tracking |
| Agent Detail | `/agents/[id]` | Re-run, edit, view history |
| Plugin Browser | `/plugins` | Browse catalog (secondary, not entry point) |
| Settings | `/settings` | Profile, billing, credits |

### 6.2 Core UX Flow

**Step 1: Goal Input** (`/new`)

Single screen. One text input. Nothing else.

```
┌─────────────────────────────────────────────────────┐
│                                                      │
│              What do you want to get done?            │
│                                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │ Riset kompetitor fintech di Southeast Asia      │ │
│  └─────────────────────────────────────────────────┘ │
│                                        [Build →]     │
│                                                      │
│  Try:                                                │
│  "Compare pricing of top 5 CRM tools"               │
│  "Analyze my CSV data and find trends"               │
│  "Monitor competitor website changes weekly"         │
│                                                      │
└─────────────────────────────────────────────────────┘
```

Like Google Search — one input, type intent, done. Example prompts below for first-time users.

**Step 2: AI Recommendation** (`/new/review`)

```
┌─────────────────────────────────────────────────────┐
│  ← "Riset kompetitor fintech di Southeast Asia"     │
│                                                      │
│  Agent Potential: 82%                                │
│  ████████████████░░░░                                │
│                                                      │
│  Recommended Setup:                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │ Web      │ │ Browser  │ │ CSV      │            │
│  │ Search   │ │ Use      │ │ Processor│            │
│  │ ✓ active │ │ ✓ active │ │ ✓ active │            │
│  └──────────┘ └──────────┘ └──────────┘            │
│                                                      │
│  Unlock more:                                        │
│  ┌──────────────────────────────────────────┐       │
│  │ + Markdown Export          82% → 89%     │       │
│  │   "Format report terstruktur"     [Add]  │       │
│  ├──────────────────────────────────────────┤       │
│  │ + Image Analyzer           89% → 94%     │       │
│  │   "Baca tabel dari screenshot"    [Add]  │       │
│  └──────────────────────────────────────────┘       │
│                                                      │
│  Est: 15-45 credits · ~2-5 min runtime               │
│                                                      │
│  [Run Agent — 15 credits]        [Customize ▾]      │
│                                                      │
└─────────────────────────────────────────────────────┘
```

Key decisions:
- Plugin cards show name + 1 sentence, no technical detail
- Potential bar is the hero element — user instantly sees "82%, could be 94%"
- "Unlock more" section creates gamification pull
- 1 primary CTA: "Run Agent" with credit estimate
- "Customize" collapsed — power users can expand, non-technical users don't need to

**Step 3: Run & Watch** (`/runs/[id]`)

```
┌─────────────────────────────────────────────────────┐
│  Running: Fintech Competitor Research                │
│  ██████████░░░░░░░░░░  12/45 credits                │
│                                                      │
│  ✓ Planning research approach           2 credits   │
│  ✓ Searching "fintech SEA 2026"         3 credits   │
│  ✓ Browsing crunchbase.com/fintech      4 credits   │
│  ● Extracting funding data...           —           │
│  ○ Compare pricing models                            │
│  ○ Generate comparison table                         │
│  ○ Format final report                               │
│                                                      │
│  [Pause]  [Cancel — refund unused credits]           │
│                                                      │
└─────────────────────────────────────────────────────┘
```

Differences from Manus:
- Credit tracker real-time (Manus doesn't have)
- Per-step cost visible (Manus shows progress but not cost)
- Cancel = refund unused credits (Manus doesn't refund)
- No "virtual computer" view — simpler, just step progress

**Step 4: Result**

```
┌─────────────────────────────────────────────────────┐
│  ✓ Complete — 28 credits used                        │
│                                                      │
│  Fintech Competitor Research Report                  │
│  ─────────────────────────────────                   │
│  [rendered markdown output]                          │
│                                                      │
│  [Download PDF]  [Download CSV]  [Copy]              │
│  [Run Again]  [Save as Template]  [Share]            │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**Step 5: Dashboard** (`/dashboard`)

```
┌─────────────────────────────────────────────────────┐
│  Chef AI                        142 / 500 credits   │
│                                                      │
│  [+ New Agent]                                       │
│                                                      │
│  Recent Runs                                         │
│  ┌─────────────────────────────────────────────┐    │
│  │ ✓ Fintech Competitor Research    28 cr  2m  │    │
│  │ ✓ Blog Post Draft: AI Trends     12 cr  1m  │    │
│  │ ✗ Failed: CSV too large           3 cr  —   │    │
│  └─────────────────────────────────────────────┘    │
│                                                      │
│  Saved Agents                                        │
│  ┌──────────────┐ ┌──────────────┐                  │
│  │ Research     │ │ Content      │                  │
│  │ Agent        │ │ Writer       │                  │
│  │ [Quick Run]  │ │ [Quick Run]  │                  │
│  └──────────────┘ └──────────────┘                  │
│                                                      │
└─────────────────────────────────────────────────────┘
```

"Quick Run" = shortcut to run without going through recommendation again. For repeat tasks.

### 6.3 UX Principles

| Principle | Implementation |
|-----------|---------------|
| Zero learning curve | 1 input, AI handles the rest |
| Progressive disclosure | Simple default, "Customize" for power users |
| Transparency over autonomy | Show every step + cost, not black box |
| Gamification | Potential score + "unlock more" = user wants to optimize |
| Forgiving | Cancel = refund, budget limit = never surprise |

### 6.4 Design Reference

Follow `ui-design-protocol.md`. Primary references:
- **linear.app** — sidebar nav, dark mode, clean layout
- **vercel.com** — dashboard cards, whitespace, run history
- **raycast.com** — plugin browser, card design, search

Design tokens:
- Primary: slate-900 (dark theme)
- Accent: emerald-500 (fresh, "chef/organic")
- Font: Inter (body) + JetBrains Mono (code)
- Border radius: 8px default
- Spacing: 8px base unit grid

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
  plan        TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'power')),
  credits_balance INTEGER DEFAULT 50,
  credits_monthly_reset INTEGER DEFAULT 50,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Credit transactions (ledger)
CREATE TABLE credit_transactions (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id     TEXT NOT NULL REFERENCES users(id),
  amount      INTEGER NOT NULL,             -- positive = add, negative = consume
  type        TEXT NOT NULL CHECK (type IN ('monthly-reset', 'purchase', 'run-consume', 'run-refund', 'bonus')),
  run_id      TEXT REFERENCES runs(id),     -- linked run (for consume/refund)
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Plugins (bundled in MVP)
CREATE TABLE plugins (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name        TEXT UNIQUE NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  version     TEXT NOT NULL,
  description TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('tool', 'behavior', 'integration', 'model-config')),
  category    TEXT NOT NULL,
  manifest    JSONB NOT NULL,
  icon_url    TEXT,
  readme      TEXT,
  downloads   INTEGER DEFAULT 0,
  avg_rating  REAL DEFAULT 0,
  status      TEXT DEFAULT 'active',
  is_bundled  BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Plugin compatibility rules
CREATE TABLE plugin_relations (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  plugin_a    TEXT NOT NULL REFERENCES plugins(id),
  plugin_b    TEXT NOT NULL REFERENCES plugins(id),
  type        TEXT NOT NULL CHECK (type IN ('hard-conflict', 'soft-warning', 'enhancement', 'unlocks')),
  description TEXT NOT NULL,
  capabilities_unlocked TEXT[],            -- for type='unlocks'
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(plugin_a, plugin_b, type)
);

-- Agents (user-created or AI-generated compositions)
CREATE TABLE agents (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id       TEXT NOT NULL REFERENCES users(id),
  name          TEXT NOT NULL,
  goal          TEXT NOT NULL,                -- original user goal
  model         TEXT NOT NULL DEFAULT 'claude-sonnet-4-6',
  system_prompt TEXT NOT NULL,
  settings      JSONB NOT NULL DEFAULT '{"max_steps": 50, "budget_credits": 50, "temperature": 0.3, "verify_output": true, "timeout": 300}',
  potential_score INTEGER,                    -- cached score from advisor
  is_template   BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Agent-Plugin junction
CREATE TABLE agent_plugins (
  id        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  agent_id  TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  plugin_id TEXT NOT NULL REFERENCES plugins(id),
  config    JSONB DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  UNIQUE(agent_id, plugin_id)
);

-- Agent runs
CREATE TABLE runs (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  agent_id      TEXT NOT NULL REFERENCES agents(id),
  user_id       TEXT NOT NULL REFERENCES users(id),
  task          TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'budget-exceeded', 'cancelled')),
  output        TEXT,
  error         TEXT,
  credits_used  INTEGER DEFAULT 0,
  credits_budget INTEGER NOT NULL,            -- hard limit for this run
  tokens_in     INTEGER DEFAULT 0,
  tokens_out    INTEGER DEFAULT 0,
  duration_ms   INTEGER,
  step_count    INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now(),
  completed_at  TIMESTAMPTZ
);

-- Run steps
CREATE TABLE run_steps (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  run_id      TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('plan', 'tool-call', 'final-answer', 'verification')),
  tool_name   TEXT,
  input       JSONB,
  output      TEXT,
  credits     INTEGER DEFAULT 0,
  tokens_in   INTEGER DEFAULT 0,
  tokens_out  INTEGER DEFAULT 0,
  duration_ms INTEGER,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_credit_tx_user ON credit_transactions(user_id);
CREATE INDEX idx_agents_user ON agents(user_id);
CREATE INDEX idx_runs_agent ON runs(agent_id);
CREATE INDEX idx_runs_user ON runs(user_id);
CREATE INDEX idx_runs_status ON runs(status);
CREATE INDEX idx_run_steps_run ON run_steps(run_id);
CREATE INDEX idx_plugins_category ON plugins(category);
```

Key changes from V1:
- `credit_transactions` table (new) — ledger for all credit movements
- `users.credits_balance` + `credits_monthly_reset` (new) — credit system
- `agents.goal` (new) — stores original user goal
- `agents.potential_score` (new) — cached advisor score
- `runs.credits_used` + `credits_budget` replaces `cost_usd`
- `run_steps.credits` replaces `cost_usd`
- Removed: `user_secrets` table (platform manages keys now)

---

## 8. API Design

### 8.1 REST Endpoints

```
Auth:
POST   /auth/register            Create account
POST   /auth/login               Login
POST   /auth/logout              Logout
GET    /auth/me                  Current user + credit balance

Advisor (NEW):
POST   /advisor/classify         Classify goal → intent
POST   /advisor/recommend        Get plugin recommendations for goal
POST   /advisor/score            Calculate potential score for plugin combo
POST   /advisor/check-conflicts  Check compatibility between plugins

Plugins:
GET    /plugins                  List all plugins (filter by category, type)
GET    /plugins/:slug            Get plugin detail + manifest

Agents:
GET    /agents                   List user's agents
POST   /agents                   Create agent (from advisor recommendation)
GET    /agents/:id               Get agent detail
PUT    /agents/:id               Update agent
DELETE /agents/:id               Delete agent

Runs:
POST   /agents/:id/run           Start agent run (deducts credits)
GET    /runs/:id                 Get run result
GET    /runs/:id/stream          SSE stream for real-time updates
POST   /runs/:id/cancel          Cancel run (refund remaining credits)
GET    /runs                     List user's run history

Credits (NEW):
GET    /credits                  Get balance + transaction history
POST   /credits/purchase         Buy more credits (Stripe)
```

### 8.2 Real-Time Updates (SSE)

```typescript
type RunEvent =
  | { type: 'run:started'; runId: string; budgetCredits: number }
  | { type: 'step:planning'; content: string }
  | { type: 'step:tool-call'; toolName: string; input: unknown }
  | { type: 'step:tool-result'; toolName: string; output: string; credits: number }
  | { type: 'step:thinking'; content: string }
  | { type: 'credits:update'; consumed: number; budget: number }
  | { type: 'run:completed'; output: string; totalCredits: number }
  | { type: 'run:failed'; error: string; creditsRefunded: number }
  | { type: 'run:cancelled'; creditsRefunded: number }
  | { type: 'verification:result'; passed: boolean; reason: string };
```

---

## 9. Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Monorepo** | Turborepo + pnpm | Fast builds, shared packages |
| **Frontend** | Next.js 15 (App Router) + Tailwind + shadcn/ui | Production-grade, SSR |
| **Backend API** | Hono (on Node.js) | Lightweight, TypeScript-native |
| **Database** | PostgreSQL 16 + Drizzle ORM | Reliable, pgvector for future |
| **Cache** | Redis 7 | Session store, rate limiting, run state pub/sub |
| **AI SDK** | Vercel AI SDK 6 | Multi-model, streaming, native MCP |
| **Plugin Runtime** | MCP (stdio) | Standard protocol |
| **Sandbox** | E2B (prod) / Docker (dev) | Firecracker microVM, 80ms cold start |
| **Auth** | Better Auth | Open-source, self-hosted |
| **Payments** | Stripe | Credit purchases |
| **Hosting** | Vercel (frontend) + Railway (API + DB + Redis) | Fast deploy |
| **Testing** | Vitest + Playwright | Unit + E2E |

---

## 10. Security

| Concern | Mitigation |
|---------|-----------|
| Plugin code execution | E2B Firecracker microVM (full OS isolation) |
| Platform API keys | Encrypted at rest (AES-256-GCM), injected as env vars into sandbox |
| Key exposure | Keys never sent to frontend, never logged, never accessible by plugin code directly |
| Malicious plugins | MVP: only bundled plugins. Phase 2: review process |
| Budget overrun | Hard credit limit checked before every LLM call and tool execution |
| Network isolation | Sandbox on isolated network, no access to platform infra |
| Input validation | Zod schemas on all API inputs |
| Auth | Better Auth with session tokens, CSRF protection |
| Credit fraud | Server-side credit deduction, transaction ledger, rate limiting |

---

## 11. Testing Strategy

| Layer | Tool | What to Test |
|-------|------|-------------|
| Intent Classifier | Vitest | Classification accuracy across 50+ goal examples |
| Recommendation Engine | Vitest | Plugin matching, scoring formula, edge cases |
| Potential Scorer | Vitest | Score calculation, enhancement graph, conflict penalties |
| Plugin SDK | Vitest | Manifest validation, plugin creation, MCP adapter |
| Agent Runtime | Vitest | Execution loop, credit tracking, budget enforcement |
| API Routes | Vitest + Supertest | CRUD, auth, advisor endpoints, credit operations |
| Frontend | Playwright | Goal input → recommendation → run → result flow |
| Integration | E2B + Vitest | Full agent run with real plugins in sandbox |

### Key Test Scenarios

1. Goal → advisor recommends correct plugins → potential score accurate
2. Agent runs to completion → correct output + credit report
3. Agent hits credit limit → stops gracefully, credits not exceeded
4. Plugin conflict detected → user warned, hard conflicts blocked
5. Cancel mid-run → unused credits refunded to balance
6. Plugin crashes → agent continues with remaining plugins
7. Enhancement graph → "add X unlocks Y" suggestions correct
8. Credit balance insufficient → run blocked before start

---

## 12. Deployment

### Local Development

```bash
git clone https://github.com/rafiimanggalajapamel/chef-ai
cd chef-ai
pnpm install
docker compose up -d    # PostgreSQL + Redis
pnpm db:migrate
pnpm dev                # Next.js + Hono + seed plugins
```

### Production

| Service | Platform | Notes |
|---------|----------|-------|
| Frontend (Next.js) | Vercel | Auto-deploy from main |
| API (Hono) | Railway | Dockerfile |
| PostgreSQL | Railway | Managed, daily backups |
| Redis | Railway | Managed |
| Plugin Sandbox | E2B | Firecracker microVMs |

### Environment Variables

```env
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=https://api.chefai.dev
ANTHROPIC_API_KEY=...
OPENAI_API_KEY=...
GOOGLE_GENERATIVE_AI_API_KEY=...
TAVILY_API_KEY=...
EXA_API_KEY=...
RESEND_API_KEY=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
E2B_API_KEY=...
NEXT_PUBLIC_API_URL=https://api.chefai.dev
NEXT_PUBLIC_APP_URL=https://chefai.dev
```

---

## 13. MVP Build Plan

| No | Task | Duration | Dependencies |
|----|------|----------|-------------|
| 1 | Monorepo setup (Turborepo + pnpm + configs) | 1 day | — |
| 2 | Database schema + Drizzle + migrations | 2 days | 1 |
| 3 | Auth (Better Auth + sessions) | 2 days | 1, 2 |
| 4 | Credit system (balance, transactions, Stripe) | 3 days | 2, 3 |
| 5 | Plugin SDK package (@chef-ai/plugin-sdk) | 3 days | 1 |
| 6 | Build 5 core seed plugins | 5 days | 5 |
| 7 | Intent Classifier (LLM + structured output) | 2 days | 1 |
| 8 | Recommendation Engine (affinity matching) | 3 days | 5, 7 |
| 9 | Potential Scorer (enhancement graph + scoring) | 3 days | 5, 8 |
| 10 | Conflict Resolver (graph-based checker) | 2 days | 5 |
| 11 | Agent Runtime core (execution loop + credit tracker) | 5 days | 5 |
| 12 | Multi-model support (AI SDK 6) | 2 days | 11 |
| 13 | MCP bridge (load plugins as MCP servers) | 3 days | 5, 11 |
| 14 | E2B sandbox integration | 3 days | 13 |
| 15 | API routes (advisor, agents, plugins, runs, credits) | 3 days | 2-14 |
| 16 | SSE streaming for real-time updates | 2 days | 15 |
| 17 | Frontend: Layout + auth pages | 2 days | 3 |
| 18 | Frontend: Goal Input page (`/new`) | 2 days | 17 |
| 19 | Frontend: Recommendation page (`/new/review`) | 4 days | 8, 9, 10, 17 |
| 20 | Frontend: Run Viewer (`/runs/[id]`) | 3 days | 16, 17 |
| 21 | Frontend: Dashboard | 2 days | 15, 17 |
| 22 | Frontend: Settings + Credits | 2 days | 4, 17 |
| 23 | Build remaining 10 seed plugins | 7 days | 5, 14 |
| 24 | Pre-built agent templates (6) | 2 days | 6, 23 |
| 25 | Integration testing | 3 days | All |
| 26 | E2E testing (Playwright) | 3 days | All |
| 27 | Deploy (Vercel + Railway + E2B) | 2 days | All |
| 28 | Landing page | 2 days | 17 |

**Total: ~71 working days (~14 weeks)**

Critical path: 1 → 5 → 8 → 9 → 11 → 13 → 14 → 15 → 19 → 25 → 27

New tasks vs V1: Intent Classifier (#7), Recommendation Engine (#8), Potential Scorer (#9), Credit System (#4), E2B integration (#14), Goal Input page (#18), Recommendation page (#19).

---

## 14. Success Metrics

| Metric | Target | How |
|--------|--------|-----|
| Goal → first run | < 60 seconds | Time from typing goal to clicking Run |
| Agent completion rate | > 80% | Runs that complete without error |
| Recommendation acceptance | > 70% | Users who run with AI-recommended plugins (no customization) |
| Average credits per run | < 50 | Across all agent types |
| Potential score accuracy | ±15% | Predicted improvement vs actual improvement when adding suggested plugin |
| Credit estimation accuracy | ±30% | Estimated vs actual credits consumed |
| User retention (week 2) | > 30% | Users who return and run another agent |

---

## 15. Risks and Mitigations

| Risk | Severity | Mitigation |
|------|----------|-----------|
| E2B cost at scale | HIGH | Monitor per-run cost closely. Fallback to Fly Machines if E2B too expensive |
| Intent classifier accuracy | HIGH | Extensive test suite (50+ goals). Fallback to template selection if classification poor |
| Platform API key abuse | HIGH | Per-user rate limiting, anomaly detection, credit system prevents unlimited usage |
| Cold start affinity data | MEDIUM | Manually tune affinity matrix for 15 seed plugins. Phase 2: learn from usage |
| Recommendation quality | MEDIUM | A/B test recommendations. Track acceptance rate as signal |
| Solo dev burnout (14 weeks) | HIGH | Parallelize with Agent Teams, maintain daily logs |
| E2B dependency | MEDIUM | Abstract sandbox interface — can swap to Fly Machines or Docker |
| Credit pricing wrong | MEDIUM | Start conservative (higher margin), adjust based on actual costs |

---

## 16. Open Questions

1. **Domain name**: chefai.dev? chefagent.com? composai.dev?
2. **Dark vs Light theme**: Dark-first (dev tool feel) or Light-first (consumer feel)?
3. **Free tier limits**: 50 credits/month enough to hook users?
4. **Open source**: Fully open-source from day 1 or closed-source MVP?
5. **Plugin browser**: Keep as secondary page, or remove entirely for MVP? (users don't need to browse if AI recommends)
6. **Refund policy**: Cancel mid-run refunds unused credits — what about failed runs? Full refund or partial?

---

## Appendix A: Future Phases (Unchanged from V1)

### Phase 2: Marketplace + Full Conflict Resolver (8-10 weeks)
- Plugin publishing flow
- Marketplace UI (search, featured, trending)
- Full conflict resolver (dependency graph, auto-suggestions)
- Ratings and reviews
- Stripe Connect (85/15 revenue split)
- Collaborative filtering for recommendations (learn from usage data)

### Phase 3: Scale + Community (8-12 weeks)
- Agent scheduling (cron-based recurring runs)
- Recipes (pre-built agent + plugin combos, shareable)
- Community forum per plugin
- Webhook integrations
- API access (run agents programmatically)
- Enterprise (SSO, audit logs, team workspaces)
- BYOK option for power users who want to use own API keys

---

## Appendix B: Competitive Positioning (Updated)

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

### vs Manus AI (Primary Competitor)

| Aspect | Manus | Chef AI |
|--------|-------|---------|
| Entry | Type prompt → autonomous | Type goal → AI recommends → approve |
| Control | Minimal (black box) | Full visibility (scored plugins) |
| Cost | Unpredictable credit drain | Transparent, per-step, hard budget |
| Extensibility | SKILL.md (closed) | Plugin marketplace (open, Phase 2) |
| Business model | Credit-based, opaque | Credit-based, transparent 30% markup |
| Unique feature | Virtual computer view | Potential scoring + conflict resolver |

### vs OpenRouter (Business Model Analog)

| Aspect | OpenRouter | Chef AI |
|--------|------------|---------|
| Proxy | LLM providers | LLM + tool/plugin providers |
| Intelligence | None (dumb proxy) | AI Advisor (recommend, score, resolve) |
| User | Developer (API consumer) | Non-technical (GUI consumer) |
| Revenue | Token markup | Credit markup (tokens + tools + compute) |

---

## Appendix C: V1 → V2 Changelog

| Section | Change |
|---------|--------|
| Vision | "Compose your agent" → "Tell us what you need" |
| Target user | Developer → Non-technical |
| Entry point | Plugin browser → Goal input |
| AI Advisor | NEW: Intent Classifier + Recommendation Engine + Potential Scorer |
| Execution | Docker local → E2B cloud |
| API keys | User provides (BYOK) → Platform provides |
| Revenue | TBD → Credit-based with 30% markup |
| UX | Agent builder (5 steps) → Goal-first (2 steps to run) |
| Data model | Added: credit_transactions, credits_balance. Removed: user_secrets |
| API | Added: /advisor/* endpoints, /credits/* endpoints |
| Plugin manifest | Added: capabilities_unlocked_with, pricing.external_apis, env.source: "platform" |
| Build plan | 64 days → 71 days (+7 days for advisor + credits + E2B) |
| Preserved | Plugin SDK, MCP format, agent runtime loop, seed plugins, tech stack core |
