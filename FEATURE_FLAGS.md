# Feature Flags Documentation

## Overview

AgentCloud uses feature flags to control which agents and tools are available in your deployment. This allows you to:

- **Launch with 2-3 agents** instead of all 26
- **Reduce surface area** for initial demos
- **Gradually roll out** features to specific customers
- **Test new agents** with specific customers before full launch
- **Switch verticals** without code changes

## Quick Start

### Default Configuration

By default, AgentCloud launches with the **Shopify e-commerce vertical**:

```env
AGENTCLOUD_VERTICAL=shopify
```

This enables only:

- **Shopify Agent** - Product search, order status, cart links
- **Lead Capture Agent** - Capture and notify sales

### Change Vertical

To switch to a different vertical, set the environment variable:

```env
# For Shopify e-commerce (default)
AGENTCLOUD_VERTICAL=shopify

# For services (restaurants, professionals, real estate)
AGENTCLOUD_VERTICAL=services

# For full platform (all agents)
AGENTCLOUD_VERTICAL=full
```

## Configuration Reference

### Vertical Presets

#### 1. Shopify E-commerce (`shopify`)

**Best for:** E-commerce stores on Shopify

**Enabled Agents:**

- `shopify-agent` - Shopify Commerce Agent
- `lead-capture` - Lead Capture Agent

**Enabled Tools:**

- `shopify_search_products` - Search products in Shopify catalog
- `shopify_get_order_status` - Check order status by order number + email
- `shopify_build_cart_url` - Generate direct cart links
- `lead_capture_submit` - Capture lead details
- `lead_capture_notify_sales` - Send Slack/webhook notifications

**Disabled Tools:**

- `web_search` - Prevents unexpected web searches
- `scrape_page` - Prevents unexpected page scraping
- `read_file` / `write_file` - Not needed for basic Shopify operations
- `lead_capture_enrich` - Optional enrichment disabled by default

**Use Case:**

```html
<!-- Customer asks about products -->
User: "Show me your best selling products" Agent: [Uses shopify_search_products
to find products] "Here are our top sellers: - Product A: €99 (link) - Product
B: €149 (link) - Product C: €79 (link)"
```

#### 2. Services (`services`)

**Best for:** Restaurants, professionals, real estate, service-based businesses

**Enabled Agents:**

- `calendar-booking` - Calendar Booking Agent
- `lead-capture` - Lead Capture Agent

**Enabled Tools:**

- `calendar_search_availability` - Find free time slots
- `calendar_book_event` - Book meetings on calendar
- `lead_capture_submit` - Capture lead details
- `lead_capture_notify_sales` - Send Slack/webhook notifications

**Disabled Tools:**

- `web_search` - Prevents unexpected searches
- All other tools not related to booking/leads

**Use Case:**

```html
<!-- Customer wants to book -->
User: "I'd like to book a table for tomorrow at 7pm" Agent: [Uses
calendar_search_availability to find slots] "We have availability at 7:00 PM and
8:30 PM. Which would you prefer?" User: "7pm please" Agent: [Uses
calendar_book_event to book] "Confirmed! Your table is booked for tomorrow at
7:00 PM. I've sent a calendar invite to your email."
```

#### 3. Full Platform (`full`)

**Best for:** Existing customers, full launch, power users

**Enabled Agents:**

- All 6 core agents:
  - `seo-agent` - SEO Content Agent
  - `business-manager` - Business Manager Agent
  - `personal-assistant` - Personal AI Assistant
  - `shopify-agent` - Shopify Commerce Agent
  - `calendar-booking` - Calendar Booking Agent
  - `lead-capture` - Lead Capture Agent

**Enabled Tools:**

- All tools enabled by default
- Optional tools automatically enabled

**Use Case:**

- Full platform access
- Power users who need all features
- Beta testing new agents

### Custom Configuration

For full control, use `AGENTCLOUD_FEATURE_FLAGS` with a JSON configuration:

```env
AGENTCLOUD_FEATURE_FLAGS={
  "enabledAgents": ["shopify-agent", "lead-capture"],
  "enabledTools": [
    "shopify_search_products",
    "shopify_get_order_status",
    "shopify_build_cart_url",
    "lead_capture_submit",
    "lead_capture_notify_sales"
  ],
  "agentToolOverrides": {
    "shopify-agent": ["web_search"]
  },
  "enableOptionalToolsByDefault": false
}
```

**Configuration Options:**

| Option                         | Type                       | Description                                                   |
| ------------------------------ | -------------------------- | ------------------------------------------------------------- |
| `enabledAgents`                | `string[]`                 | List of agent slugs that are enabled                          |
| `enabledTools`                 | `string[]`                 | List of tools that are globally enabled (empty = all allowed) |
| `agentToolOverrides`           | `Record<string, string[]>` | Agent-specific tool overrides                                 |
| `enableOptionalToolsByDefault` | `boolean`                  | Whether to enable optional tools by default                   |

**Priority:**

1. `AGENTCLOUD_FEATURE_FLAGS` (JSON config) - highest priority
2. `AGENTCLOUD_VERTICAL` (preset) - medium priority
3. Default: `SHOPIFY_LAUNCH_CONFIG` - lowest priority

## How It Works

### Agent-Level Tool Configuration

Each agent has three tool categories:

1. **`tools`** - All tools the agent can potentially use (for reference)
2. **`defaultTools`** - Tools enabled by default (safe, predictable)
3. **`optionalTools`** - Tools that require explicit activation (more powerful, less predictable)

### Runtime Tool Selection

When an agent is invoked:

1. Start with `defaultTools`
2. Apply `agentToolOverrides` if configured
3. Add `optionalTools` if `enableOptionalToolsByDefault` is true
4. Filter by `enabledTools` if specified
5. Return final list of enabled tools

### Example: Shopify Agent

**Configuration:**

```typescript
{
  id: "shopify-agent",
  tools: [
    "shopify_search_products",
    "shopify_get_order_status",
    "shopify_build_cart_url",
    "web_search",
    "read_file",
    "write_file"
  ],
  defaultTools: [
    "shopify_search_products",
    "shopify_get_order_status",
    "shopify_build_cart_url"
  ],
  optionalTools: ["web_search", "read_file", "write_file"]
}
```

**With Shopify Vertical:**

- Enabled tools: `shopify_search_products`, `shopify_get_order_status`, `shopify_build_cart_url`
- Disabled tools: `web_search`, `read_file`, `write_file`

**With Full Platform:**

- Enabled tools: All 6 tools
- Agent can search the web, read files, write files in addition to Shopify operations

## API Reference

### `getFeatureFlags()`

Get the active feature flags configuration.

**Returns:** `FeatureFlags` object

**Example:**

```typescript
import { getFeatureFlags } from "@/lib/agents/feature-flags";

const flags = getFeatureFlags();
console.log(flags.enabledAgents); // ["shopify-agent", "lead-capture"]
console.log(flags.enabledTools); // ["shopify_search_products", ...]
```

### `isAgentEnabled(agentId: string)`

Check if an agent is enabled.

**Parameters:**

- `agentId` - Agent slug (e.g., `"shopify-agent"`)

**Returns:** `boolean`

**Example:**

```typescript
import { isAgentEnabled } from "@/lib/agents/feature-flags";

if (isAgentEnabled("shopify-agent")) {
  // Show Shopify agent in UI
}
```

### `getEnabledToolsForAgent(agentId: string)`

Get the list of enabled tools for an agent.

**Parameters:**

- `agentId` - Agent slug (e.g., `"shopify-agent"`)

**Returns:** `string[]` - List of enabled tool names

**Example:**

```typescript
import { getEnabledToolsForAgent } from "@/lib/agents/feature-flags";

const tools = getEnabledToolsForAgent("shopify-agent");
// ["shopify_search_products", "shopify_get_order_status", "shopify_build_cart_url"]
```

### `getEnabledAgents()`

Get all enabled agents with their configurations.

**Returns:** `Array<AgentRuntimeConfig & { enabledTools: string[] }>`

**Example:**

```typescript
import { getEnabledAgents } from "@/lib/agents/feature-flags";

const agents = getEnabledAgents();
// [
//   {
//     id: "shopify-agent",
//     name: "Shopify Commerce Agent",
//     enabledTools: ["shopify_search_products", ...],
//     ...
//   },
//   {
//     id: "lead-capture",
//     name: "Lead Capture Agent",
//     enabledTools: ["lead_capture_submit", ...],
//     ...
//   }
// ]
```

## Environment Variables

| Variable                   | Type          | Required | Default   | Description                                       |
| -------------------------- | ------------- | -------- | --------- | ------------------------------------------------- |
| `AGENTCLOUD_VERTICAL`      | `string`      | No       | `shopify` | Vertical preset: `shopify`, `services`, or `full` |
| `AGENTCLOUD_FEATURE_FLAGS` | `JSON string` | No       | -         | Custom feature flags configuration                |

## Best Practices

### 1. Start with a Vertical

Use vertical presets for initial launch:

```env
AGENTCLOUD_VERTICAL=shopify
```

This gives you:

- 2 focused agents
- 5 tools total
- Predictable behavior
- Easy demo flow

### 2. Add Agents Gradually

When ready to add more agents:

```env
AGENTCLOUD_VERTICAL=full
```

Or use custom config to add one at a time:

```env
AGENTCLOUD_FEATURE_FLAGS={
  "enabledAgents": ["shopify-agent", "lead-capture", "calendar-booking"],
  "enabledTools": [...],
  "enableOptionalToolsByDefault": false
}
```

### 3. Enable Tools Selectively

Don't enable all tools at once. Add them as needed:

```env
AGENTCLOUD_FEATURE_FLAGS={
  "enabledAgents": ["shopify-agent"],
  "enabledTools": [
    "shopify_search_products",
    "shopify_get_order_status",
    "shopify_build_cart_url"
  ],
  "agentToolOverrides": {
    "shopify-agent": ["web_search"]  // Enable web search only for Shopify agent
  },
  "enableOptionalToolsByDefault": false
}
```

### 4. Test Before Deploying

Test feature flags locally before deploying:

```bash
# Test Shopify vertical
AGENTCLOUD_VERTICAL=shopify npm run dev

# Test services vertical
AGENTCLOUD_VERTICAL=services npm run dev

# Test custom config
AGENTCLOUD_FEATURE_FLAGS='{"enabledAgents":["shopify-agent"]}' npm run dev
```

### 5. Monitor Agent Behavior

After enabling new tools, monitor:

- Agent responses for unexpected behavior
- Tool usage patterns
- Customer feedback
- Error rates

## Troubleshooting

### Agent not showing up

**Problem:** Agent is configured but not visible in UI

**Solution:**

1. Check `AGENTCLOUD_VERTICAL` or `AGENTCLOUD_FEATURE_FLAGS`
2. Verify agent slug matches exactly (case-sensitive)
3. Check server logs for feature flag parsing errors

### Tool not working

**Problem:** Tool is configured but agent doesn't use it

**Solution:**

1. Check if tool is in `enabledTools` list
2. Check if tool is in agent's `defaultTools` or `optionalTools`
3. Verify tool name matches exactly (case-sensitive)
4. Check if `enableOptionalToolsByDefault` is set correctly

### Web search behaving unexpectedly

**Problem:** Agent searches the web when it shouldn't

**Solution:**

1. Remove `web_search` from `enabledTools`
2. Remove `web_search` from agent's `defaultTools` or `optionalTools`
3. Set `enableOptionalToolsByDefault` to `false`

### Want to enable tool for specific agent only

**Problem:** Need `web_search` for Shopify agent but not others

**Solution:**

```env
AGENTCLOUD_FEATURE_FLAGS={
  "enabledAgents": ["shopify-agent", "lead-capture"],
  "enabledTools": [],  // Empty = no global filter
  "agentToolOverrides": {
    "shopify-agent": ["web_search"]
  },
  "enableOptionalToolsByDefault": false
}
```

## Migration Guide

### From All Agents to Shopify Vertical

**Before:**

```env
# No feature flags - all agents enabled
```

**After:**

```env
AGENTCLOUD_VERTICAL=shopify
```

**Result:**

- Only 2 agents enabled (Shopify + Lead Capture)
- Only 5 tools enabled
- Reduced surface area
- More predictable demos

### From Shopify to Services Vertical

**Before:**

```env
AGENTCLOUD_VERTICAL=shopify
```

**After:**

```env
AGENTCLOUD_VERTICAL=services
```

**Result:**

- Calendar Booking + Lead Capture enabled
- Shopify agent disabled
- Different tool set

### Adding a New Agent

**Before:**

```env
AGENTCLOUD_VERTICAL=shopify
```

**After:**

```env
AGENTCLOUD_FEATURE_FLAGS={
  "enabledAgents": ["shopify-agent", "lead-capture", "calendar-booking"],
  "enabledTools": [
    "shopify_search_products",
    "shopify_get_order_status",
    "shopify_build_cart_url",
    "lead_capture_submit",
    "lead_capture_notify_sales",
    "calendar_search_availability",
    "calendar_book_event"
  ],
  "agentToolOverrides": {},
  "enableOptionalToolsByDefault": false
}
```

**Result:**

- 3 agents enabled
- 7 tools enabled
- No code changes needed

## Support

- Main docs: **STRIPE_SETUP.md**
- Implementation: **PAYMENT_IMPLEMENTATION.md**
- Agent registry: `src/lib/agents/registry.ts`
- Feature flags: `src/lib/agents/feature-flags.ts`

**Before:**

```env
AGENTCLOUD_VERTICAL=shopify
```

**After:**

```env
AGENTCLOUD_FEATURE_FLAGS={
  "enabledAgents": ["shopify-agent", "lead-capture", "calendar-booking"],
  "enabledTools": [
    "shopify_search_products",
    "shopify_get_order_status",
    "shopify_build_cart_url",
    "lead_capture_submit",
    "lead_capture_notify_sales",
    "calendar_search_availability",
    "calendar_book_event"
  ],
  "agentToolOverrides": {},
  "enableOptionalToolsByDefault": false
}
```

**Result:**

- 3 agents enabled
- 7 tools enabled
- No code changes needed

## Support

- Main docs: **STRIPE_SETUP.md**
- Implementation: **PAYMENT_IMPLEMENTATION.md**
- Agent registry: `src/lib/agents/registry.ts`
- Feature flags: `src/lib/agents/feature-flags.ts`
