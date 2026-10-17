import type { LLMTool } from "@/lib/llm";
import type { ToolContext } from "./tool-context";
import {
  githubApiProxy,
  clickupApiProxy,
  asanaApiProxy,
  notionApiProxy,
  slackApiProxy,
  hubspotApiProxy,
  driveApiProxy,
  docsApiProxy,
  formsApiProxy,
  gaApiProxy,
  airtableApiProxy,
  trelloApiProxy,
  wooApiProxy,
  mailchimpApiProxy,
  mailchimpWriteProxy,
} from "@/lib/integrations/api-proxy";
import {
  MICROSOFT_TOOL_NAMES,
  MICROSOFT_TOOL_DEFINITIONS,
  isMicrosoftTool,
  executeMicrosoftTool,
} from "./microsoft-tools";
import {
  OUTLOOK_TOOL_NAMES,
  OUTLOOK_TOOL_DEFINITIONS,
  isOutlookTool,
  executeOutlookTool,
} from "./outlook-tools";

/**
 * Tool agente per le integrazioni: GitHub / ClickUp / Asana / Notion / Slack /
 * HubSpot / Google Drive / Airtable / Trello / WooCommerce / Mailchimp.
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
  "docs_create_document",
  "docs_read_document",
  "docs_append_to_document",
  "docs_replace_text",
  "docs_insert_table",
  "docs_export_pdf",
  "forms_create_form",
  "forms_add_question",
  "forms_update_form",
  "forms_get_form",
  "forms_list_responses",
  "forms_get_response_summary",
  "forms_export_to_sheet",
  "ga_list_properties",
  "ga_run_report",
  "ga_traffic_summary",
  "ga_top_pages",
  "ga_conversions",
  "ga_compare_periods",
  "ga_detect_anomalies",
  "mailchimp_upsert_contact",
  "mailchimp_add_tags",
  "mailchimp_create_campaign_draft",
  "mailchimp_set_campaign_content",
  "mailchimp_get_campaign_report",
  "mailchimp_schedule_campaign",
  "mailchimp_send_campaign",
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
  "mailchimp_list_audiences",
  "mailchimp_get_audience_stats",
  "mailchimp_list_campaigns",
  // Microsoft 365 (Word/Excel/PowerPoint/OneNote). Le definizioni e gli handler
  // vivono in ./microsoft-tools: qui resta solo il nome, così `isIntegrationTool`
  // continua a essere l'unico punto che decide il dispatch.
  ...MICROSOFT_TOOL_NAMES,
  // Microsoft Outlook (email + calendario, provider `microsoft_outlook`).
  // Stesso pattern: definizioni e handler in ./outlook-tools.
  ...OUTLOOK_TOOL_NAMES,
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

  // --- Google Docs ----------------------------------------------------------
  // Creazione e lettura libere; le modifiche a documenti esistenti (append,
  // replace, tabelle) operano solo sui documenti che l'utente indica o che
  // l'agente ha creato — mai scansioni globali del Drive.

  docs_create_document: {
    name: "docs_create_document",
    description:
      "Create a new Google Doc from a title and Markdown (headings, lists, tables, bold, links are converted). Returns the document link. Use this to save chat deliverables to Docs.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Document title, e.g. 'Q1 report'" },
        markdown: { type: "string", description: "Content as Markdown" },
      },
      required: ["title"],
    },
  },

  docs_read_document: {
    name: "docs_read_document",
    description:
      "Read the text of a Google Doc by its id (from docs_create_document or given by the user). Long documents are truncated, and the output says so.",
    input_schema: {
      type: "object",
      properties: {
        documentId: { type: "string", description: "The Google Doc id" },
      },
      required: ["documentId"],
    },
  },

  docs_append_to_document: {
    name: "docs_append_to_document",
    description:
      "Append Markdown content at the end of an existing Google Doc (keeps current content). Give the document id and the Markdown to add.",
    input_schema: {
      type: "object",
      properties: {
        documentId: { type: "string", description: "The Google Doc id" },
        markdown: { type: "string", description: "Markdown to append" },
      },
      required: ["documentId", "markdown"],
    },
  },

  docs_replace_text: {
    name: "docs_replace_text",
    description:
      "Replace text inside a Google Doc (all occurrences, case-insensitive). Show the user what will change before calling it.",
    input_schema: {
      type: "object",
      properties: {
        documentId: { type: "string", description: "The Google Doc id" },
        find: { type: "string", description: "Text to find" },
        replace: { type: "string", description: "Replacement text" },
      },
      required: ["documentId", "find", "replace"],
    },
  },

  docs_insert_table: {
    name: "docs_insert_table",
    description:
      "Insert a real table at the end of a Google Doc. Rows is an array of arrays of strings; the first row becomes the bold header.",
    input_schema: {
      type: "object",
      properties: {
        documentId: { type: "string", description: "The Google Doc id" },
        rows: {
          type: "array",
          description: 'Table rows, e.g. [["Name","Price"],["Widget","10"]]',
          items: { type: "array", items: { type: "string" } },
        },
      },
      required: ["documentId", "rows"],
    },
  },

  docs_export_pdf: {
    name: "docs_export_pdf",
    description:
      "Explain how to download a Google Doc as PDF (opens the doc, File > Download). Read-only helper: it does not modify anything.",
    input_schema: {
      type: "object",
      properties: {
        documentId: { type: "string", description: "The Google Doc id" },
      },
      required: ["documentId"],
    },
  },

  // --- Google Forms ----------------------------------------------------------
  // Creazione e lettura libere; le risposte si leggono on-demand con
  // deduplica per responseId (niente Pub/Sub, niente worker: costo zero).

  forms_create_form: {
    name: "forms_create_form",
    description:
      "Create a Google Form from title, description and questions [{title, type, options?, required?}]. Types: text, paragraph, choice, dropdown, checkbox, scale, date. Every form includes a privacy notice by default. Returns the edit link and the fill link.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Form title" },
        description: { type: "string", description: "Form description (optional, privacy notice is added by default)" },
        questions: {
          type: "array",
          description: "Questions: [{title, type, options?: string[], required?: boolean}]",
          items: { type: "object" },
        },
      },
      required: ["title"],
    },
  },

  forms_add_question: {
    name: "forms_add_question",
    description:
      "Add one question to an existing Google Form (appended at the end). Same question format as forms_create_form.",
    input_schema: {
      type: "object",
      properties: {
        formId: { type: "string", description: "The form id" },
        question: {
          type: "object",
          description: "Question: {title, type, options?, required?, description?}",
        },
      },
      required: ["formId", "question"],
    },
  },

  forms_update_form: {
    name: "forms_update_form",
    description:
      "Update a Google Form title and/or description. Show what will change before calling it.",
    input_schema: {
      type: "object",
      properties: {
        formId: { type: "string", description: "The form id" },
        title: { type: "string" },
        description: { type: "string" },
      },
      required: ["formId"],
    },
  },

  forms_get_form: {
    name: "forms_get_form",
    description:
      "Read a Google Form structure (title, description, questions) with edit and fill links.",
    input_schema: {
      type: "object",
      properties: {
        formId: { type: "string", description: "The form id" },
      },
      required: ["formId"],
    },
  },

  forms_list_responses: {
    name: "forms_list_responses",
    description:
      "List responses of a Google Form (deduplicated by responseId), newest scheme first. Read-only.",
    input_schema: {
      type: "object",
      properties: {
        formId: { type: "string", description: "The form id" },
        limit: { type: "integer", description: "Max responses (default 20, max 50)" },
      },
      required: ["formId"],
    },
  },

  forms_get_response_summary: {
    name: "forms_get_response_summary",
    description:
      "Aggregated summary of a Google Form responses: counts, per-question distribution and recent examples. Computed on downloaded data. Read-only.",
    input_schema: {
      type: "object",
      properties: {
        formId: { type: "string", description: "The form id" },
      },
      required: ["formId"],
    },
  },

  forms_export_to_sheet: {
    name: "forms_export_to_sheet",
    description:
      "Export all form responses to a Google Sheet (creates one if spreadsheetId is omitted). Requires Google Sheets connected too. Read the responses, writes rows — confirm the target sheet with the user first.",
    input_schema: {
      type: "object",
      properties: {
        formId: { type: "string", description: "The form id" },
        spreadsheetId: { type: "string", description: "Target spreadsheet id (optional: a new one is created)" },
      },
      required: ["formId"],
    },
  },

  // --- Google Analytics 4 (sola lettura) --------------------------------------
  // Solo metriche aggregate; nessun identificativo utente. I report restano in
  // cache 30 minuti: l'output dice sempre "dati aggiornati alle HH:MM".

  ga_list_properties: {
    name: "ga_list_properties",
    description:
      "List the GA4 accounts and properties the connected Google account can access. Returns property ids (properties/...) to use with the other ga_ tools. Ask the user which properties to use.",
    input_schema: { type: "object", properties: {} },
  },

  ga_run_report: {
    name: "ga_run_report",
    description:
      "Run a custom GA4 report. Dimensions whitelist: date, pagePath, pageTitle, sessionSource, sessionMedium, sessionCampaign, deviceCategory, country, city. Metrics whitelist: sessions, totalUsers, newUsers, screenPageViews, engagementRate, bounceRate, averageSessionDuration, conversions, eventCount.",
    input_schema: {
      type: "object",
      properties: {
        property: { type: "string", description: 'Property id, e.g. "properties/123456789"' },
        dimensions: { type: "array", description: "Dimensions from the whitelist", items: { type: "string" } },
        metrics: { type: "array", description: "Metrics from the whitelist", items: { type: "string" } },
        startDate: { type: "string", description: "YYYY-MM-DD or NdaysAgo (default 28daysAgo)" },
        endDate: { type: "string", description: "YYYY-MM-DD or today (default today)" },
        limit: { type: "integer", description: "Max rows (default 10, max 50)" },
      },
      required: ["property", "metrics"],
    },
  },

  ga_traffic_summary: {
    name: "ga_traffic_summary",
    description:
      "Traffic overview of a GA4 property (sessions, users, new users, pageviews, engagement rate) for a date range. Cached 30 minutes.",
    input_schema: {
      type: "object",
      properties: {
        property: { type: "string", description: 'Property id, e.g. "properties/123456789"' },
        startDate: { type: "string", description: "Default 28daysAgo" },
        endDate: { type: "string", description: "Default today" },
      },
      required: ["property"],
    },
  },

  ga_top_pages: {
    name: "ga_top_pages",
    description:
      "Most visited pages of a GA4 property (pageviews + users, descending). Cached 30 minutes.",
    input_schema: {
      type: "object",
      properties: {
        property: { type: "string", description: 'Property id, e.g. "properties/123456789"' },
        startDate: { type: "string", description: "Default 28daysAgo" },
        endDate: { type: "string", description: "Default today" },
        limit: { type: "integer", description: "Max pages (default 10, max 50)" },
      },
      required: ["property"],
    },
  },

  ga_conversions: {
    name: "ga_conversions",
    description:
      "Daily conversions (and sessions) of a GA4 property for a date range. Cached 30 minutes.",
    input_schema: {
      type: "object",
      properties: {
        property: { type: "string", description: 'Property id, e.g. "properties/123456789"' },
        startDate: { type: "string", description: "Default 28daysAgo" },
        endDate: { type: "string", description: "Default today" },
      },
      required: ["property"],
    },
  },

  ga_compare_periods: {
    name: "ga_compare_periods",
    description:
      "Compare two date ranges of a GA4 property (sessions, users, pageviews, conversions with % deltas).",
    input_schema: {
      type: "object",
      properties: {
        property: { type: "string", description: 'Property id, e.g. "properties/123456789"' },
        startDate: { type: "string", description: "Current period start (YYYY-MM-DD)" },
        endDate: { type: "string", description: "Current period end (YYYY-MM-DD)" },
        compareStartDate: { type: "string", description: "Previous period start (YYYY-MM-DD)" },
        compareEndDate: { type: "string", description: "Previous period end (YYYY-MM-DD)" },
      },
      required: ["property", "startDate", "endDate", "compareStartDate", "compareEndDate"],
    },
  },

  ga_detect_anomalies: {
    name: "ga_detect_anomalies",
    description:
      "Detect traffic anomalies of a GA4 property (daily sessions, last 90 days, z-score). Computed on downloaded data. Read-only.",
    input_schema: {
      type: "object",
      properties: {
        property: { type: "string", description: 'Property id, e.g. "properties/123456789"' },
      },
      required: ["property"],
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

  // --- Mailchimp ------------------------------------------------------------
  // Lettura + scritture GDPR: upsert solo con consenso esplicito, niente
  // risottoscrizioni di unsubscribed/cleaned, invio bloccato se il
  // compliance-check è rosso. schedule/send richiedono approvazione
  // (tool-confirmation.ts).

  mailchimp_list_audiences: {
    name: "mailchimp_list_audiences",
    description:
      "List the Mailchimp audiences (lists) of the connected account with their ids and key stats: subscribers, open rate, click rate. Use the returned id with mailchimp_get_audience_stats.",
    input_schema: {
      type: "object",
      properties: {
        limit: { type: "integer", description: "Max audiences to return (default 20, max 50)" },
      },
    },
  },

  mailchimp_get_audience_stats: {
    name: "mailchimp_get_audience_stats",
    description:
      "Read the detailed stats of one Mailchimp audience: total subscribers, unsubscribes, open rate, click rate. Use the id from mailchimp_list_audiences.",
    input_schema: {
      type: "object",
      properties: {
        listId: { type: "string", description: "Mailchimp audience (list) id" },
      },
      required: ["listId"],
    },
  },

  mailchimp_list_campaigns: {
    name: "mailchimp_list_campaigns",
    description:
      "List recent Mailchimp campaigns, newest first: title, status, send date, emails sent, open and click rate. Read-only: this cannot send or schedule a campaign.",
    input_schema: {
      type: "object",
      properties: {
        limit: { type: "integer", description: "Max campaigns to return (default 20, max 50)" },
      },
    },
  },

  // --- Mailchimp scritture (GDPR integrato) -----------------------------------
  // upsert solo con consenso esplicito (subscribed = consent_basis + data);
  // unsubscribed/cleaned mai risottoscritti; invio bloccato se il
  // compliance-check è rosso. schedule/send richiedono approvazione esplicita.

  mailchimp_upsert_contact: {
    name: "mailchimp_upsert_contact",
    description:
      "Add or update a Mailchimp contact (idempotent). For status subscribed you MUST provide consentBasis (e.g. 'website form 2026-10-13') and consentDate (YYYY-MM-DD); without them use pending (double opt-in). Never resubscribes unsubscribed/cleaned contacts.",
    input_schema: {
      type: "object",
      properties: {
        listId: { type: "string", description: "Mailchimp audience id" },
        email: { type: "string", description: "Contact email" },
        status: { type: "string", description: "subscribed (needs consent), pending, unsubscribed, transactional" },
        consentBasis: { type: "string", description: "Explicit consent basis, required for subscribed" },
        consentDate: { type: "string", description: "Consent date YYYY-MM-DD, required for subscribed" },
        firstName: { type: "string" },
        lastName: { type: "string" },
        tags: { type: "array", description: "Tags to apply", items: { type: "string" } },
      },
      required: ["listId", "email", "status"],
    },
  },

  mailchimp_add_tags: {
    name: "mailchimp_add_tags",
    description:
      "Add tags to a Mailchimp contact (segments without changing subscription status).",
    input_schema: {
      type: "object",
      properties: {
        listId: { type: "string", description: "Mailchimp audience id" },
        email: { type: "string", description: "Contact email" },
        tags: { type: "array", description: "Tag names", items: { type: "string" } },
      },
      required: ["listId", "email", "tags"],
    },
  },

  mailchimp_create_campaign_draft: {
    name: "mailchimp_create_campaign_draft",
    description:
      "Create a campaign DRAFT (never sends). Requires subject, fromName (sender identity, mandatory in footer) and replyTo. Set content next with mailchimp_set_campaign_content.",
    input_schema: {
      type: "object",
      properties: {
        listId: { type: "string", description: "Mailchimp audience id" },
        subject: { type: "string", description: "Email subject" },
        fromName: { type: "string", description: "Sender name (shown in footer)" },
        replyTo: { type: "string", description: "Reply-to email" },
        title: { type: "string", description: "Internal campaign title (optional)" },
      },
      required: ["listId", "subject", "fromName", "replyTo"],
    },
  },

  mailchimp_set_campaign_content: {
    name: "mailchimp_set_campaign_content",
    description:
      "Set the HTML content of a campaign draft. Include an unsubscribe link and the sender footer.",
    input_schema: {
      type: "object",
      properties: {
        campaignId: { type: "string", description: "Campaign id from the draft" },
        html: { type: "string", description: "Campaign HTML content" },
      },
      required: ["campaignId", "html"],
    },
  },

  mailchimp_get_campaign_report: {
    name: "mailchimp_get_campaign_report",
    description:
      "Read a campaign status, stats (sent, open/click rate) and its live compliance check (GREEN = ready to schedule/send, RED = sending is blocked with reasons). Read-only.",
    input_schema: {
      type: "object",
      properties: {
        campaignId: { type: "string", description: "Campaign id" },
      },
      required: ["campaignId"],
    },
  },

  mailchimp_schedule_campaign: {
    name: "mailchimp_schedule_campaign",
    description:
      "SCHEDULE a campaign for a future ISO datetime. Requires explicit user confirmation before running. Blocked when the compliance check is red.",
    input_schema: {
      type: "object",
      properties: {
        campaignId: { type: "string", description: "Campaign id" },
        scheduleTime: { type: "string", description: "Future ISO datetime" },
      },
      required: ["campaignId", "scheduleTime"],
    },
  },

  mailchimp_send_campaign: {
    name: "mailchimp_send_campaign",
    description:
      "SEND a campaign immediately. Requires explicit user confirmation before running: always show subject, audience and content summary and get a clear approval first. Blocked when the compliance check is red.",
    input_schema: {
      type: "object",
      properties: {
        campaignId: { type: "string", description: "Campaign id" },
      },
      required: ["campaignId"],
    },
  },
  ...MICROSOFT_TOOL_DEFINITIONS,
  ...OUTLOOK_TOOL_DEFINITIONS,
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

  // Microsoft: i tool vivono in ./microsoft-tools. L'input arriva come JSON dal
  // modello (array/oggetti), quindi il tipo `Record<string,string>` qui è solo la
  // firma del dispatcher: la conversione difensiva sta di là.
  if (isMicrosoftTool(name)) {
    return executeMicrosoftTool(name, input as unknown as Record<string, unknown>, tenantId);
  }

  // Outlook: stesso pattern, provider `microsoft_outlook` separato.
  if (isOutlookTool(name)) {
    return executeOutlookTool(name, input as unknown as Record<string, unknown>, tenantId);
  }

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

    case "docs_create_document": {
      const title = clean(input.title, 200);
      if (!title) return "docs_create_document requires title.";
      const r = await docsApiProxy(
        "createDocument",
        { title, markdown: input.markdown ? clean(input.markdown, 60000) : undefined },
        tenantId,
      );
      return r.ok ? r.data : r.error;
    }

    case "docs_read_document": {
      const documentId = clean(input.documentId, 200);
      if (!documentId) return "docs_read_document requires documentId.";
      const r = await docsApiProxy("readDocument", { documentId }, tenantId);
      return r.ok ? r.data : r.error;
    }

    case "docs_append_to_document": {
      const documentId = clean(input.documentId, 200);
      const markdown = clean(input.markdown, 60000);
      if (!documentId) return "docs_append_to_document requires documentId.";
      if (!markdown) return "docs_append_to_document requires markdown.";
      const r = await docsApiProxy("appendContent", { documentId, markdown }, tenantId);
      return r.ok ? r.data : r.error;
    }

    case "docs_replace_text": {
      const documentId = clean(input.documentId, 200);
      const find = clean(input.find, 2000);
      if (!documentId) return "docs_replace_text requires documentId.";
      if (!find) return "docs_replace_text requires find.";
      const r = await docsApiProxy(
        "replaceText",
        { documentId, find, replace: input.replace ? clean(input.replace, 20000) : "" },
        tenantId,
      );
      return r.ok ? r.data : r.error;
    }

    case "docs_insert_table": {
      const documentId = clean(input.documentId, 200);
      if (!documentId) return "docs_insert_table requires documentId.";
      let rows: string[][] = [];
      try {
        const parsed: unknown = JSON.parse(input.rows ?? "[]");
        if (Array.isArray(parsed)) {
          rows = parsed.map((r) => (Array.isArray(r) ? r.map((c) => String(c ?? "")) : []));
        }
      } catch {
        return "docs_insert_table requires rows as an array of arrays of strings.";
      }
      if (rows.length === 0) return "docs_insert_table requires at least one row.";
      const r = await docsApiProxy("insertTable", { documentId, rows }, tenantId);
      return r.ok ? r.data : r.error;
    }

    case "docs_export_pdf": {
      const documentId = clean(input.documentId, 200);
      if (!documentId) return "docs_export_pdf requires documentId.";
      const r = await docsApiProxy("exportPdf", { documentId }, tenantId);
      return r.ok ? r.data : r.error;
    }

    case "forms_create_form": {
      const title = clean(input.title, 300);
      if (!title) return "forms_create_form requires title.";
      let questions: Record<string, unknown>[] = [];
      if (input.questions) {
        try {
          const parsed: unknown = JSON.parse(input.questions);
          if (Array.isArray(parsed)) questions = parsed as Record<string, unknown>[];
        } catch {
          return "forms_create_form requires questions as an array of {title, type, ...}.";
        }
      }
      const r = await formsApiProxy(
        "createForm",
        {
          title,
          description: input.description ? clean(input.description, 2000) : undefined,
          questions: questions.map((q) => ({
            title: String(q.title ?? ""),
            type: String(q.type ?? "text"),
            description: typeof q.description === "string" ? q.description : undefined,
            required: q.required === true,
            options: Array.isArray(q.options) ? q.options.map(String) : undefined,
          })),
        },
        tenantId,
      );
      return r.ok ? r.data : r.error;
    }

    case "forms_add_question": {
      const formId = clean(input.formId, 200);
      if (!formId) return "forms_add_question requires formId.";
      let q: Record<string, unknown>;
      try {
        const parsed: unknown = JSON.parse(input.question ?? "null");
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          throw new Error("bad shape");
        }
        q = parsed as Record<string, unknown>;
      } catch {
        return "forms_add_question requires question as {title, type, ...}.";
      }
      const r = await formsApiProxy(
        "addQuestion",
        {
          formId,
          question: {
            title: String(q.title ?? ""),
            type: String(q.type ?? "text"),
            description: typeof q.description === "string" ? q.description : undefined,
            required: q.required === true,
            options: Array.isArray(q.options) ? q.options.map(String) : undefined,
          },
        },
        tenantId,
      );
      return r.ok ? r.data : r.error;
    }

    case "forms_update_form": {
      const formId = clean(input.formId, 200);
      if (!formId) return "forms_update_form requires formId.";
      const r = await formsApiProxy(
        "updateForm",
        {
          formId,
          title: input.title ? clean(input.title, 300) : undefined,
          description: input.description !== undefined ? clean(input.description, 2000) : undefined,
        },
        tenantId,
      );
      return r.ok ? r.data : r.error;
    }

    case "forms_get_form": {
      const formId = clean(input.formId, 200);
      if (!formId) return "forms_get_form requires formId.";
      const r = await formsApiProxy("getForm", { formId }, tenantId);
      return r.ok ? r.data : r.error;
    }

    case "forms_list_responses": {
      const formId = clean(input.formId, 200);
      if (!formId) return "forms_list_responses requires formId.";
      const r = await formsApiProxy(
        "listResponses",
        { formId, limit: parseLimit(input.limit) },
        tenantId,
      );
      return r.ok ? r.data : r.error;
    }

    case "forms_get_response_summary": {
      const formId = clean(input.formId, 200);
      if (!formId) return "forms_get_response_summary requires formId.";
      const r = await formsApiProxy("getResponseSummary", { formId }, tenantId);
      return r.ok ? r.data : r.error;
    }

    case "forms_export_to_sheet": {
      const formId = clean(input.formId, 200);
      if (!formId) return "forms_export_to_sheet requires formId.";
      const r = await formsApiProxy(
        "exportToSheet",
        { formId, spreadsheetId: input.spreadsheetId ? clean(input.spreadsheetId, 200) : undefined },
        tenantId,
      );
      return r.ok ? r.data : r.error;
    }

    case "ga_list_properties": {
      const r = await gaApiProxy("listProperties", {}, tenantId);
      return r.ok ? r.data : r.error;
    }

    case "ga_run_report": {
      const property = clean(input.property, 60);
      if (!property) return "ga_run_report requires property.";
      const parseList = (v: string | undefined): string[] | undefined => {
        if (!v) return undefined;
        try {
          const parsed: unknown = JSON.parse(v);
          if (Array.isArray(parsed)) return parsed.map(String);
        } catch {
          // Il modello manda anche "sessions,totalUsers": si accetta.
        }
        return v.split(/[,\s]+/).filter(Boolean);
      };
      const r = await gaApiProxy(
        "runReport",
        {
          property,
          dimensions: parseList(input.dimensions),
          metrics: parseList(input.metrics),
          startDate: input.startDate ? clean(input.startDate, 20) : undefined,
          endDate: input.endDate ? clean(input.endDate, 20) : undefined,
          limit: parseLimit(input.limit) ?? 10,
        },
        tenantId,
      );
      return r.ok ? r.data : r.error;
    }

    case "ga_traffic_summary": {
      const property = clean(input.property, 60);
      if (!property) return "ga_traffic_summary requires property.";
      const r = await gaApiProxy(
        "getTrafficSummary",
        {
          property,
          startDate: input.startDate ? clean(input.startDate, 20) : undefined,
          endDate: input.endDate ? clean(input.endDate, 20) : undefined,
        },
        tenantId,
      );
      return r.ok ? r.data : r.error;
    }

    case "ga_top_pages": {
      const property = clean(input.property, 60);
      if (!property) return "ga_top_pages requires property.";
      const r = await gaApiProxy(
        "getTopPages",
        {
          property,
          startDate: input.startDate ? clean(input.startDate, 20) : undefined,
          endDate: input.endDate ? clean(input.endDate, 20) : undefined,
          limit: parseLimit(input.limit) ?? 10,
        },
        tenantId,
      );
      return r.ok ? r.data : r.error;
    }

    case "ga_conversions": {
      const property = clean(input.property, 60);
      if (!property) return "ga_conversions requires property.";
      const r = await gaApiProxy(
        "getConversions",
        {
          property,
          startDate: input.startDate ? clean(input.startDate, 20) : undefined,
          endDate: input.endDate ? clean(input.endDate, 20) : undefined,
        },
        tenantId,
      );
      return r.ok ? r.data : r.error;
    }

    case "ga_compare_periods": {
      const property = clean(input.property, 60);
      const startDate = clean(input.startDate, 20);
      const endDate = clean(input.endDate, 20);
      const compareStartDate = clean(input.compareStartDate, 20);
      const compareEndDate = clean(input.compareEndDate, 20);
      if (!property || !startDate || !endDate || !compareStartDate || !compareEndDate) {
        return "ga_compare_periods requires property, startDate, endDate, compareStartDate, compareEndDate.";
      }
      const r = await gaApiProxy(
        "comparePeriods",
        { property, startDate, endDate, compareStartDate, compareEndDate },
        tenantId,
      );
      return r.ok ? r.data : r.error;
    }

    case "ga_detect_anomalies": {
      const property = clean(input.property, 60);
      if (!property) return "ga_detect_anomalies requires property.";
      const r = await gaApiProxy("detectAnomalies", { property }, tenantId);
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

    case "mailchimp_list_audiences": {
      const r = await mailchimpApiProxy(
        "listAudiences",
        { limit: parseLimit(input.limit) },
        tenantId,
      );
      return r.ok ? r.data : r.error;
    }

    case "mailchimp_get_audience_stats": {
      const listId = clean(input.listId, 40);
      if (!listId) return "mailchimp_get_audience_stats requires listId.";
      const r = await mailchimpApiProxy("getAudienceStats", { listId }, tenantId);
      return r.ok ? r.data : r.error;
    }

    case "mailchimp_list_campaigns": {
      const r = await mailchimpApiProxy(
        "listCampaigns",
        { limit: parseLimit(input.limit) },
        tenantId,
      );
      return r.ok ? r.data : r.error;
    }

    case "mailchimp_upsert_contact": {
      const listId = clean(input.listId, 40);
      const email = clean(input.email, 200);
      const status = clean(input.status, 20);
      if (!listId) return "mailchimp_upsert_contact requires listId.";
      if (!email) return "mailchimp_upsert_contact requires email.";
      if (!status) return "mailchimp_upsert_contact requires status.";
      let tags: string[] | undefined;
      if (input.tags) {
        try {
          const parsed: unknown = JSON.parse(input.tags);
          if (Array.isArray(parsed)) tags = parsed.map(String);
        } catch {
          tags = input.tags.split(/[,\s]+/).filter(Boolean);
        }
      }
      const r = await mailchimpWriteProxy(
        "upsertContact",
        {
          listId,
          email,
          status,
          consentBasis: input.consentBasis ? clean(input.consentBasis, 300) : undefined,
          consentDate: input.consentDate ? clean(input.consentDate, 20) : undefined,
          firstName: input.firstName ? clean(input.firstName, 50) : undefined,
          lastName: input.lastName ? clean(input.lastName, 50) : undefined,
          tags,
        },
        tenantId,
      );
      return r.ok ? r.data : r.error;
    }

    case "mailchimp_add_tags": {
      const listId = clean(input.listId, 40);
      const email = clean(input.email, 200);
      if (!listId) return "mailchimp_add_tags requires listId.";
      if (!email) return "mailchimp_add_tags requires email.";
      let tags: string[] = [];
      try {
        const parsed: unknown = JSON.parse(input.tags ?? "[]");
        if (Array.isArray(parsed)) tags = parsed.map(String);
      } catch {
        tags = (input.tags ?? "").split(/[,\s]+/).filter(Boolean);
      }
      if (tags.length === 0) return "mailchimp_add_tags requires tags.";
      const r = await mailchimpWriteProxy("addTags", { listId, email, tags }, tenantId);
      return r.ok ? r.data : r.error;
    }

    case "mailchimp_create_campaign_draft": {
      const listId = clean(input.listId, 40);
      const subject = clean(input.subject, 200);
      const fromName = clean(input.fromName, 100);
      const replyTo = clean(input.replyTo, 100);
      if (!listId) return "mailchimp_create_campaign_draft requires listId.";
      if (!subject) return "mailchimp_create_campaign_draft requires subject.";
      if (!fromName) return "mailchimp_create_campaign_draft requires fromName.";
      if (!replyTo) return "mailchimp_create_campaign_draft requires replyTo.";
      const r = await mailchimpWriteProxy(
        "createCampaignDraft",
        {
          listId,
          subject,
          fromName,
          replyTo,
          title: input.title ? clean(input.title, 200) : undefined,
        },
        tenantId,
      );
      return r.ok ? r.data : r.error;
    }

    case "mailchimp_set_campaign_content": {
      const campaignId = clean(input.campaignId, 60);
      const html = clean(input.html, 200000);
      if (!campaignId) return "mailchimp_set_campaign_content requires campaignId.";
      if (!html) return "mailchimp_set_campaign_content requires html.";
      const r = await mailchimpWriteProxy("setCampaignContent", { campaignId, html }, tenantId);
      return r.ok ? r.data : r.error;
    }

    case "mailchimp_get_campaign_report": {
      const campaignId = clean(input.campaignId, 60);
      if (!campaignId) return "mailchimp_get_campaign_report requires campaignId.";
      const r = await mailchimpWriteProxy("getCampaignReport", { campaignId }, tenantId);
      return r.ok ? r.data : r.error;
    }

    case "mailchimp_schedule_campaign": {
      const campaignId = clean(input.campaignId, 60);
      const scheduleTime = clean(input.scheduleTime, 40);
      if (!campaignId) return "mailchimp_schedule_campaign requires campaignId.";
      if (!scheduleTime) return "mailchimp_schedule_campaign requires scheduleTime.";
      const r = await mailchimpWriteProxy("scheduleCampaign", { campaignId, scheduleTime }, tenantId);
      return r.ok ? r.data : r.error;
    }

    case "mailchimp_send_campaign": {
      const campaignId = clean(input.campaignId, 60);
      if (!campaignId) return "mailchimp_send_campaign requires campaignId.";
      const r = await mailchimpWriteProxy("sendCampaign", { campaignId }, tenantId);
      return r.ok ? r.data : r.error;
    }

    default:
      return `Tool "${name}" is not implemented`;
  }
}
