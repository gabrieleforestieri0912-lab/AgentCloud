import type { LLMTool } from "@/lib/llm";
import type { ToolContext } from "./tools";
import {
  githubApiProxy,
  clickupApiProxy,
  asanaApiProxy,
  notionApiProxy,
  slackApiProxy,
  hubspotApiProxy,
  driveApiProxy,
  airtableApiProxy,
  trelloApiProxy,
  wooApiProxy,
} from "@/lib/integrations/api-proxy";

/**
 * Tool agente per le integrazioni: GitHub / ClickUp / Asana / Notion / Slack /
 * HubSpot / Google Drive / Airtable / Trello / WooCommerce.
 *
 * Perché un modulo dedicato: tiene `lib/agents/tools.ts` focalizzato sugli
 * strumenti core e raccoglie qui definizioni + handler delle integrazioni.
 * Gli handler risolvono il tenant e chiamano `lib/integrations/api-proxy`, che
 * decripta il token salvato in `tenant_integrations`, lo rinfresca se serve e
 * parla direttamente con l'API del provider. Nessuna Edge Function.
 */

const INTEGRATION_TOOL_NAMES = [
  "github_list_repos",
  "github_list_issues",
  "github_create_issue",
  "clickup_list_spaces",
  "clickup_list_tasks",
  "clickup_create_task",
  "asana_list_workspaces",
  "asana_list_projects",
  "asana_list_tasks",
  "asana_create_task",
  "notion_search",
  "notion_read_page",
  "notion_create_page",
  "notion_append_blocks",
  "slack_list_channels",
  "slack_post_message",
  "slack_read_channel",
  "hubspot_search_contacts",
  "hubspot_get_contact",
  "hubspot_create_contact",
  "hubspot_update_contact",
  "hubspot_list_companies",
  "drive_search_files",
  "drive_read_file",
  "drive_list_folder",
  "airtable_list_bases",
  "airtable_list_tables",
  "airtable_list_records",
  "trello_list_boards",
  "trello_list_cards",
  "woo_list_products",
  "woo_get_product",
  "woo_list_orders",
  "woo_get_order",
  "woo_get_customer",
] as const;

export function isIntegrationTool(name: string): boolean {
  return (INTEGRATION_TOOL_NAMES as readonly string[]).includes(name);
}

function clean(value: string | undefined, max: number): string {
  return String(value ?? "").trim().slice(0, max);
}

function parseLimit(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Tenant di riferimento: l'utente autenticato che ha avviato l'agente, con
 * fallback sul tenant condiviso (admin via codice). Stringa vuota per gli anonimi.
 */
function resolveTenant(context: ToolContext): string {
  if (context.userId && context.userId !== "anonymous") return context.userId;
  return context.tenantId ?? "";
}

// ---------------------------------------------------------------------------
// Definizioni tool
// ---------------------------------------------------------------------------

export const INTEGRATION_TOOL_DEFINITIONS: Record<string, LLMTool> = {
  github_list_repos: {
    name: "github_list_repos",
    description:
      "List the connected GitHub account's repositories (most recently updated), with visibility and description.",
    input_schema: {
      type: "object",
      properties: {
        limit: { type: "integer", description: "Max repositories to return (default 20, max 50)" },
      },
    },
  },

  github_list_issues: {
    name: "github_list_issues",
    description: "List issues in a GitHub repository (pull requests are filtered out).",
    input_schema: {
      type: "object",
      properties: {
        owner: { type: "string", description: "Repository owner (user or org), e.g. vercel" },
        repo: { type: "string", description: "Repository name, e.g. next.js" },
        state: { type: "string", description: "Issue state: open (default), closed or all" },
        limit: { type: "integer", description: "Max issues to return (default 20, max 50)" },
      },
      required: ["owner", "repo"],
    },
  },

  github_create_issue: {
    name: "github_create_issue",
    description: "Create an issue in a GitHub repository.",
    input_schema: {
      type: "object",
      properties: {
        owner: { type: "string", description: "Repository owner (user or org)" },
        repo: { type: "string", description: "Repository name" },
        title: { type: "string", description: "Issue title" },
        body: { type: "string", description: "Issue body (markdown, optional)" },
      },
      required: ["owner", "repo", "title"],
    },
  },

  clickup_list_spaces: {
    name: "clickup_list_spaces",
    description:
      "List the connected ClickUp workspace's spaces and their lists (with ids). Call this first: clickup_create_task needs a listId from here.",
    input_schema: { type: "object", properties: {} },
  },

  clickup_list_tasks: {
    name: "clickup_list_tasks",
    description:
      "List the most recently updated tasks in the connected ClickUp workspace. Pass a listId (from clickup_list_spaces) for a single list, otherwise the whole workspace is used.",
    input_schema: {
      type: "object",
      properties: {
        listId: { type: "string", description: "ClickUp list id (optional, from clickup_list_spaces)" },
        limit: { type: "integer", description: "Max tasks to return (default 20, max 50)" },
      },
    },
  },

  clickup_create_task: {
    name: "clickup_create_task",
    description:
      "Create a task in ClickUp. Requires the listId (get it from clickup_list_spaces).",
    input_schema: {
      type: "object",
      properties: {
        listId: { type: "string", description: "ClickUp list id (from clickup_list_spaces)" },
        title: { type: "string", description: "Task name" },
        description: { type: "string", description: "Task description (optional)" },
      },
      required: ["listId", "title"],
    },
  },

  asana_list_workspaces: {
    name: "asana_list_workspaces",
    description: "List the connected Asana workspaces (name and gid).",
    input_schema: { type: "object", properties: {} },
  },

  asana_list_projects: {
    name: "asana_list_projects",
    description: "List the projects in an Asana workspace.",
    input_schema: {
      type: "object",
      properties: {
        workspaceId: { type: "string", description: "Asana workspace gid (from asana_list_workspaces)" },
        limit: { type: "integer", description: "Max projects to return (default 20, max 50)" },
      },
      required: ["workspaceId"],
    },
  },

  asana_list_tasks: {
    name: "asana_list_tasks",
    description: "List the tasks in an Asana project.",
    input_schema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Asana project gid (from asana_list_projects)" },
        limit: { type: "integer", description: "Max tasks to return (default 20, max 50)" },
      },
      required: ["projectId"],
    },
  },
  asana_create_task: {
    name: "asana_create_task",
    description:
      "Create a task in Asana. Provide a projectId (preferred) or a workspaceId.",
    input_schema: {
      type: "object",
      properties: {
        taskName: { type: "string", description: "Task name" },
        projectId: { type: "string", description: "Asana project gid to add the task to (optional)" },
        workspaceId: { type: "string", description: "Asana workspace gid (used when no projectId is given)" },
        notes: { type: "string", description: "Task notes/description (optional)" },
      },
      required: ["taskName"],
    },
  },

  // ── Notion ────────────────────────────────────────────────────────────────
  notion_search: {
    name: "notion_search",
    description:
      "Search pages in the connected Notion workspace by title keyword. Returns page ids needed by the other Notion tools.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Words to look for in page titles" },
        limit: { type: "integer", description: "Max pages to return (default 20, max 50)" },
      },
      required: ["query"],
    },
  },

  notion_read_page: {
    name: "notion_read_page",
    description:
      "Read the text content of a Notion page (id from notion_search or given by the user).",
    input_schema: {
      type: "object",
      properties: {
        pageId: { type: "string", description: "Notion page id (with or without dashes)" },
      },
      required: ["pageId"],
    },
  },

  notion_create_page: {
    name: "notion_create_page",
    description:
      "Create a child page under an existing Notion page, with optional body text. Get the parent pageId from notion_search first.",
    input_schema: {
      type: "object",
      properties: {
        pageId: { type: "string", description: "Parent Notion page id" },
        title: { type: "string", description: "Title of the new page" },
        content: { type: "string", description: "Body text (optional, paragraphs)" },
      },
      required: ["pageId", "title"],
    },
  },

  notion_append_blocks: {
    name: "notion_append_blocks",
    description:
      "Append paragraphs to an existing Notion page, keeping the current content (use this to add a section to an existing page).",
    input_schema: {
      type: "object",
      properties: {
        pageId: { type: "string", description: "Notion page id" },
        content: { type: "string", description: "Text to append" },
      },
      required: ["pageId", "content"],
    },
  },

  // ── Slack ─────────────────────────────────────────────────────────────────
  slack_list_channels: {
    name: "slack_list_channels",
    description:
      "List the Slack channels the AgentCloud app can post in. Call this first when the user names a channel by name, to get the channel id.",
    input_schema: {
      type: "object",
      properties: {
        limit: { type: "integer", description: "Max channels to return (default 30, max 50)" },
      },
    },
  },

  slack_post_message: {
    name: "slack_post_message",
    description:
      "Post a message in a Slack channel, or reply in a thread when threadTs is given. This is a real send: confirm the text with the user before calling it unless they already asked for exactly this message.",
    input_schema: {
      type: "object",
      properties: {
        channel: { type: "string", description: "Channel id (from slack_list_channels)" },
        text: { type: "string", description: "Message text" },
        threadTs: { type: "string", description: "Timestamp of the parent message to reply in a thread (optional)" },
      },
      required: ["channel", "text"],
    },
  },

  slack_read_channel: {
    name: "slack_read_channel",
    description:
      "Read the most recent messages of a Slack channel. Requires the channels:history scope on the Slack app; if Slack answers missing_scope, tell the user which scope to add instead of retrying.",
    input_schema: {
      type: "object",
      properties: {
        channel: { type: "string", description: "Channel id (from slack_list_channels)" },
        limit: { type: "integer", description: "Max messages to return (default 30, max 50)" },
      },
      required: ["channel"],
    },
  },

  // ── HubSpot ───────────────────────────────────────────────────────────────
  hubspot_search_contacts: {
    name: "hubspot_search_contacts",
    description:
      "Search HubSpot contacts (query matches the email). Returns email, name, company, phone and lifecycle stage.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Text to search in the contact email (optional: omit to list recent contacts)" },
        limit: { type: "integer", description: "Max contacts to return (default 20, max 50)" },
      },
    },
  },

  hubspot_get_contact: {
    name: "hubspot_get_contact",
    description: "Read one HubSpot contact by contactId or by email.",
    input_schema: {
      type: "object",
      properties: {
        contactId: { type: "string", description: "HubSpot contact id" },
        email: { type: "string", description: "Contact email (alternative to contactId)" },
      },
    },
  },

  hubspot_create_contact: {
    name: "hubspot_create_contact",
    description:
      "Create a HubSpot contact. An email is mandatory (HubSpot has no contact without email). Confirm with the user before creating, since it writes to their CRM.",
    input_schema: {
      type: "object",
      properties: {
        email: { type: "string", description: "Contact email (required)" },
        values: {
          type: "string",
          description:
            'Other properties as key=value pairs separated by ";" (e.g. firstname=Mario;lastname=Rossi;company=Acme;phone=+39...). Supported: firstname, lastname, company, phone, jobtitle, lifecyclestage',
        },
      },
      required: ["email"],
    },
  },

  hubspot_update_contact: {
    name: "hubspot_update_contact",
    description:
      "Update properties of an existing HubSpot contact, by contactId or email. Show the user what will change before calling it.",
    input_schema: {
      type: "object",
      properties: {
        contactId: { type: "string", description: "HubSpot contact id" },
        email: { type: "string", description: "Contact email (alternative to contactId)" },
        values: {
          type: "string",
          description:
            'Properties to update as key=value pairs separated by ";" (e.g. lifecyclestage=qualified;company=Acme)',
        },
      },
      required: ["values"],
    },
  },

  hubspot_list_companies: {
    name: "hubspot_list_companies",
    description: "List companies in the connected HubSpot portal (name, domain, industry, city).",
    input_schema: {
      type: "object",
      properties: {
        limit: { type: "integer", description: "Max companies to return (default 20, max 50)" },
      },
    },
  },

  // --- Google Drive --------------------------------------------------------
  // Solo lettura: `drive_create_file` è escluso di proposito in questo batch,
  // vedi Open Decision 14 (non esiste ancora un meccanismo di conferma utente
  // fra handler e UI).

  drive_search_files: {
    name: "drive_search_files",
    description:
      "Search files by name in the connected Google Drive. Use plain words, not Drive query syntax. Returns name, type, id, modified date and link. Use the returned id with drive_read_file.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Words to look for in file names (e.g. 'budget 2026'). All must match.",
        },
        folderId: {
          type: "string",
          description: "Optional folder id to restrict the search to that folder",
        },
        limit: { type: "integer", description: "Max files to return (default 20, max 50)" },
      },
      required: ["query"],
    },
  },

  drive_read_file: {
    name: "drive_read_file",
    description:
      "Read the text content of a Google Drive file by its id. Handles Google Docs, Sheets, Slides and plain text/CSV/PDF files. Long files are truncated, and the output says so. Use drive_search_files or drive_list_folder to find the id.",
    input_schema: {
      type: "object",
      properties: {
        fileId: { type: "string", description: "The Drive file id (from search/list output)" },
      },
      required: ["fileId"],
    },
  },

  drive_list_folder: {
    name: "drive_list_folder",
    description:
      "List files and subfolders inside a Google Drive folder. Returns names, types, ids and links, so ids can be passed to drive_read_file or used to walk into a subfolder.",
    input_schema: {
      type: "object",
      properties: {
        folderId: {
          type: "string",
          description: "Folder id. Omit to list the top level of 'My Drive'.",
        },
        limit: { type: "integer", description: "Max items to return (default 20, max 50)" },
      },
    },
  },

  // --- Airtable ------------------------------------------------------------
  // Sola lettura: create/update esclusi per Open Decision 14 (manca il
  // meccanismo di conferma fra handler e UI).

  airtable_list_bases: {
    name: "airtable_list_bases",
    description:
      "List the Airtable bases shared with the connected account, with their base ids and permission level. Use the returned id with airtable_list_tables.",
    input_schema: {
      type: "object",
      properties: {},
    },
  },

  airtable_list_tables: {
    name: "airtable_list_tables",
    description:
      "List the tables (and views) inside an Airtable base, with their table ids. Use the returned id with airtable_list_records.",
    input_schema: {
      type: "object",
      properties: {
        baseId: {
          type: "string",
          description: "Airtable base id, e.g. appXXXXXXXXXXXXXX (from airtable_list_bases)",
        },
      },
      required: ["baseId"],
    },
  },

  airtable_list_records: {
    name: "airtable_list_records",
    description:
      "List records of an Airtable table. The filter accepts plain language: 'Status: Open' filters a field by value, a bare word searches across the record. Returns record ids and the first fields, so ids can be reused.",
    input_schema: {
      type: "object",
      properties: {
        baseId: { type: "string", description: "Airtable base id (app...)" },
        tableId: {
          type: "string",
          description: "Airtable table id (tbl...)",
        },
        filter: {
          type: "string",
          description:
            'Optional filter in plain language: "Status: Open", "Stage = Won", or a bare word to search across the record',
        },
        limit: { type: "integer", description: "Max records to return (default 20, max 50)" },
      },
      required: ["baseId", "tableId"],
    },
  },

  // --- Trello --------------------------------------------------------------
  // Sola lettura: create/move/comment esclusi per Open Decision 14.

  trello_list_boards: {
    name: "trello_list_boards",
    description:
      "List the open Trello boards of the connected account, with board ids. Use the returned id with trello_list_cards.",
    input_schema: {
      type: "object",
      properties: {},
    },
  },

  trello_list_cards: {
    name: "trello_list_cards",
    description:
      "List Trello cards. Give boardId to list every card of a board, or listId to list only one list. Returns card names, due dates, ids and links.",
    input_schema: {
      type: "object",
      properties: {
        boardId: { type: "string", description: "Trello board id (from trello_list_boards)" },
        listId: {
          type: "string",
          description: "Trello list id, to restrict to one list (optional)",
        },
        limit: { type: "integer", description: "Max cards to return (default 20, max 50)" },
      },
    },
  },

  // --- WooCommerce ---------------------------------------------------------
  // Sola lettura. Restano esclusi woo_update_stock e woo_update_order_status:
  // Open Decision 14 (manca il meccanismo di conferma fra handler e UI). Sono
  // le due azioni più sensibili del batch: modificano giacenza e stato ordine.

  woo_list_products: {
    name: "woo_list_products",
    description:
      "List products of the connected WooCommerce store, most recent first, with title, price, availability, SKU and id. Use the returned id with woo_get_product.",
    input_schema: {
      type: "object",
      properties: {
        search: { type: "string", description: "Optional text to match in product name" },
        limit: { type: "integer", description: "Max products to return (default 20, max 50)" },
      },
    },
  },

  woo_get_product: {
    name: "woo_get_product",
    description:
      "Read one WooCommerce product by id, with full description, stock status and price. Use the id from woo_list_products.",
    input_schema: {
      type: "object",
      properties: {
        productId: { type: "string", description: "WooCommerce product id (a number)" },
      },
      required: ["productId"],
    },
  },

  woo_list_orders: {
    name: "woo_list_orders",
    description:
      "List recent WooCommerce orders, most recent first: number, status, total, customer and lines. Optionally filter by status (processing, completed, on-hold, cancelled...).",
    input_schema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          description: "Optional WooCommerce order status, e.g. processing or completed",
        },
        limit: { type: "integer", description: "Max orders to return (default 20, max 50)" },
      },
    },
  },

  woo_get_order: {
    name: "woo_get_order",
    description:
      "Read one WooCommerce order by id, with status, total, customer billing details and every line. Use the id from woo_list_orders.",
    input_schema: {
      type: "object",
      properties: {
        orderId: { type: "string", description: "WooCommerce order id (a number)" },
      },
      required: ["orderId"],
    },
  },

  woo_get_customer: {
    name: "woo_get_customer",
    description:
      "Read a WooCommerce customer by email or by customer id: name, email, total spent and signup date.",
    input_schema: {
      type: "object",
      properties: {
        customer: {
          type: "string",
          description: "Customer email (searched) or customer id (a number)",
        },
      },
      required: ["customer"],
    },
  },
};

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function executeIntegrationTool(
  name: string,
  input: Record<string, string>,
  context: ToolContext,
): Promise<string> {
  const tenantId = resolveTenant(context);

  switch (name) {
    case "github_list_repos": {
      const r = await githubApiProxy("listRepos", { limit: parseLimit(input.limit) }, tenantId);
      return r.ok ? r.data : r.error;
    }

    case "github_list_issues": {
      const owner = clean(input.owner, 200);
      const repo = clean(input.repo, 200);
      if (!owner || !repo) return "github_list_issues requires owner and repo.";
      const r = await githubApiProxy(
        "listIssues",
        { owner, repo, state: input.state || "open", limit: parseLimit(input.limit) },
        tenantId,
      );
      return r.ok ? r.data : r.error;
    }

    case "github_create_issue": {
      const owner = clean(input.owner, 200);
      const repo = clean(input.repo, 200);
      const title = clean(input.title, 300);
      if (!owner || !repo || !title) return "github_create_issue requires owner, repo and title.";
      const r = await githubApiProxy(
        "createIssue",
        { owner, repo, title, body: input.body ? clean(input.body, 8000) : undefined },
        tenantId,
      );
      return r.ok ? r.data : r.error;
    }

    case "clickup_list_spaces": {
      const r = await clickupApiProxy("listSpaces", {}, tenantId);
      return r.ok ? r.data : r.error;
    }

    case "clickup_list_tasks": {
      const listId = input.listId ? clean(input.listId, 200) : undefined;
      const r = await clickupApiProxy(
        "listTasks",
        { listId, limit: parseLimit(input.limit) },
        tenantId,
      );
      return r.ok ? r.data : r.error;
    }

    case "clickup_create_task": {
      const listId = clean(input.listId, 200);
      const title = clean(input.title, 300);
      if (!listId || !title) return "clickup_create_task requires listId and title.";
      const r = await clickupApiProxy(
        "createTask",
        { listId, title, description: input.description ? clean(input.description, 8000) : undefined },
        tenantId,
      );
      return r.ok ? r.data : r.error;
    }

    case "asana_list_workspaces": {
      const r = await asanaApiProxy("listWorkspaces", {}, tenantId);
      return r.ok ? r.data : r.error;
    }

    case "asana_list_projects": {
      const workspaceId = clean(input.workspaceId, 200);
      if (!workspaceId) return "asana_list_projects requires workspaceId.";
      const r = await asanaApiProxy(
        "listProjects",
        { workspaceId, limit: parseLimit(input.limit) },
        tenantId,
      );
      return r.ok ? r.data : r.error;
    }

    case "asana_list_tasks": {
      const projectId = clean(input.projectId, 200);
      if (!projectId) return "asana_list_tasks requires projectId.";
      const r = await asanaApiProxy(
        "listTasks",
        { projectId, limit: parseLimit(input.limit) },
        tenantId,
      );
      return r.ok ? r.data : r.error;
    }

    case "asana_create_task": {
      const taskName = clean(input.taskName, 300);
      if (!taskName) return "asana_create_task requires taskName.";
      const projectId = input.projectId ? clean(input.projectId, 200) : undefined;
      const workspaceId = input.workspaceId ? clean(input.workspaceId, 200) : undefined;
      if (!projectId && !workspaceId) return "asana_create_task requires projectId or workspaceId.";
      const r = await asanaApiProxy(
        "createTask",
        {
          taskName,
          projectId,
          workspaceId,
          notes: input.notes ? clean(input.notes, 8000) : undefined,
        },
        tenantId,
      );
      return r.ok ? r.data : r.error;
    }

    // ── Notion ──────────────────────────────────────────────────────────────
    case "notion_search": {
      const query = clean(input.query, 200);
      if (!query) return "notion_search requires a query.";
      const r = await notionApiProxy("search", { query, limit: parseLimit(input.limit) }, tenantId);
      return r.ok ? r.data : r.error;
    }

    case "notion_read_page": {
      const pageId = clean(input.pageId, 100);
      if (!pageId) return "notion_read_page requires pageId.";
      const r = await notionApiProxy("readPage", { pageId }, tenantId);
      return r.ok ? r.data : r.error;
    }

    case "notion_create_page": {
      const pageId = clean(input.pageId, 100);
      const title = clean(input.title, 200);
      if (!pageId) return "notion_create_page requires pageId (the parent page).";
      if (!title) return "notion_create_page requires a title.";
      const r = await notionApiProxy(
        "createPage",
        { pageId, title, content: input.content ? clean(input.content, 10000) : undefined },
        tenantId,
      );
      return r.ok ? r.data : r.error;
    }

    case "notion_append_blocks": {
      const pageId = clean(input.pageId, 100);
      const content = clean(input.content, 10000);
      if (!pageId) return "notion_append_blocks requires pageId.";
      if (!content) return "notion_append_blocks requires content.";
      const r = await notionApiProxy("appendBlocks", { pageId, content }, tenantId);
      return r.ok ? r.data : r.error;
    }

    // ── Slack ───────────────────────────────────────────────────────────────
    case "slack_list_channels": {
      const r = await slackApiProxy("listChannels", { limit: parseLimit(input.limit) }, tenantId);
      return r.ok ? r.data : r.error;
    }

    case "slack_post_message": {
      const channel = clean(input.channel, 100);
      const text = clean(input.text, 3800);
      if (!channel) return "slack_post_message requires channel (call slack_list_channels to get the id).";
      if (!text) return "slack_post_message requires text.";
      const threadTs = input.threadTs ? clean(input.threadTs, 40) : undefined;
      const r = await slackApiProxy("postMessage", { channel, text, threadTs }, tenantId);
      return r.ok ? r.data : r.error;
    }

    case "slack_read_channel": {
      const channel = clean(input.channel, 100);
      if (!channel) return "slack_read_channel requires channel (call slack_list_channels to get the id).";
      const r = await slackApiProxy(
        "readChannel",
        { channel, limit: parseLimit(input.limit) },
        tenantId,
      );
      return r.ok ? r.data : r.error;
    }

    // ── HubSpot ─────────────────────────────────────────────────────────────
    case "hubspot_search_contacts": {
      const query = clean(input.query, 200);
      const r = await hubspotApiProxy(
        "searchContacts",
        { query: query || undefined, limit: parseLimit(input.limit) },
        tenantId,
      );
      return r.ok ? r.data : r.error;
    }

    case "hubspot_get_contact": {
      const contactId = input.contactId ? clean(input.contactId, 100) : undefined;
      const email = input.email ? clean(input.email, 200) : undefined;
      if (!contactId && !email) return "hubspot_get_contact requires contactId or email.";
      const r = await hubspotApiProxy("getContact", { contactId, email }, tenantId);
      return r.ok ? r.data : r.error;
    }

    case "hubspot_create_contact": {
      const email = clean(input.email, 200);
      const values = input.values ? clean(input.values, 1000) : undefined;
      if (!email && !values) return "hubspot_create_contact requires an email.";
      const r = await hubspotApiProxy("createContact", { email, values }, tenantId);
      return r.ok ? r.data : r.error;
    }

    case "hubspot_update_contact": {
      const values = input.values ? clean(input.values, 1000) : undefined;
      if (!values) return "hubspot_update_contact requires values (key=value;key=value).";
      const contactId = input.contactId ? clean(input.contactId, 100) : undefined;
      const email = input.email ? clean(input.email, 200) : undefined;
      if (!contactId && !email) return "hubspot_update_contact requires contactId or email.";
      const r = await hubspotApiProxy("updateContact", { contactId, email, values }, tenantId);
      return r.ok ? r.data : r.error;
    }

    case "hubspot_list_companies": {
      const r = await hubspotApiProxy(
        "listCompanies",
        { limit: parseLimit(input.limit) },
        tenantId,
      );
      return r.ok ? r.data : r.error;
    }

    case "drive_search_files": {
      const query = clean(input.query, 300);
      if (!query) return "drive_search_files requires query.";
      const folderId = input.folderId ? clean(input.folderId, 200) : undefined;
      const r = await driveApiProxy(
        "searchFiles",
        { query, folderId, limit: parseLimit(input.limit) },
        tenantId,
      );
      return r.ok ? r.data : r.error;
    }

    case "drive_read_file": {
      const fileId = clean(input.fileId, 200);
      if (!fileId) return "drive_read_file requires fileId.";
      const r = await driveApiProxy("readFile", { fileId }, tenantId);
      return r.ok ? r.data : r.error;
    }

    case "drive_list_folder": {
      const folderId = input.folderId ? clean(input.folderId, 200) : undefined;
      const r = await driveApiProxy(
        "listFolder",
        { folderId, limit: parseLimit(input.limit) },
        tenantId,
      );
      return r.ok ? r.data : r.error;
    }

    case "airtable_list_bases": {
      const r = await airtableApiProxy("listBases", {}, tenantId);
      return r.ok ? r.data : r.error;
    }

    case "airtable_list_tables": {
      const baseId = clean(input.baseId, 60);
      if (!baseId) return "airtable_list_tables requires baseId.";
      const r = await airtableApiProxy("listTables", { baseId }, tenantId);
      return r.ok ? r.data : r.error;
    }

    case "airtable_list_records": {
      const baseId = clean(input.baseId, 60);
      const tableId = clean(input.tableId, 60);
      if (!baseId || !tableId) return "airtable_list_records requires baseId and tableId.";
      const filter = input.filter ? clean(input.filter, 300) : undefined;
      const r = await airtableApiProxy(
        "listRecords",
        { baseId, tableId, filter, limit: parseLimit(input.limit) },
        tenantId,
      );
      return r.ok ? r.data : r.error;
    }

    case "trello_list_boards": {
      const r = await trelloApiProxy("listBoards", {}, tenantId);
      return r.ok ? r.data : r.error;
    }

    case "trello_list_cards": {
      const boardId = input.boardId ? clean(input.boardId, 60) : undefined;
      const listId = input.listId ? clean(input.listId, 60) : undefined;
      const r = await trelloApiProxy(
        "listCards",
        { boardId, listId, limit: parseLimit(input.limit) },
        tenantId,
      );
      return r.ok ? r.data : r.error;
    }

    case "woo_list_products": {
      const r = await wooApiProxy(
        "listProducts",
        { search: input.search ? clean(input.search, 200) : undefined, limit: parseLimit(input.limit) },
        tenantId,
      );
      return r.ok ? r.data : r.error;
    }

    case "woo_get_product": {
      const productId = clean(input.productId, 40);
      if (!productId) return "woo_get_product requires productId.";
      const r = await wooApiProxy("getProduct", { productId }, tenantId);
      return r.ok ? r.data : r.error;
    }

    case "woo_list_orders": {
      const r = await wooApiProxy(
        "listOrders",
        { status: input.status ? clean(input.status, 40) : undefined, limit: parseLimit(input.limit) },
        tenantId,
      );
      return r.ok ? r.data : r.error;
    }

    case "woo_get_order": {
      const orderId = clean(input.orderId, 40);
      if (!orderId) return "woo_get_order requires orderId.";
      const r = await wooApiProxy("getOrder", { orderId }, tenantId);
      return r.ok ? r.data : r.error;
    }

    case "woo_get_customer": {
      const customer = clean(input.customer, 200);
      if (!customer) return "woo_get_customer requires customer (id or email).";
      const r = await wooApiProxy("getCustomer", { customer }, tenantId);
      return r.ok ? r.data : r.error;
    }

    default:
      return `Tool "${name}" is not implemented`;
  }
}
