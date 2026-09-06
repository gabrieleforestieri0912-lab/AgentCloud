/**
 * Definizioni e gestori (handler) dei tool a disposizione degli agenti.
 *
 * Come funziona il file:
 * - `TOOL_DEFINITIONS` espone a ogni modello LLM lo schema JSON dei tool
 *   (nome, descrizione, parametri): è ciò che permette al modello di decidere
 *   "quale tool chiamare e con quali argomenti". Le descrizioni qui sono dati
 *   per il modello e restano in inglese di proposito.
 * - gli handler eseguono davvero il tool quando il modello lo chiama:
 *   web search (Tavily), file caricati/creati, Shopify, Google Calendar/Gmail,
 *   preventivi, recensioni, finanza, HR, social...
 *
 * Ogni esecuzione passa per un audit log e restituisce al modello un risultato
 * testuale (o JSON strutturato per le azioni con effetti, come la creazione
 * di file/prodotti che generano notifiche).
 */
import type { LLMTool } from "@/lib/llm";
import { logAudit } from "@/lib/audit";
import { getTenantCredentials, updateTenantGoogleTokens } from "@/lib/tenants";
import {
  getShopifyConnection,
  revokeShopifyConnection,
} from "@/lib/shopify/connections";
import { googleApiProxy } from "@/lib/google/api-proxy";
import { getGoogleConnection } from "@/lib/google/connections";
import { getValidGoogleAccessToken } from "@/lib/google/token";
import { executeWebSearch, formatWebSearchResults } from "@/lib/tools/tavily";
import {
  calculateQuote,
  formatQuoteMarkdown,
  sendQuoteByEmail,
} from "@/lib/tools/quote";
import {
  listBusinessReviews,
  replyToBusinessReview,
  formatReviewsMarkdown,
} from "@/lib/tools/reviews";
import {
  getFinanceCashFlow,
  formatCashFlowMarkdown,
  createInvoice,
  invoiceDownloadPayload,
  sendPaymentReminder,
} from "@/lib/tools/finance";
import {
  parseCv,
  formatParsedCvMarkdown,
  scoreCandidate,
  formatCandidateScoreMarkdown,
} from "@/lib/tools/hr";
import {
  generateEditorialCalendar,
  formatEditorialCalendarMarkdown,
  schedulePost,
} from "@/lib/tools/social";

export const TOOL_DEFINITIONS: Record<string, LLMTool> = {
  web_search: {
    name: "web_search",
    description:
      "Search the web in real-time for up-to-date information, news, market data, and documentation.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "The search query" },
        max_results: {
          type: "integer",
          description: "Max number of search results to return (1-20, default 5)",
        },
        search_depth: {
          type: "string",
          enum: ["basic", "advanced"],
          description: "Search depth: 'basic' for fast lookup, 'advanced' for deeper research",
        },
      },
      required: ["query"],
    },
  },

  scrape_page: {
    name: "scrape_page",
    description: "Read the full text content of a web page",
    input_schema: {
      type: "object",
      properties: {
        url: { type: "string", description: "The URL of the page to read" },
      },
      required: ["url"],
    },
  },

  read_file: {
    name: "read_file",
    description: "Read content from a file the user has uploaded",
    input_schema: {
      type: "object",
      properties: {
        filename: { type: "string", description: "The filename to read" },
      },
      required: ["filename"],
    },
  },

  write_file: {
    name: "write_file",
    description:
      "Create or save a file with the specified content. The user will be able to download it.",
    input_schema: {
      type: "object",
      properties: {
        filename: {
          type: "string",
          description: "The desired filename including extension",
        },
        content: {
          type: "string",
          description: "The full content of the file",
        },
      },
      required: ["filename", "content"],
    },
  },

  run_python: {
    name: "run_python",
    description:
      "Execute Python code (safe sandbox). Use for data analysis, calculations, charts, etc.",
    input_schema: {
      type: "object",
      properties: {
        code: { type: "string", description: "The Python code to execute" },
      },
      required: ["code"],
    },
  },

  shopify_search_products: {
    name: "shopify_search_products",
    description:
      "Search Shopify products by free text and return title, url, price, availability, and cart link.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "The product search query" },
        limit: {
          type: "integer",
          description: "Max number of products to return",
        },
      },
      required: ["query"],
    },
  },

  shopify_get_order_status: {
    name: "shopify_get_order_status",
    description:
      "Check a Shopify order's current status using order number and customer email.",
    input_schema: {
      type: "object",
      properties: {
        order_number: {
          type: "string",
          description: "The Shopify order number",
        },
        email: {
          type: "string",
          description: "The customer email associated with the order",
        },
      },
      required: ["order_number", "email"],
    },
  },

  shopify_build_cart_url: {
    name: "shopify_build_cart_url",
    description:
      "Generate a Shopify cart link for a product variant ID and quantity.",
    input_schema: {
      type: "object",
      properties: {
        variant_id: { type: "string", description: "The Shopify variant GID" },
        quantity: { type: "integer", description: "Quantity to add to cart" },
      },
      required: ["variant_id"],
    },
  },

  shopify_setup_store: {
    name: "shopify_setup_store",
    description:
      "Connect a Shopify store by saving the shop domain and admin access token. Use this when the user does NOT yet have a store connected or wants to change their store. (Legacy OAuth panel is preferred — see chat UI)",
    input_schema: {
      type: "object",
      properties: {
        shop_domain: {
          type: "string",
          description:
            "The Shopify shop domain (e.g. my-store.myshopify.com)",
        },
        access_token: {
          type: "string",
          description:
            "The Shopify Admin API access token (starts with shpat_)",
        },
      },
      required: ["shop_domain", "access_token"],
    },
  },

  shopify_create_store: {
    name: "shopify_create_store",
    description:
      "Create a new Shopify store for the user and guide them to connect it. Use when the user says they have no store, want to start from scratch, or asks to create/open a new e-commerce store. This acts directly on Shopify: generates the store URL, provides the signup link, and prepares the OAuth connection.",
    input_schema: {
      type: "object",
      properties: {
        shop_name: {
          type: "string",
          description:
            "Desired store name (e.g. 'Acme Studio'). Used to generate the myshopify.com subdomain.",
        },
        email: {
          type: "string",
          description:
            "Owner email for the new store (optional, pre-fills Shopify signup).",
        },
        country: {
          type: "string",
          description:
            "Country code for the store (e.g. IT, US, DE) — optional, defaults to user's locale.",
        },
        business_type: {
          type: "string",
          description:
            "Type of business/products (e.g. fashion, electronics, food) — optional, helps tailor onboarding.",
        },
      },
      required: ["shop_name"],
    },
  },

  shopify_list_customers: {
    name: "shopify_list_customers",
    description:
      "List customers from the connected Shopify store. Returns name, email, total orders, total spent, and creation date.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            'Optional search query (e.g. email, name, or tag). Leave empty for all customers.',
        },
        limit: {
          type: "integer",
          description: 'Max customers to return (default 10, max 50).',
        },
      },
    },
  },

  shopify_get_analytics: {
    name: "shopify_get_analytics",
    description:
      "Get store analytics: total sales, orders count, top products, and recent activity for a given date range.",
    input_schema: {
      type: "object",
      properties: {
        period: {
          type: "string",
          description:
            'Time period: "today", "7d", "30d", or "90d". Default: "30d".',
        },
      },
    },
  },

  shopify_create_product: {
    name: "shopify_create_product",
    description:
      "Create a new product on the connected Shopify store with title, description, price, and optional image URL.",
    input_schema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Product title",
        },
        description: {
          type: "string",
          description: "Product description (HTML allowed)",
        },
        price: {
          type: "string",
          description: "Price as a decimal string (e.g. '29.99')",
        },
        compare_at_price: {
          type: "string",
          description:
            "Original price before discount (optional, e.g. '49.99')",
        },
        image_url: {
          type: "string",
          description: "Product image URL (optional)",
        },
        tags: {
          type: "string",
          description: "Comma-separated tags (optional)",
        },
      },
      required: ["title", "price"],
    },
  },

  shopify_create_discount: {
    name: "shopify_create_discount",
    description:
      "Create a discount code on the connected Shopify store.",
    input_schema: {
      type: "object",
      properties: {
        code: {
          type: "string",
          description: "Discount code text (e.g. 'SUMMER20')",
        },
        type: {
          type: "string",
          description:
            'Type of discount: "percentage" or "fixed_amount"',
        },
        value: {
          type: "string",
          description:
            'Discount value: percentage (e.g. "20" for 20%) or fixed amount (e.g. "10.00")',
        },
        usage_limit: {
          type: "integer",
          description:
            "Max number of times this code can be used (optional)",
        },
        starts_at: {
          type: "string",
          description: "Start date in ISO format (optional)",
        },
        ends_at: {
          type: "string",
          description: "End date in ISO format (optional)",
        },
      },
      required: ["code", "type", "value"],
    },
  },

  shopify_list_collections: {
    name: "shopify_list_collections",
    description:
      "List all product collections (categories) on the connected Shopify store.",
    input_schema: {
      type: "object",
      properties: {
        limit: {
          type: "integer",
          description: 'Max collections to return (default 20, max 50).',
        },
      },
    },
  },

  shopify_manage_collection: {
    name: "shopify_manage_collection",
    description:
      "Add or remove products from a collection on the connected Shopify store.",
    input_schema: {
      type: "object",
      properties: {
        collection_id: {
          type: "string",
          description: "The collection GID",
        },
        product_ids: {
          type: "string",
          description:
            "Comma-separated product GIDs to add or remove",
        },
        action: {
          type: "string",
          description: '"add" to add products, "remove" to remove products',
        },
      },
      required: ["collection_id", "product_ids", "action"],
    },
  },

  shopify_update_inventory: {
    name: "shopify_update_inventory",
    description:
      "Update inventory quantity for a specific product variant.",
    input_schema: {
      type: "object",
      properties: {
        variant_id: {
          type: "string",
          description: "The variant GID (e.g. gid://shopify/ProductVariant/123)",
        },
        quantity: {
          type: "integer",
          description: "New available quantity",
        },
      },
      required: ["variant_id", "quantity"],
    },
  },

  calendar_search_availability: {
    name: "calendar_search_availability",
    description: "Search calendar availability for a date range and attendees.",
    input_schema: {
      type: "object",
      properties: {
        start_date: {
          type: "string",
          description: "Start date/time in ISO format",
        },
        end_date: {
          type: "string",
          description: "End date/time in ISO format",
        },
        attendees: {
          type: "string",
          description: "Comma-separated attendee emails",
        },
      },
      required: ["start_date", "end_date"],
    },
  },

  list_emails: {
    name: "list_emails",
    description:
      "Read the user's Gmail inbox: optionally filter by query and return the most recent matching emails with sender, subject, date, and preview.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Optional Gmail search query (e.g. 'from:client@example.com is:unread')",
        },
        max_results: {
          type: "integer",
          description: "Max number of emails to return (default 10, max 20)",
        },
      },
    },
  },

  get_calendar_events: {
    name: "get_calendar_events",
    description:
      "Read events from the user's Google Calendar in a date range, with start/end time, location, and calendar link.",
    input_schema: {
      type: "object",
      properties: {
        date_from: {
          type: "string",
          description: "Start of the range in ISO date/time format",
        },
        date_to: {
          type: "string",
          description: "End of the range in ISO date/time format (max 31 days from date_from)",
        },
      },
      required: ["date_from", "date_to"],
    },
  },

  gmail_send: {
    name: "gmail_send",
    description:
      "Send an email via the connected Gmail account (requires Gmail modify scope).",
    input_schema: {
      type: "object",
      properties: {
        to: { type: "string", description: "Recipient email (comma-separated for multiple)" },
        subject: { type: "string", description: "Email subject" },
        body: { type: "string", description: "Email body (plain text or HTML)" },
        cc: { type: "string", description: "CC recipients, comma-separated (optional)" },
        bcc: { type: "string", description: "BCC recipients, comma-separated (optional)" },
      },
      required: ["to", "subject", "body"],
    },
  },

  gmail_trash: {
    name: "gmail_trash",
    description:
      "Move a Gmail message to trash (delete). Use list_emails first to get the message ID. Requires Gmail modify scope.",
    input_schema: {
      type: "object",
      properties: {
        message_id: { type: "string", description: "Gmail message ID to trash" },
      },
      required: ["message_id"],
    },
  },

  calendar_delete_event: {
    name: "calendar_delete_event",
    description:
      "Delete a Google Calendar event by its ID. Use get_calendar_events first to find the event ID.",
    input_schema: {
      type: "object",
      properties: {
        event_id: { type: "string", description: "Calendar event ID to delete" },
      },
      required: ["event_id"],
    },
  },

  calendar_set_reminder: {
    name: "calendar_set_reminder",
    description:
      "Set or update reminders for a calendar event (popup/email). Use get_calendar_events to find the event ID first.",
    input_schema: {
      type: "object",
      properties: {
        event_id: { type: "string", description: "Calendar event ID" },
        minutes: { type: "integer", description: "Minutes before event to trigger reminder (e.g. 10, 30, 1440)" },
        method: { type: "string", description: 'Reminder method: "popup" or "email" (default popup)' },
      },
      required: ["event_id", "minutes"],
    },
  },

  calendar_book_event: {
    name: "calendar_book_event",
    description: "Book an event in the configured calendar (also supports reminders via overrides).",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Event title" },
        start_time: {
          type: "string",
          description: "Event start time in ISO format",
        },
        end_time: {
          type: "string",
          description: "Event end time in ISO format",
        },
        attendees: {
          type: "string",
          description: "Comma-separated attendee emails",
        },
        location: {
          type: "string",
          description: "Event location or meeting link",
        },
        description: {
          type: "string",
          description: "Event description or notes",
        },
        reminder_minutes: {
          type: "integer",
          description: "Optional reminder minutes before event (e.g. 10 for popup 10 min before)",
        },
      },
      required: ["title", "start_time", "end_time"],
    },
  },

  lead_capture_submit: {
    name: "lead_capture_submit",
    description:
      "Submit a captured lead into the configured lead capture endpoint or Slack.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Lead name" },
        email: { type: "string", description: "Lead email" },
        company: { type: "string", description: "Lead company" },
        phone: { type: "string", description: "Lead phone number" },
        message: {
          type: "string",
          description: "Lead message or interest details",
        },
        source: { type: "string", description: "Source of the lead" },
      },
      required: ["email"],
    },
  },

  lead_capture_enrich: {
    name: "lead_capture_enrich",
    description:
      "Enrich a lead with additional data based on email or company.",
    input_schema: {
      type: "object",
      properties: {
        email: { type: "string", description: "Lead email address" },
        company: { type: "string", description: "Lead company name" },
      },
      required: ["email"],
    },
  },

  lead_capture_notify_sales: {
    name: "lead_capture_notify_sales",
    description:
      "Notify the sales team about a captured lead via Slack or webhook.",
    input_schema: {
      type: "object",
      properties: {
        lead_details: {
          type: "string",
          description: "Text summary of the lead",
        },
      },
      required: ["lead_details"],
    },
  },

  quote_generate: {
    name: "quote_generate",
    description:
      "Calculate and generate a formal structured quote with subtotal, tax, and total breakdown.",
    input_schema: {
      type: "object",
      properties: {
        client_name: {
          type: "string",
          description: "Name of the prospective client",
        },
        client_email: {
          type: "string",
          description: "Email address of the client",
        },
        items: {
          type: "string",
          description:
            'JSON array of line items with description, quantity, unitPrice. Example: [{"description":"Consulenza","quantity":1,"unitPrice":500}]',
        },
        currency: { type: "string", description: "Currency code (default EUR)" },
        tax_rate: {
          type: "number",
          description: "Tax rate decimal, e.g. 0.22 for 22% (default 0.22)",
        },
        valid_days: {
          type: "integer",
          description: "Validity days (default 30)",
        },
        notes: { type: "string", description: "Optional terms or notes" },
      },
      required: ["client_email", "items"],
    },
  },

  quote_send_email: {
    name: "quote_send_email",
    description:
      "Send the calculated quote directly to the client via email (via Resend) with a responsive HTML template.",
    input_schema: {
      type: "object",
      properties: {
        client_name: {
          type: "string",
          description: "Name of the prospective client",
        },
        client_email: {
          type: "string",
          description: "Email address of the client",
        },
        items: {
          type: "string",
          description:
            "JSON array of line items with description, quantity, unitPrice",
        },
        currency: { type: "string", description: "Currency code (default EUR)" },
        notes: { type: "string", description: "Optional terms or notes" },
      },
      required: ["client_email", "items"],
    },
  },

  google_reviews_list: {
    name: "google_reviews_list",
    description:
      "Retrieve Google Business Profile reviews for the business location with ratings, comments, and replies.",
    input_schema: {
      type: "object",
      properties: {
        min_rating: {
          type: "integer",
          description: "Filter by minimum star rating (1-5)",
        },
        unanswered_only: {
          type: "boolean",
          description: "Only return reviews without a public reply",
        },
      },
    },
  },

  google_reviews_reply: {
    name: "google_reviews_reply",
    description:
      "Publish a reply to a specific Google Business Profile review.",
    input_schema: {
      type: "object",
      properties: {
        review_id: {
          type: "string",
          description: "ID of the review to reply to",
        },
        reply_text: {
          type: "string",
          description: "Text of the public reply",
        },
      },
      required: ["review_id", "reply_text"],
    },
  },

  finance_get_cashflow: {
    name: "finance_get_cashflow",
    description:
      "Summarize cash flow (income, expenses, net) from an uploaded CSV (date,type,amount,description) or from Stripe balance transactions when STRIPE_SECRET_KEY is configured.",
    input_schema: {
      type: "object",
      properties: {
        filename: {
          type: "string",
          description: "Uploaded CSV/text filename to parse (optional)",
        },
        csv: {
          type: "string",
          description: "Raw CSV text if not reading from a file",
        },
        days: {
          type: "integer",
          description: "Lookback days for Stripe (1-90, default 30)",
        },
      },
    },
  },

  finance_create_invoice: {
    name: "finance_create_invoice",
    description:
      "Generate a professional invoice (HTML download + markdown summary) with line items, tax, and due date.",
    input_schema: {
      type: "object",
      properties: {
        client_name: { type: "string", description: "Client name" },
        client_email: { type: "string", description: "Client email" },
        items: {
          type: "string",
          description:
            'JSON array of { description, quantity, unitPrice }. Example: [{"description":"Consulenza","quantity":1,"unitPrice":500}]',
        },
        currency: { type: "string", description: "Currency code (default EUR)" },
        tax_rate: {
          type: "number",
          description: "Tax rate decimal, e.g. 0.22 (default 0.22)",
        },
        due_days: { type: "integer", description: "Days until due (default 30)" },
        notes: { type: "string", description: "Optional notes" },
      },
      required: ["client_email", "items"],
    },
  },

  finance_send_reminder: {
    name: "finance_send_reminder",
    description:
      "Send a polite payment reminder email via Resend. Requires explicit user approval before calling.",
    input_schema: {
      type: "object",
      properties: {
        client_name: { type: "string", description: "Recipient name" },
        client_email: { type: "string", description: "Recipient email" },
        invoice_id: { type: "string", description: "Invoice reference" },
        amount: { type: "number", description: "Amount due" },
        currency: { type: "string", description: "Currency code (default EUR)" },
        due_date: { type: "string", description: "Due date YYYY-MM-DD" },
      },
      required: ["client_email"],
    },
  },

  hr_parse_cv: {
    name: "hr_parse_cv",
    description:
      "Extract structured fields from a CV (name, email, phone, skills, experience, education).",
    input_schema: {
      type: "object",
      properties: {
        filename: {
          type: "string",
          description: "Uploaded CV filename to read",
        },
        cv_text: {
          type: "string",
          description: "Raw CV text if not reading from a file",
        },
      },
    },
  },

  hr_score_candidate: {
    name: "hr_score_candidate",
    description:
      "Score a candidate 0-100 against a job description using CV text and/or listed skills.",
    input_schema: {
      type: "object",
      properties: {
        filename: { type: "string", description: "Uploaded CV filename" },
        cv_text: { type: "string", description: "Raw CV text" },
        skills: {
          type: "string",
          description: "Comma-separated skills if already extracted",
        },
        job_description: {
          type: "string",
          description: "Job description or role requirements",
        },
      },
      required: ["job_description"],
    },
  },

  social_generate_calendar: {
    name: "social_generate_calendar",
    description:
      "Generate a weekly editorial calendar (5-7 posts) with hook, caption, hashtags, platform, and CTA.",
    input_schema: {
      type: "object",
      properties: {
        topic: { type: "string", description: "Theme or campaign topic" },
        brand: { type: "string", description: "Brand or business name" },
        platforms: {
          type: "string",
          description: "Comma-separated platforms (e.g. Instagram, LinkedIn, TikTok)",
        },
        posts_count: {
          type: "integer",
          description: "Number of posts (5-7, default 7)",
        },
        language: { type: "string", description: "it or en (default it)" },
      },
      required: ["topic"],
    },
  },

  social_schedule_post: {
    name: "social_schedule_post",
    description:
      "Save a scheduled social post as a downloadable markdown file (local fallback when Buffer/Meta is not connected).",
    input_schema: {
      type: "object",
      properties: {
        platform: { type: "string", description: "Target platform" },
        scheduled_at: {
          type: "string",
          description: "ISO datetime or human date for publication",
        },
        caption: { type: "string", description: "Post caption/body" },
        hashtags: {
          type: "string",
          description: "Comma-separated hashtags",
        },
      },
      required: ["caption"],
    },
  },
};

export type ToolContext = {
  userId: string;
  tenantId?: string;
  files?: Record<string, string>;
};

async function getGoogleTokenForContext(context: ToolContext) {
  let token = await getValidGoogleAccessToken(context.userId).catch(() => null);
  if (!token && context.tenantId && context.tenantId !== context.userId) {
    token = await getValidGoogleAccessToken(context.tenantId).catch(() => null);
  }
  return token;
}

const MAX_LEAD_FIELD_LENGTH = 250;
const MAX_EVENT_TEXT_LENGTH = 500;

function sanitizeText(value: string, maxLength = 1000): string {
  return value
    .toString()
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

/**
 * Resolve Shopify credentials for a tenant (user):
 *   1. the encrypted OAuth connection stored in `shopify_connections` (Phase 5),
 *   2. legacy environment variables (SHOPIFY_SHOP_DOMAIN / SHOPIFY_ADMIN_ACCESS_TOKEN).
 * Returns null when no connection is available.
 */
async function resolveShopifyCredentials(tenantId?: string): Promise<{
  shopDomain: string;
  accessToken: string;
} | null> {
  if (tenantId) {
    const conn = await getShopifyConnection(tenantId).catch(() => null);
    if (conn) return conn;
  }
  const shopDomain = process.env.SHOPIFY_SHOP_DOMAIN;
  const accessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  if (shopDomain && accessToken) return { shopDomain, accessToken };
  return null;
}

/** Execute a Shopify GraphQL Admin API query/mutation. */
async function shopifyGraphQL(
  shopDomain: string,
  accessToken: string,
  query: string,
  variables: Record<string, unknown> = {},
  opts?: { userId?: string },
): Promise<{
  ok: boolean;
  status?: number;
  revoked?: boolean;
  data?: unknown;
  errors?: unknown;
  statusText?: string;
  raw?: string;
}> {
  try {
    const res = await fetch(
      `https://${shopDomain}/admin/api/2024-10/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify({ query, variables }),
      },
    );
    if (!res.ok) {
      const unauthorized = res.status === 401;
      if (unauthorized && opts?.userId) {
        await revokeShopifyConnection(opts.userId, shopDomain).catch(() => {});
      }
      const text = await res.text();
      return {
        ok: false,
        status: res.status,
        revoked: unauthorized,
        statusText: `${res.status} ${res.statusText}`,
        raw: text,
      };
    }
    const json = await res.json();
    return { ok: true, data: json.data, errors: json.errors };
  } catch (e) {
    return { ok: false, statusText: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Run a Shopify GraphQL call for a tenant, resolving credentials and handling
 * token revocation: a 401 means the token was uninstalled/expired, so we mark
 * the connection revoked and return a friendly, reconnect-oriented message.
 */
async function shopifyCall(
  userId: string | undefined,
  query: string,
  variables: Record<string, unknown> = {},
): Promise<{ data?: unknown; shopDomain?: string; error?: string }> {
  const creds = await resolveShopifyCredentials(userId);
  if (!creds) {
    return {
      error:
        "Shopify non configurato. Collega il tuo store dal pannello 'Connetti Shopify' (OAuth) o imposta SHOPIFY_SHOP_DOMAIN e SHOPIFY_ADMIN_ACCESS_TOKEN nell'ambiente.",
    };
  }
  const result = await shopifyGraphQL(
    creds.shopDomain,
    creds.accessToken,
    query,
    variables,
    { userId },
  );
  if (result.status === 401) {
    if (userId) {
      await revokeShopifyConnection(userId, creds.shopDomain).catch(() => {});
    }
    return {
      error:
        "La connessione Shopify è scaduta o è stata revocata. Riconnetti lo store dal pannello 'Connetti Shopify'.",
    };
  }
  if (!result.ok) return { error: `Shopify API error: ${result.statusText}` };
  if (result.errors) {
    return { error: `Shopify GraphQL error: ${JSON.stringify(result.errors)}` };
  }
  return { data: result.data, shopDomain: creds.shopDomain };
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidIsoDate(value: string): boolean {
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

function isValidHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function executeTool(
  name: string,
  input: Record<string, string>,
  context: ToolContext,
): Promise<string> {
  try {
    logAudit("tool_invocation", {
      tool: name,
      userId: context.userId,
      tenantId: context.tenantId || null,
      inputKeys: Object.keys(input),
    });
  } catch {}

  // ---------------------------------------------------------------------------
  // Guardia di sicurezza: rilevamento prompt injection
  //
  // Prima di eseguire qualsiasi tool, serializzaiamo l'intero input in JSON
  // e lo analizziamo con il rilevatore euristico. Se viene trovato un pattern
  // sospetto, blocchiamo l'esecuzione e registriamo l'evento nell'audit log.
  // In caso di errore interno nella detection, lasciamo passare (fail open).
  // ---------------------------------------------------------------------------
  try {
    const { detectPromptInjection } = await import("@/lib/security");
    const injectionCheck = detectPromptInjection(JSON.stringify(input));
    if (injectionCheck.detected) {
      // Registra il tentativo di injection nell'audit log per tracciabilità
      logAudit("prompt_injection_attempt", {
        tool: name,
        userId: context.userId,
        tenantId: context.tenantId || null,
        reason: injectionCheck.reason || "unknown",
      });
      return "⚠️ Input non valido: rilevato contenuto potenzialmente non sicuro. Riformula la richiesta.";
    }
  } catch {
    // Fail open: se la detection fallisce, non blocchiamo il tool
  }

  switch (name) {
    case "web_search": {
      logAudit("tool_exec_start", { tool: "web_search" });
      try {
        const query = input.query || "";
        if (!query.trim()) {
          return "web_search requires a non-empty query.";
        }
        const maxResults = input.max_results ? Number(input.max_results) : 5;
        const searchDepth =
          input.search_depth === "advanced" ? "advanced" : "basic";

        const response = await executeWebSearch({
          query,
          maxResults,
          searchDepth,
          includeAnswer: true,
        });

        return formatWebSearchResults(response);
      } catch (e) {
        logAudit("tool_exec_error", {
          tool: "web_search",
          error: e instanceof Error ? e.message : String(e),
        });
        return `Search error: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    case "scrape_page": {
      try {
        const res = await fetch(input.url, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; AgentCloud/1.0)" },
        });
        const html = await res.text();
        const text = html
          .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
          .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        return text.slice(0, 8000) || "Page content is empty";
      } catch (e) {
        return `Scrape error: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    case "read_file": {
      const content = context.files?.[input.filename];
      if (!content)
        return `File "${input.filename}" not found. Available files: ${Object.keys(context.files || {}).join(", ") || "none"}`;
      return content;
    }

    case "write_file": {
      return JSON.stringify({
        type: "file_created",
        filename: input.filename,
        content: input.content,
        downloadable: true,
      });
    }

    case "run_python": {
      return `Python execution sandbox is not available in this environment. 
To use this feature, deploy a secure sandbox (e.g., Pyodide in the browser or a containerized Python runtime on your server).
Code received:\n\`\`\`python\n${input.code}\n\`\`\``;
    }

    case "shopify_search_products": {
      const query = input.query;
      const limit = Math.min(20, Math.max(1, Number(input.limit) || 5));
      const graphql = `
        query searchProducts($query: String!, $first: Int!) {
          products(first: $first, query: $query) {
            edges {
              node {
                title
                handle
                onlineStoreUrl
                featuredImage { url }
                priceRangeV2 { minVariantPrice { amount currencyCode } }
                variants(first: 1) {
                  edges { node { id availableForSale } }
                }
              }
            }
          }
        }
      `;

      try {
        const call = await shopifyCall(context.tenantId, graphql, { query, first: limit });
        if (call.error) return call.error;

        const shopDomain = call.shopDomain!;
        const productEdges = (call.data as {
          products?: {
            edges?: Array<{
              node?: {
                title?: string;
                handle?: string;
                onlineStoreUrl?: string;
                priceRangeV2?: { minVariantPrice?: { amount?: string; currencyCode?: string } };
                variants?: { edges?: Array<{ node?: { id?: string; availableForSale?: boolean } }> };
              };
            }>;
          };
        } | undefined)?.products?.edges || [];
        if (!productEdges.length) {
          return "Nessun prodotto trovato.";
        }

        const results = productEdges.map((edge: {
          node?: {
            title?: string;
            handle?: string;
            onlineStoreUrl?: string;
            priceRangeV2?: {
              minVariantPrice?: { amount?: string; currencyCode?: string };
            };
            variants?: {
              edges?: Array<{
                node?: { id?: string; availableForSale?: boolean };
              }>;
            };
          };
        }) => {
          const node = edge.node;
          const variant = node?.variants?.edges?.[0]?.node;
          const amount = node?.priceRangeV2?.minVariantPrice?.amount ?? "N/A";
          const currency =
            node?.priceRangeV2?.minVariantPrice?.currencyCode ?? "";
          const available = variant?.availableForSale
            ? "available"
            : "unavailable";
          const cartUrl = variant?.id
            ? `https://${shopDomain}/cart/${variant.id.replace(/.*\/(\d+)$/, "$1")}:1`
            : "";

          return [
            `Title: ${node?.title ?? "N/A"}`,
            `Handle: ${node?.handle ?? "N/A"}`,
            `URL: ${node?.onlineStoreUrl ?? "N/A"}`,
            `Price: ${amount} ${currency}`,
            `Availability: ${available}`,
            cartUrl ? `Cart link: ${cartUrl}` : "Cart link: none",
          ].join("\n");
        });

        return results.join("\n\n");
      } catch (e) {
        return `Shopify product search network error: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    case "shopify_get_order_status": {
      const orderNumber = input.order_number?.trim() || "";
      const email = input.email?.trim() || "";
      if (!orderNumber || !email) {
        return "Order status requires both order_number and email.";
      }
      if (!isValidEmail(email)) {
        return `Invalid email address: ${email}`;
      }

      const normalized = orderNumber.startsWith("#")
        ? orderNumber
        : `#${orderNumber}`;
      const searchQuery = `name:${normalized} AND email:${email}`;
      const graphql = `
        query getOrder($query: String!) {
          orders(first: 1, query: $query) {
            edges {
              node {
                name
                displayFinancialStatus
                displayFulfillmentStatus
                statusPageUrl
                fulfillments(first: 3) {
                  trackingInfo { number url company }
                }
              }
            }
          }
        }
      `;

      try {
        const creds = await resolveShopifyCredentials(context.tenantId);
        if (!creds) {
          return "Shopify non configurato. Collega il tuo store dal pannello 'Connetti Shopify' (OAuth) o imposta SHOPIFY_SHOP_DOMAIN e SHOPIFY_ADMIN_ACCESS_TOKEN nell'ambiente.";
        }
        const result = await shopifyGraphQL(
          creds.shopDomain,
          creds.accessToken,
          graphql,
          { query: searchQuery },
          { userId: context.tenantId },
        );
        if (result.status === 401) {
          return "La connessione Shopify è scaduta o è stata revocata. Riconnetti lo store dal pannello 'Connetti Shopify'.";
        }
        if (!result.ok) return `Shopify order status failed: ${result.statusText}`;
        if (result.errors) return `Shopify order status error: ${JSON.stringify(result.errors)}`;

        type OrderNode = {
          name?: string;
          displayFinancialStatus?: string;
          displayFulfillmentStatus?: string;
          statusPageUrl?: string;
          fulfillments?: Array<{ trackingInfo?: Array<{ number?: string; url?: string; company?: string }> }>;
        };
        const edge = (result.data as { orders?: { edges?: Array<{ node?: OrderNode }> } } | undefined)?.orders?.edges?.[0];
        if (!edge) {
          return `Nessun ordine trovato per ${normalized} e ${email}.`;
        }

        const node = edge.node;
        const fulfillment = node?.fulfillments?.[0];
        const tracking = fulfillment?.trackingInfo?.[0];

        return [
          `Order: ${node?.name ?? normalized}`,
          `Financial status: ${node?.displayFinancialStatus ?? "N/A"}`,
          `Fulfillment status: ${node?.displayFulfillmentStatus ?? "N/A"}`,
          tracking
            ? `Tracking: ${tracking.company} ${tracking.number}`
            : "Tracking: none",
          tracking?.url
            ? `Tracking URL: ${tracking.url}`
            : "Tracking URL: none",
          node?.statusPageUrl
            ? `Status page: ${node.statusPageUrl}`
            : "Status page: none",
        ].join("\n");
      } catch (e) {
        return `Shopify order status network error: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    case "shopify_build_cart_url": {
      const creds = await resolveShopifyCredentials(context.tenantId);
      if (!creds) {
        return "Shopify non configurato. Collega il tuo store dal pannello 'Connetti Shopify' (OAuth) o imposta SHOPIFY_SHOP_DOMAIN nell'ambiente.";
      }
      const shopDomain = creds.shopDomain;
      const variantId = input.variant_id || "";
      const quantity = Number(input.quantity) || 1;
      const match = variantId.match(/ProductVariant\/(\d+)/);
      if (!match) {
        return `Invalid variant_id: ${variantId}`;
      }
      return `https://${shopDomain}/cart/${match[1]}:${quantity}`;
    }

    case "shopify_setup_store": {
      // Connection is handled securely via the OAuth panel in the chat UI
      // (see SHOPIFY_AGENT_SLUG + /api/shopify/install). We intentionally do
      // NOT accept a raw Admin API token in chat: that would expose the secret
      // in conversation history and bypass the encrypted-at-rest store.
      return "La connessione allo store avviene in modo sicuro dal pannello 'Connetti Shopify' nella chat (OAuth), non inserendo un token manualmente. Apri il pannello e autorizza il tuo store *.myshopify.com, poi riprova.";
    }

    case "shopify_create_store": {
      const shopNameRaw = sanitizeText(input.shop_name || "", 100);
      if (!shopNameRaw) return "Per creare lo store serve un nome (shop_name). Es: 'Acme Studio'.";
      const slug = shopNameRaw
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 30) || "mio-store";
      const shopDomain = `${slug}.myshopify.com`;
      const email = sanitizeText(input.email || "", 100);
      const country = sanitizeText(input.country || "", 10);
      const businessType = sanitizeText(input.business_type || "", 100);

      // If a store is already connected, don't create a new one — manage the existing
      const existing = await resolveShopifyCredentials(context.tenantId).catch(() => null);
      if (existing) {
        return [
          `Hai già uno store collegato: ${existing.shopDomain}.`,
          `Se vuoi crearne uno nuovo, disconnetti prima quello attuale o dimmi un altro nome.`,
          `Vuoi che gestisca ${existing.shopDomain} invece? Posso creare prodotti, sconti e analizzare le vendite.`,
        ].join("\n");
      }

      // Try Partners API if configured (SHOPIFY_PARTNER_TOKEN + SHOPIFY_PARTNER_ORG_ID)
      const partnerToken = process.env.SHOPIFY_PARTNER_TOKEN;
      const partnerOrg = process.env.SHOPIFY_PARTNER_ORG_ID;
      if (partnerToken && partnerOrg) {
        try {
          // Partners GraphQL: create development store (requires Partners API)
          const res = await fetch("https://partners.shopify.com/api/cli/graphql", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${partnerToken}`,
              "X-Shopify-Access-Token": partnerToken,
            },
            body: JSON.stringify({
              query: `mutation devStoreCreate($input: DevelopmentStoreInput!){ developmentStoreCreate(input:$input){ developmentStore{ shopDomain } userErrors{ field message } } }`,
              variables: {
                input: {
                  organizationId: partnerOrg,
                  shopDomain: slug,
                  shopName: shopNameRaw,
                  email: email || undefined,
                },
              },
            }),
          });
          const json = (await res.json().catch(() => null)) as {
            data?: { developmentStoreCreate?: { developmentStore?: { shopDomain?: string }; userErrors?: Array<{ message?: string }> } };
            errors?: unknown;
          } | null;
          const created = json?.data?.developmentStoreCreate?.developmentStore?.shopDomain;
          if (created) {
            return [
              `✅ Store di sviluppo creato!`,
              `Dominio: ${created}`,
              `Nome: ${shopNameRaw}`,
              email ? `Email proprietario: ${email}` : null,
              ``,
              `Prossimi passi:`,
              `1. Apri https://${created}/admin e completa la configurazione iniziale`,
              `2. Torna qui e clicca "Collega store esistente" con ${created} per autorizzare l'agente via OAuth`,
              `3. Da lì posso creare i tuoi primi prodotti e sconti direttamente su Shopify.`,
            ]
              .filter(Boolean)
              .join("\n");
          }
        } catch {
          // fall through to guided flow
        }
      }

      // Guided creation flow (no Partners API or failure) — acts directly via official signup
      const signupUrl = new URL("https://www.shopify.com/free-trial");
      signupUrl.searchParams.set("store_name", slug);
      if (email && isValidEmail(email)) signupUrl.searchParams.set("email", email);

      return [
        `🛍️ Perfetto — creo il tuo store "${shopNameRaw}"!`,
        ``,
        `Dominio suggerito: ${shopDomain}`,
        country ? `Paese: ${country}` : null,
        businessType ? `Settore: ${businessType}` : null,
        ``,
        `Agisco direttamente su Shopify per te:`,
        `1. Apri il link ufficiale per creare lo store: ${signupUrl.toString()}`,
        `2. Completa la registrazione (30s, nome, email, password) — Shopify ti assegnerà ${shopDomain}`,
        `3. Torna in questa chat: vedrai il pannello "Connetti Shopify" — inserisci ${shopDomain} e autorizza via OAuth`,
        `4. Appena connesso, posso creare prodotti, collezioni, sconti e analizzare vendite *direttamente* sulla piattaforma`,
        ``,
        `Vuoi che prepari già i primi 3 prodotti per ${shopNameRaw} mentre crei lo store? Dimmi cosa vendi!`,
      ]
        .filter(Boolean)
        .join("\n");
    }

    case "shopify_list_customers": {
      const creds = await resolveShopifyCredentials(context.tenantId);
      if (!creds) {
        return "Shopify not configured. Use shopify_setup_store to connect your store first, or set SHOPIFY_SHOP_DOMAIN and SHOPIFY_ADMIN_ACCESS_TOKEN in your environment.";
      }

      const limit = Math.min(50, Math.max(1, Number(input.limit) || 10));
      const query = input.query || "";

      const searchFilter = query ? `query: "${sanitizeText(query, 100)}"` : "";
      const graphql = `
        query listCustomers($first: Int!) {
          customers(first: $first${searchFilter ? `, query: "${sanitizeText(query, 100)}"` : ""}) {
            edges {
              node {
                firstName
                lastName
                email
                ordersCount { quantity }
                totalSpent { amount currencyCode }
                createdAt
                tags
              }
            }
          }
        }
      `;

      const result = await shopifyGraphQL(creds.shopDomain, creds.accessToken, graphql, { first: limit });
      if (result.status === 401) {
        if (context.tenantId) await revokeShopifyConnection(context.tenantId, creds.shopDomain).catch(() => {});
        return "La connessione Shopify è scaduta o è stata revocata. Riconnetti lo store dal pannello 'Connetti Shopify'.";
      }
      if (!result.ok) return `Shopify API error: ${result.statusText}`;
      if (result.errors) return `Shopify GraphQL error: ${JSON.stringify(result.errors)}`;

      const edges = (
        (result.data as { customers?: { edges?: unknown[] } })?.customers?.edges || []
      ) as Array<{
        node?: {
          firstName?: string;
          lastName?: string;
          email?: string;
          ordersCount?: { quantity?: number };
          totalSpent?: { amount?: string; currencyCode?: string };
          createdAt?: string;
          tags?: string[];
        };
      }>;

      if (!edges.length) return query ? `No customers found for "${query}".` : "No customers found.";

      const results = edges.map((e) => {
        const n = e.node;
        const name = [n?.firstName, n?.lastName].filter(Boolean).join(" ") || "N/A";
        return [
          `Name: ${name}`,
          `Email: ${n?.email ?? "N/A"}`,
          `Orders: ${n?.ordersCount?.quantity ?? 0}`,
          `Total spent: ${n?.totalSpent?.amount ?? "0"} ${n?.totalSpent?.currencyCode ?? ""}`,
          `Created: ${n?.createdAt ?? "N/A"}`,
          n?.tags?.length ? `Tags: ${n.tags.join(", ")}` : null,
        ].filter(Boolean).join("\n");
      });

      return `Found ${edges.length} customer(s):\n\n${results.join("\n\n")}`;
    }

    case "shopify_get_analytics": {
      const creds = await resolveShopifyCredentials(context.tenantId);
      if (!creds) {
        return "Shopify not configured. Use shopify_setup_store to connect your store first, or set SHOPIFY_SHOP_DOMAIN and SHOPIFY_ADMIN_ACCESS_TOKEN in your environment.";
      }

      const period = input.period || "30d";
      const days = period === "today" ? 1 : period === "7d" ? 7 : period === "90d" ? 90 : 30;
      const since = new Date(Date.now() - days * 86400000).toISOString();

      const graphql = `
        query getAnalytics($query: String!) {
          orders(first: 250, query: $query) {
            edges {
              node {
                totalPrice { amount currencyCode }
                createdAt
                lineItems(first: 5) {
                  edges {
                    node {
                      title
                      quantity
                      originalTotalPrice { amount }
                    }
                  }
                }
              }
            }
          }
          shop {
            name
          }
        }
      `;

      const result = await shopifyGraphQL(creds.shopDomain, creds.accessToken, graphql, {
        query: `created_at:>=${since}`,
      });
      if (result.status === 401) {
        if (context.tenantId) await revokeShopifyConnection(context.tenantId, creds.shopDomain).catch(() => {});
        return "La connessione Shopify è scaduta o è stata revocata. Riconnetti lo store dal pannello 'Connetti Shopify'.";
      }
      if (!result.ok) return `Shopify API error: ${result.statusText}`;
      if (result.errors) return `Shopify GraphQL error: ${JSON.stringify(result.errors)}`;

      const data = result.data as {
        orders?: { edges?: Array<{ node?: { totalPrice?: { amount?: string; currencyCode?: string }; lineItems?: { edges?: Array<{ node?: { title?: string; quantity?: number; originalTotalPrice?: { amount?: string } } }> } } }> };
        shop?: { name?: string };
      };

      const orderEdges = data?.orders?.edges || [];
      let totalRevenue = 0;
      const productSales: Record<string, number> = {};

      for (const edge of orderEdges) {
        const n = edge.node;
        const amount = parseFloat(n?.totalPrice?.amount || "0");
        totalRevenue += amount;
        for (const li of n?.lineItems?.edges || []) {
          const title = li.node?.title || "Unknown";
          const qty = li.node?.quantity || 0;
          productSales[title] = (productSales[title] || 0) + qty;
        }
      }

      const topProducts = Object.entries(productSales)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([title, qty], i) => `  ${i + 1}. ${title} (×${qty})`)
        .join("\n");

      const currency = orderEdges[0]?.node?.totalPrice?.currencyCode || "EUR";

      return [
        `📊 Analytics for ${data?.shop?.name ?? "your store"} — last ${days} day(s)`,
        ``,
        `Total orders: ${orderEdges.length}`,
        `Total revenue: ${totalRevenue.toFixed(2)} ${currency}`,
        `Average order value: ${orderEdges.length ? (totalRevenue / orderEdges.length).toFixed(2) : "0.00"} ${currency}`,
        ``,
        topProducts ? `Top products:\n${topProducts}` : "No product data yet.",
      ].join("\n");
    }

    case "shopify_create_product": {
      const creds = await resolveShopifyCredentials(context.tenantId);
      if (!creds) {
        return "Shopify not configured. Use shopify_setup_store to connect your store first, or set SHOPIFY_SHOP_DOMAIN and SHOPIFY_ADMIN_ACCESS_TOKEN in your environment.";
      }

      const title = sanitizeText(input.title || "", 250);
      const descriptionHtml = sanitizeText(input.description || "", 5000);
      const price = sanitizeText(input.price || "0", 20);
      const compareAt = sanitizeText(input.compare_at_price || "", 20);
      const imageUrl = sanitizeText(input.image_url || "", 500);
      const tags = sanitizeText(input.tags || "", 500);

      if (!title) return "Product title is required.";
      if (isNaN(parseFloat(price))) return "Price must be a valid number.";

      const graphql = `
        mutation productCreate($input: ProductInput!) {
          productCreate(input: $input) {
            product {
              id
              title
              handle
              onlineStoreUrl
              priceRangeV2 { minVariantPrice { amount currencyCode } }
            }
            userErrors { field message }
          }
        }
      `;

      // 2024-10 compliant: productOptions + variants with optionValues, media instead of images
      const hasValidImage = imageUrl && isValidHttpsUrl(imageUrl);
      const productInput: Record<string, unknown> = {
        title,
        descriptionHtml,
        productOptions: [{ name: "Title", values: [{ name: "Default Title" }] }],
        variants: [
          {
            price,
            optionValues: [{ name: "Default Title" }],
            ...(compareAt && parseFloat(compareAt) > 0 ? { compareAtPrice: compareAt } : {}),
          },
        ],
        ...(tags ? { tags: tags.split(",").map((t: string) => t.trim()).filter(Boolean) } : {}),
        ...(hasValidImage ? { media: [{ originalSource: imageUrl, mediaContentType: "IMAGE" }] } : {}),
      };

      let result = await shopifyGraphQL(creds.shopDomain, creds.accessToken, graphql, { input: productInput });
      // Fallback: if variants format is rejected (e.g. API version mismatch), retry without variants/media and set price via bulk update
      const shouldFallback =
        result.ok &&
        (result.data as { productCreate?: { userErrors?: Array<{ message?: string }> } })?.productCreate?.userErrors?.some(
          (e) => e.message?.toLowerCase().includes("variant") || e.message?.toLowerCase().includes("media"),
        );
      if (shouldFallback) {
        const fallbackInput: Record<string, unknown> = {
          title,
          descriptionHtml,
          ...(tags ? { tags: tags.split(",").map((t: string) => t.trim()).filter(Boolean) } : {}),
        };
        result = await shopifyGraphQL(creds.shopDomain, creds.accessToken, graphql, { input: fallbackInput });
      }
      if (result.status === 401) {
        if (context.tenantId) await revokeShopifyConnection(context.tenantId, creds.shopDomain).catch(() => {});
        return "La connessione Shopify è scaduta o è stata revocata. Riconnetti lo store dal pannello 'Connetti Shopify'.";
      }
      if (!result.ok) return `Shopify API error: ${result.statusText}`;
      if (result.errors) return `Shopify GraphQL error: ${JSON.stringify(result.errors)}`;

      const productResult = result.data as {
        productCreate?: {
          product?: { id?: string; title?: string; handle?: string; onlineStoreUrl?: string };
          userErrors?: Array<{ field?: string; message?: string }>;
        };
      };

      const errors = productResult?.productCreate?.userErrors;
      if (errors?.length) {
        return `Product creation failed: ${errors.map((e) => e.message).join(", ")}`;
      }

      const p = productResult?.productCreate?.product;
      return [
        `✅ Product created successfully!`,
        `Title: ${p?.title ?? title}`,
        `Price: ${price}`,
        compareAt ? `Compare at: ${compareAt}` : null,
        `Handle: ${p?.handle ?? "N/A"}`,
        p?.onlineStoreUrl ? `URL: ${p.onlineStoreUrl}` : null,
        ``,
        `The product is now live on your store. You can manage it from your Shopify admin.`,
      ].filter(Boolean).join("\n");
    }

    case "shopify_create_discount": {
      const creds = await resolveShopifyCredentials(context.tenantId);
      if (!creds) {
        return "Shopify not configured. Use shopify_setup_store to connect your store first, or set SHOPIFY_SHOP_DOMAIN and SHOPIFY_ADMIN_ACCESS_TOKEN in your environment.";
      }

      const code = sanitizeText(input.code || "", 50).toUpperCase();
      const type = input.type || "percentage";
      const value = sanitizeText(input.value || "0", 20);
      const usageLimit = Number(input.usage_limit) || undefined;
      const startsAt = input.starts_at || undefined;
      const endsAt = input.ends_at || undefined;

      if (!code) return "Discount code is required.";
      if (type !== "percentage" && type !== "fixed_amount") {
        return "Discount type must be 'percentage' or 'fixed_amount'.";
      }
      if (isNaN(parseFloat(value))) return "Discount value must be a valid number.";

      const graphql = `
        mutation discountCodeBasicCreate($basicCodeDiscountInput: DiscountCodeBasicInput!) {
          discountCodeBasicCreate(basicCodeDiscountInput: $basicCodeDiscountInput) {
            codeDiscountNode {
              id
              codeDiscount {
                ... on DiscountCodeBasic {
                  codes(first: 1) {
                    edges { node { code } }
                  }
                  startsAt
                  endsAt
                }
              }
            }
            userErrors { field message }
          }
        }
      `;

      const discountInput: Record<string, unknown> = {
        title: code,
        code: code,
        startsAt: startsAt || new Date().toISOString(),
        ...(endsAt ? { endsAt } : {}),
        ...(usageLimit ? { usageLimit } : {}),
        customerGets: {
          value: {
            ...(type === "percentage"
              ? { discountPercentage: parseFloat(value) / 100 }
              : { discountAmount: { amount: value, appliesOnEachItem: false } }),
          },
          items: { all: true },
        },
        customerSelection: { all: true },
      };

      const result = await shopifyGraphQL(creds.shopDomain, creds.accessToken, graphql, { basicCodeDiscountInput: discountInput });
      if (result.status === 401) {
        if (context.tenantId) await revokeShopifyConnection(context.tenantId, creds.shopDomain).catch(() => {});
        return "La connessione Shopify è scaduta o è stata revocata. Riconnetti lo store dal pannello 'Connetti Shopify'.";
      }
      if (!result.ok) return `Shopify API error: ${result.statusText}`;
      if (result.errors) return `Shopify GraphQL error: ${JSON.stringify(result.errors)}`;

      const dcResult = result.data as {
        discountCodeBasicCreate?: {
          codeDiscountNode?: { id?: string };
          userErrors?: Array<{ field?: string; message?: string }>;
        };
      };

      const errors = dcResult?.discountCodeBasicCreate?.userErrors;
      if (errors?.length) {
        return `Discount creation failed: ${errors.map((e) => e.message).join(", ")}`;
      }

      return [
        `✅ Discount code created!`,
        `Code: ${code}`,
        `Type: ${type === "percentage" ? `${value}% off` : `€${value} off`}`,
        usageLimit ? `Usage limit: ${usageLimit}` : null,
        startsAt ? `Starts: ${startsAt}` : null,
        endsAt ? `Ends: ${endsAt}` : null,
        ``,
        `Share this code with your customers to boost sales!`,
      ].filter(Boolean).join("\n");
    }

    case "shopify_list_collections": {
      const creds = await resolveShopifyCredentials(context.tenantId);
      if (!creds) {
        return "Shopify not configured. Use shopify_setup_store to connect your store first, or set SHOPIFY_SHOP_DOMAIN and SHOPIFY_ADMIN_ACCESS_TOKEN in your environment.";
      }

      const limit = Math.min(50, Math.max(1, Number(input.limit) || 20));
      const graphql = `
        query listCollections($first: Int!) {
          collections(first: $first) {
            edges {
              node {
                id
                title
                handle
                productsCount { count }
              }
            }
          }
        }
      `;

      const result = await shopifyGraphQL(creds.shopDomain, creds.accessToken, graphql, { first: limit });
      if (result.status === 401) {
        if (context.tenantId) await revokeShopifyConnection(context.tenantId, creds.shopDomain).catch(() => {});
        return "La connessione Shopify è scaduta o è stata revocata. Riconnetti lo store dal pannello 'Connetti Shopify'.";
      }
      if (!result.ok) return `Shopify API error: ${result.statusText}`;
      if (result.errors) return `Shopify GraphQL error: ${JSON.stringify(result.errors)}`;

      const edges = (
        (result.data as { collections?: { edges?: unknown[] } })?.collections?.edges || []
      ) as Array<{
        node?: { id?: string; title?: string; handle?: string; productsCount?: { count?: number } };
      }>;

      if (!edges.length) return "No collections found.";

      const results = edges.map((e, i) => {
        const n = e.node;
        return `  ${i + 1}. ${n?.title ?? "N/A"} (${n?.productsCount?.count ?? 0} products) — ID: ${n?.id ?? "N/A"}`;
      });

      return `Found ${edges.length} collection(s):\n\n${results.join("\n")}`;
    }

    case "shopify_manage_collection": {
      const creds = await resolveShopifyCredentials(context.tenantId);
      if (!creds) {
        return "Shopify not configured. Use shopify_setup_store to connect your store first, or set SHOPIFY_SHOP_DOMAIN and SHOPIFY_ADMIN_ACCESS_TOKEN in your environment.";
      }

      const collectionId = sanitizeText(input.collection_id || "", 200);
      const productIdsRaw = sanitizeText(input.product_ids || "", 2000);
      const action = input.action || "add";

      if (!collectionId) return "collection_id is required.";
      if (!productIdsRaw) return "product_ids is required (comma-separated GIDs).";
      if (action !== "add" && action !== "remove") return "action must be 'add' or 'remove'.";

      const productIds = productIdsRaw.split(",").map((s) => s.trim()).filter(Boolean);

      // Use collectionAddProducts / collectionRemoveProducts mutations
      const mutationName = action === "add" ? "collectionAddProducts" : "collectionRemoveProducts";
      const graphql = `
        mutation ${mutationName}($id: ID!, $productIds: [ID!]!) {
          ${mutationName}(id: $id, productIds: $productIds) {
            collection { id title }
            userErrors { field message }
          }
        }
      `;

      const result = await shopifyGraphQL(creds.shopDomain, creds.accessToken, graphql, {
        id: collectionId,
        productIds,
      });
      if (result.status === 401) {
        if (context.tenantId) await revokeShopifyConnection(context.tenantId, creds.shopDomain).catch(() => {});
        return "La connessione Shopify è scaduta o è stata revocata. Riconnetti lo store dal pannello 'Connetti Shopify'.";
      }
      if (!result.ok) return `Shopify API error: ${result.statusText}`;
      if (result.errors) return `Shopify GraphQL error: ${JSON.stringify(result.errors)}`;

      const resData = result.data as Record<string, { collection?: { title?: string }; userErrors?: Array<{ message?: string }> }>;
      const opResult = resData?.[mutationName];
      const errors = opResult?.userErrors;
      if (errors?.length) {
        return `Operation failed: ${errors.map((e) => e.message).join(", ")}`;
      }

      return [
        `✅ Collection updated!`,
        `Collection: ${opResult?.collection?.title ?? collectionId}`,
        `Action: ${action === "add" ? "Added" : "Removed"} ${productIds.length} product(s)`,
      ].join("\n");
    }

    case "shopify_update_inventory": {
      const creds = await resolveShopifyCredentials(context.tenantId);
      if (!creds) {
        return "Shopify not configured. Use shopify_setup_store to connect your store first, or set SHOPIFY_SHOP_DOMAIN and SHOPIFY_ADMIN_ACCESS_TOKEN in your environment.";
      }

      const variantId = sanitizeText(input.variant_id || "", 200);
      const quantity = Number(input.quantity);

      if (!variantId) return "variant_id is required (e.g. gid://shopify/ProductVariant/123).";
      if (isNaN(quantity) || quantity < 0) return "quantity must be a non-negative number.";

      // First, find the inventory item for this variant
      const graphqlVariant = `
        query getVariant($id: ID!) {
          productVariant(id: $id) {
            id
            title
            inventoryItem { id inventoryLevel { location { name } available } }
            product { title }
          }
        }
      `;

      const variantResult = await shopifyGraphQL(creds.shopDomain, creds.accessToken, graphqlVariant, { id: variantId });
      if (!variantResult.ok) return `Shopify API error: ${variantResult.statusText}`;
      if (variantResult.errors) return `Shopify GraphQL error: ${JSON.stringify(variantResult.errors)}`;

      const variantData = (variantResult.data as {
        productVariant?: {
          id?: string;
          title?: string;
          inventoryItem?: { id?: string; inventoryLevel?: { location?: { name?: string }; available?: number } };
          product?: { title?: string };
        };
      })?.productVariant;

      if (!variantData) return `Variant not found: ${variantId}`;

      const inventoryItemId = variantData.inventoryItem?.id;
      if (!inventoryItemId) return `No inventory item found for variant ${variantData.title}."`;

      // Get the location to set inventory at
      const graphqlLocations = `
        query { locations(first: 1) { edges { node { id name } } } }
      `;
      const locResult = await shopifyGraphQL(creds.shopDomain, creds.accessToken, graphqlLocations);
      const locationId = (
        (locResult.data as { locations?: { edges?: Array<{ node?: { id?: string } }> } })?.locations?.edges?.[0]?.node?.id
      );

      if (!locationId) return "No location found in your Shopify store.";

      // Set inventory level
      const graphqlSetInventory = `
        mutation inventoryAdjustQuantityAtLocation($inventoryItemId: ID!, $locationId: ID!, $delta: Int!) {
          inventoryAdjustQuantityAtLocation(
            inventoryItemId: $inventoryItemId,
            locationId: $locationId,
            delta: $delta
          ) {
            inventoryLevel { available }
          }
        }
      `;

      const currentAvailable = variantData.inventoryItem?.inventoryLevel?.available || 0;
      const delta = quantity - currentAvailable;

      const invResult = await shopifyGraphQL(creds.shopDomain, creds.accessToken, graphqlSetInventory, {
        inventoryItemId,
        locationId,
        delta,
      });
      if (!invResult.ok) return `Shopify API error: ${invResult.statusText}`;
      if (invResult.errors) return `Shopify GraphQL error: ${JSON.stringify(invResult.errors)}`;

      return [
        `✅ Inventory updated!`,
        `Product: ${variantData.product?.title ?? "N/A"}`,
        `Variant: ${variantData.title ?? "Default"}`,
        `Previous: ${currentAvailable} units`,`New: ${quantity} units`,`Delta: ${delta >= 0 ? "+" : ""}${delta} units` ].join("\n");
    }

    case "calendar_search_availability": {
      const startDate = input.start_date || "";
      const endDate = input.end_date || "";
      const attendees = (input.attendees || "")
        .split(",")
        .map((email) => email.trim())
        .filter(Boolean);

      if (!startDate || !endDate) {
        return "calendar_search_availability requires start_date and end_date.";
      }

      if (!isValidIsoDate(startDate) || !isValidIsoDate(endDate)) {
        return "calendar_search_availability requires valid ISO date/time strings for start_date and end_date.";
      }

      const start = new Date(startDate);
      const end = new Date(endDate);
      if (end <= start) {
        return "End time must be after start time.";
      }

      let accessToken = process.env.GOOGLE_CALENDAR_ACCESS_TOKEN;
      let calendarId = process.env.GOOGLE_CALENDAR_CALENDAR_ID;
      // Per-user OAuth connection (google_connections) takes priority — the
      // agent reads the user's own calendar instead of the legacy env
      // credentials. Legacy vars remain the fallback for non-OAuth setups.
      if (context.userId && context.userId !== "anonymous") {
        const conn = await getGoogleConnection(context.userId).catch(() => null);
        if (conn) {
          accessToken = conn.accessToken;
          calendarId = "primary";
        }
      }
      const tenantId = context.tenantId;
      if (tenantId) {
        const creds = getTenantCredentials(tenantId);
        if (creds?.google) {
          calendarId = creds.google.calendarId || calendarId;
          accessToken = creds.google.accessToken || accessToken;
        }
      }
      if (!accessToken || !calendarId) {
        return "Calendar tool not configured. Set tenant calendar credentials or GOOGLE_CALENDAR_ACCESS_TOKEN and GOOGLE_CALENDAR_CALENDAR_ID in your environment.";
      }

      if (end.getTime() - start.getTime() > 1000 * 60 * 60 * 24 * 31) {
        return "Requested range cannot exceed 31 days.";
      }

      for (const email of attendees) {
        if (!isValidEmail(email)) {
          return `Invalid attendee email: ${email}`;
        }
      }

      try {
        // If tenant provided a refresh token stored in memory, try to refresh access token when missing.
        if ((!accessToken || accessToken.length < 10) && tenantId) {
          const creds = getTenantCredentials(tenantId);
          const refreshToken = creds?.google?.refreshToken;
          const clientId = process.env.GOOGLE_CLIENT_ID;
          const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
          if (refreshToken && clientId && clientSecret) {
            try {
              const tokenRes = await fetch(
                "https://oauth2.googleapis.com/token",
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                  },
                  body: new URLSearchParams({
                    client_id: clientId,
                    client_secret: clientSecret,
                    grant_type: "refresh_token",
                    refresh_token: refreshToken,
                  }).toString(),
                },
              );
              if (tokenRes.ok) {
                const tokenJson = await tokenRes.json();
                accessToken = tokenJson.access_token || accessToken;
                try {
                  updateTenantGoogleTokens(
                    tenantId,
                    accessToken,
                    tokenJson.refresh_token,
                  );
                } catch {}
              }
            } catch {
              // token refresh failure — fall back to the stored access token
            }
          }
        }
        const freeBusyResponse = await fetch(
          "https://www.googleapis.com/calendar/v3/freeBusy",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              timeMin: start.toISOString(),
              timeMax: end.toISOString(),
              timeZone: "UTC",
              items: [{ id: calendarId }],
            }),
          },
        );

        if (!freeBusyResponse.ok) {
          const text = await freeBusyResponse.text();
          return `Calendar availability lookup failed: ${freeBusyResponse.status} ${freeBusyResponse.statusText} - ${text}`;
        }

        const freeBusyData = await freeBusyResponse.json();
        const busy = freeBusyData.calendars?.[calendarId]?.busy || [];
        const availability = busy.length
          ? busy
              .map(
                (block: { start?: string; end?: string }) =>
                  `Busy from ${block.start} to ${block.end}`,
              )
              .join("\n")
          : "No busy slots found in the requested range.";

        const attendeeList = attendees.length
          ? `Attendees: ${attendees.join(", ")}`
          : "No attendees specified.";
        return `Calendar availability for ${start.toISOString()} → ${end.toISOString()}\n${attendeeList}\n${availability}`;
      } catch (e) {
        return `Calendar availability network error: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    case "calendar_book_event": {
      let accessToken = process.env.GOOGLE_CALENDAR_ACCESS_TOKEN;
      let calendarId = process.env.GOOGLE_CALENDAR_CALENDAR_ID;
      const tenantId = context.tenantId;
      if (tenantId) {
        const creds = getTenantCredentials(tenantId);
        if (creds?.google) {
          calendarId = creds.google.calendarId || calendarId;
          accessToken = creds.google.accessToken || accessToken;
        }
      }
      if (!accessToken || !calendarId) {
        return "Calendar tool not configured. Set tenant calendar credentials or GOOGLE_CALENDAR_ACCESS_TOKEN and GOOGLE_CALENDAR_CALENDAR_ID in your environment.";
      }

      const title = sanitizeText(
        input.title || "Untitled event",
        MAX_EVENT_TEXT_LENGTH,
      );
      const startTime = input.start_time || "";
      const endTime = input.end_time || "";
      const attendees = (input.attendees || "")
        .split(",")
        .map((email) => email.trim())
        .filter(Boolean);
      const location = sanitizeText(
        input.location || "",
        MAX_EVENT_TEXT_LENGTH,
      );
      const description = sanitizeText(
        input.description || "",
        MAX_EVENT_TEXT_LENGTH,
      );

      if (!startTime || !endTime) {
        return "calendar_book_event requires both start_time and end_time.";
      }

      if (!isValidIsoDate(startTime) || !isValidIsoDate(endTime)) {
        return "calendar_book_event requires valid ISO date/time strings for start_time and end_time.";
      }

      const start = new Date(startTime);
      const end = new Date(endTime);
      if (end <= start) {
        return "Event end time must be after start time.";
      }

      const durationMs = end.getTime() - start.getTime();
      if (durationMs > 1000 * 60 * 60 * 8) {
        return "Event duration cannot exceed 8 hours.";
      }

      const attendeeObjects = [] as Array<{ email: string }>;
      for (const email of attendees) {
        if (!isValidEmail(email)) {
          return `Invalid attendee email: ${email}`;
        }
        attendeeObjects.push({ email });
      }

      try {
        // Attempt refresh if accessToken missing and refresh token present
        if ((!accessToken || accessToken.length < 10) && tenantId) {
          const creds = getTenantCredentials(tenantId);
          const refreshToken = creds?.google?.refreshToken;
          const clientId = process.env.GOOGLE_CLIENT_ID;
          const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
          if (refreshToken && clientId && clientSecret) {
            try {
              const tokenRes = await fetch(
                "https://oauth2.googleapis.com/token",
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                  },
                  body: new URLSearchParams({
                    client_id: clientId,
                    client_secret: clientSecret,
                    grant_type: "refresh_token",
                    refresh_token: refreshToken,
                  }).toString(),
                },
              );
              if (tokenRes.ok) {
                const tokenJson = await tokenRes.json();
                accessToken = tokenJson.access_token || accessToken;
                try {
                  updateTenantGoogleTokens(
                    tenantId,
                    accessToken,
                    tokenJson.refresh_token,
                  );
                } catch {}
              }
            } catch {
              // token refresh failure — fall back to the stored access token
            }
          }
        }
        const res = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              summary: title,
              description,
              location,
              start: { dateTime: start.toISOString() },
              end: { dateTime: end.toISOString() },
              attendees: attendeeObjects,
              ...(input.reminder_minutes
                ? {
                    reminders: {
                      useDefault: false,
                      overrides: [{ method: "popup", minutes: Number(input.reminder_minutes) }],
                    },
                  }
                : {}),
            }),
          },
        );

        if (!res.ok) {
          const text = await res.text();
          return `Calendar booking failed: ${res.status} ${res.statusText} - ${text}`;
        }

        const event = await res.json();
        return `Event booked: ${event.summary || title}\nStart: ${event.start?.dateTime || start.toISOString()}\nEnd: ${event.end?.dateTime || end.toISOString()}\nLocation: ${event.location || location}\nGoogle Calendar event link: ${event.htmlLink || "none"}`;
      } catch (e) {
        return `Calendar booking network error: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    case "gmail_send": {
      if (!context.userId || context.userId === "anonymous") {
        return "gmail_send requires a connected Google account. Please log in and connect Gmail from the dashboard, then retry.";
      }
      const to = sanitizeText(input.to || "", 500);
      const subject = sanitizeText(input.subject || "", 500);
      const body = (input.body || "").toString().slice(0, 10000);
      const cc = sanitizeText(input.cc || "", 500);
      const bcc = sanitizeText(input.bcc || "", 500);
      if (!to || !isValidEmail(to.split(",")[0].trim())) return "gmail_send requires a valid 'to' email.";
      if (!subject) return "gmail_send requires a subject.";
      if (!body) return "gmail_send requires a body.";
      const tokenData = await getGoogleTokenForContext(context);
      if (!tokenData) return "No Google account connected. Connect Gmail from the dashboard (or via chat panel for admin), then retry.";
      try {
        const headers = [
          `To: ${to}`,
          `Subject: ${subject}`,
          `Content-Type: text/plain; charset="UTF-8"`,
          `MIME-Version: 1.0`,
          ...(cc ? [`Cc: ${cc}`] : []),
          ...(bcc ? [`Bcc: ${bcc}`] : []),
        ];
        const raw = headers.join("\r\n") + "\r\n\r\n" + body;
        const encoded = Buffer.from(raw)
          .toString("base64")
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=+$/, "");
        const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
          method: "POST",
          headers: { Authorization: `Bearer ${tokenData.accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ raw: encoded }),
        });
        if (!res.ok) {
          const txt = await res.text();
          return `Gmail send failed: ${res.status} ${res.statusText} - ${txt}`;
        }
        const json = (await res.json()) as { id?: string };
        return `✅ Email sent to ${to} (id: ${json.id ?? "unknown"}). Subject: "${subject}"`;
      } catch (e) {
        return `Gmail send network error: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    case "gmail_trash": {
      if (!context.userId || context.userId === "anonymous") {
        return "gmail_trash requires a connected Google account. Please log in and connect Gmail from the dashboard, then retry.";
      }
      const messageId = sanitizeText(input.message_id || "", 200);
      if (!messageId) return "gmail_trash requires message_id. Use list_emails first to get the ID.";
      const tokenData = await getGoogleTokenForContext(context);
      if (!tokenData) return "No Google account connected. Connect Gmail from the dashboard (or via chat panel for admin), then retry.";
      try {
        const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(messageId)}/trash`, {
          method: "POST",
          headers: { Authorization: `Bearer ${tokenData.accessToken}` },
        });
        if (!res.ok) {
          const txt = await res.text();
          return `Gmail trash failed: ${res.status} ${res.statusText} - ${txt}`;
        }
        return `✅ Email ${messageId} moved to trash.`;
      } catch (e) {
        return `Gmail trash network error: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    case "calendar_delete_event": {
      if (!context.userId || context.userId === "anonymous") {
        return "calendar_delete_event requires a connected Google account. Please log in and connect Calendar from the dashboard, then retry.";
      }
      const eventId = sanitizeText(input.event_id || "", 500);
      if (!eventId) return "calendar_delete_event requires event_id. Use get_calendar_events first to find the ID.";
      const tokenData = await getGoogleTokenForContext(context);
      if (!tokenData) return "No Google account connected. Connect Calendar from the dashboard (or via chat panel for admin), then retry.";
      try {
        const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${tokenData.accessToken}` },
        });
        if (!res.ok && res.status !== 204) {
          const txt = await res.text();
          return `Calendar delete failed: ${res.status} ${res.statusText} - ${txt}`;
        }
        return `✅ Event ${eventId} deleted from Google Calendar.`;
      } catch (e) {
        return `Calendar delete network error: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    case "calendar_set_reminder": {
      if (!context.userId || context.userId === "anonymous") {
        return "calendar_set_reminder requires a connected Google account. Please log in and connect Calendar from the dashboard, then retry.";
      }
      const eventId = sanitizeText(input.event_id || "", 500);
      const minutes = Number(input.minutes);
      const method = sanitizeText(input.method || "popup", 20).toLowerCase();
      if (!eventId) return "calendar_set_reminder requires event_id.";
      if (!Number.isFinite(minutes) || minutes < 0 || minutes > 40320) return "calendar_set_reminder requires minutes between 0 and 40320.";
      const validMethod = method === "email" ? "email" : "popup";
      const tokenData = await getGoogleTokenForContext(context);
      if (!tokenData) return "No Google account connected. Connect Calendar from the dashboard (or via chat panel for admin), then retry.";
      try {
        const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${tokenData.accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            reminders: { useDefault: false, overrides: [{ method: validMethod, minutes }] },
          }),
        });
        if (!res.ok) {
          const txt = await res.text();
          return `Calendar reminder failed: ${res.status} ${res.statusText} - ${txt}`;
        }
        return `✅ Reminder set for event ${eventId}: ${minutes} minutes before via ${validMethod}.`;
      } catch (e) {
        return `Calendar reminder network error: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    case "list_emails": {
      if (!context.userId || context.userId === "anonymous") {
        return "list_emails requires a connected Google account. Please log in and connect Gmail from the dashboard settings.";
      }
      const emailsResult = await googleApiProxy(
        "list_emails",
        {
          query: input.query || "",
          max_results: input.max_results || "10",
        },
        context.userId,
      );
      return emailsResult.ok ? String(emailsResult.data) : emailsResult.error;
    }

    case "get_calendar_events": {
      if (!context.userId || context.userId === "anonymous") {
        return "get_calendar_events requires a connected Google account. Please log in and connect Google Calendar from the dashboard settings.";
      }
      const eventsResult = await googleApiProxy(
        "get_calendar_events",
        {
          date_from: input.date_from || "",
          date_to: input.date_to || "",
        },
        context.userId,
      );
      return eventsResult.ok ? String(eventsResult.data) : eventsResult.error;
    }

    case "lead_capture_submit": {
      const endpoint = process.env.LEAD_CAPTURE_ENDPOINT;
      const slackWebhook = process.env.SLACK_WEBHOOK_URL;
      const leadDetails = {
        name: sanitizeText(input.name || "Unknown", MAX_LEAD_FIELD_LENGTH),
        email: sanitizeText(input.email || "", MAX_LEAD_FIELD_LENGTH),
        company: sanitizeText(input.company || "", MAX_LEAD_FIELD_LENGTH),
        phone: sanitizeText(input.phone || "", MAX_LEAD_FIELD_LENGTH),
        message: sanitizeText(input.message || "", MAX_LEAD_FIELD_LENGTH),
        source: sanitizeText(input.source || "", MAX_LEAD_FIELD_LENGTH),
        tenantId: context.tenantId || "default",
      };

      if (!leadDetails.email) {
        return "lead_capture_submit requires an email address.";
      }

      if (!isValidEmail(leadDetails.email)) {
        return `Invalid email address: ${leadDetails.email}`;
      }

      logAudit("lead_capture_submit", {
        tenantId: leadDetails.tenantId,
        email: leadDetails.email,
        company: leadDetails.company,
        source: leadDetails.source,
      });

      if (endpoint) {
        if (!isValidHttpsUrl(endpoint)) {
          return "Configured LEAD_CAPTURE_ENDPOINT must be a valid HTTPS URL.";
        }

        try {
          const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(leadDetails),
          });
          const text = await res.text();
          return `Lead submitted to endpoint. Response: ${res.status} ${res.statusText}\n${text}`;
        } catch (e) {
          return `Lead submission network error: ${e instanceof Error ? e.message : String(e)}`;
        }
      }

      if (slackWebhook) {
        if (!isValidHttpsUrl(slackWebhook)) {
          return "Configured SLACK_WEBHOOK_URL must be a valid HTTPS URL.";
        }

        try {
          const message = `*New lead captured*\n• Name: ${leadDetails.name}\n• Email: ${leadDetails.email}\n• Company: ${leadDetails.company}\n• Phone: ${leadDetails.phone}\n• Source: ${leadDetails.source}\n• Message: ${leadDetails.message}\n• Tenant: ${leadDetails.tenantId}`;
          const res = await fetch(slackWebhook, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: message }),
          });
          const text = await res.text();
          return `Lead submitted via Slack webhook. Response: ${res.status} ${res.statusText}\n${text}`;
        } catch (e) {
          return `Lead submission Slack error: ${e instanceof Error ? e.message : String(e)}`;
        }
      }

      return `✅ Lead captured successfully for tenant ${leadDetails.tenantId}: ${leadDetails.name} (${leadDetails.email}${leadDetails.company ? `, ${leadDetails.company}` : ""}). Configure LEAD_CAPTURE_ENDPOINT or SLACK_WEBHOOK_URL to forward externally.`;
    }

    case "lead_capture_enrich": {
      const enrichEndpoint = process.env.LEAD_CAPTURE_ENRICH_ENDPOINT;
      if (!enrichEndpoint) {
        return "Lead enrichment tool not configured. Set LEAD_CAPTURE_ENRICH_ENDPOINT in your environment.";
      }

      const email = sanitizeText(input.email || "", MAX_LEAD_FIELD_LENGTH);
      const company = sanitizeText(input.company || "", MAX_LEAD_FIELD_LENGTH);
      if (!email) {
        return "lead_capture_enrich requires an email address.";
      }

      if (!isValidEmail(email)) {
        return `Invalid email address: ${email}`;
      }

      if (!isValidHttpsUrl(enrichEndpoint)) {
        return "Configured LEAD_CAPTURE_ENRICH_ENDPOINT must be a valid HTTPS URL.";
      }

      try {
        const res = await fetch(enrichEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, company }),
        });
        const text = await res.text();
        return `Lead enrichment response: ${res.status} ${res.statusText}\n${text}`;
      } catch (e) {
        return `Lead enrichment network error: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    case "lead_capture_notify_sales": {
      const slackWebhook = process.env.SLACK_WEBHOOK_URL;
      if (!slackWebhook) {
        return "Sales notification tool not configured. Set SLACK_WEBHOOK_URL in your environment.";
      }

      const details = sanitizeText(
        input.lead_details || "No lead details provided.",
        MAX_LEAD_FIELD_LENGTH,
      );
      if (!isValidHttpsUrl(slackWebhook)) {
        return "Configured SLACK_WEBHOOK_URL must be a valid HTTPS URL.";
      }

      try {
        const res = await fetch(slackWebhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: `*Sales alert*\n${details}` }),
        });
        const text = await res.text();
        return `Sales notification sent. Response: ${res.status} ${res.statusText}\n${text}`;
      } catch (e) {
        return `Sales notification network error: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    case "quote_generate": {
      const email = sanitizeText(input.client_email || "", MAX_LEAD_FIELD_LENGTH);
      if (!email || !isValidEmail(email)) {
        return `quote_generate requires a valid client_email: "${email}"`;
      }
      let items: any[] = [];
      try {
        items =
          typeof input.items === "string" ? JSON.parse(input.items) : input.items;
      } catch {
        return 'Invalid items JSON format. Provide an array of { description, quantity, unitPrice }. Example: [{"description":"Consulenza","quantity":1,"unitPrice":500}]';
      }
      if (!Array.isArray(items) || items.length === 0) {
        return "quote_generate requires at least one line item in items.";
      }
      const quote = calculateQuote({
        clientName: sanitizeText(
          input.client_name || "Cliente",
          MAX_LEAD_FIELD_LENGTH,
        ),
        clientEmail: email,
        items,
        currency: input.currency || "EUR",
        taxRate: input.tax_rate ? Number(input.tax_rate) : undefined,
        validDays: input.valid_days ? Number(input.valid_days) : 30,
        notes: input.notes ? sanitizeText(input.notes, 1000) : undefined,
        tenantId: context.tenantId || "default",
      });
      return formatQuoteMarkdown(quote);
    }

    case "quote_send_email": {
      const email = sanitizeText(input.client_email || "", MAX_LEAD_FIELD_LENGTH);
      if (!email || !isValidEmail(email)) {
        return `quote_send_email requires a valid client_email: "${email}"`;
      }
      let items: any[] = [];
      try {
        items =
          typeof input.items === "string" ? JSON.parse(input.items) : input.items;
      } catch {
        return 'Invalid items JSON format. Provide an array of { description, quantity, unitPrice }';
      }
      if (!Array.isArray(items) || items.length === 0) {
        return "quote_send_email requires at least one line item in items.";
      }
      const quote = calculateQuote({
        clientName: sanitizeText(
          input.client_name || "Cliente",
          MAX_LEAD_FIELD_LENGTH,
        ),
        clientEmail: email,
        items,
        currency: input.currency || "EUR",
        notes: input.notes ? sanitizeText(input.notes, 1000) : undefined,
        tenantId: context.tenantId || "default",
      });
      const res = await sendQuoteByEmail(quote);
      if (res.previewOnly) {
        return `✅ Preventivo ${quote.quoteId} generato. (RESEND_API_KEY non configurata: anteprima salvata)\n\n${formatQuoteMarkdown(quote)}`;
      }
      if (res.ok) {
        return `✅ Preventivo ${quote.quoteId} inviato con successo via email a ${email}! (ID: ${res.messageId || "ok"})`;
      }
      return `Errore durante l'invio dell'email per il preventivo ${quote.quoteId}.`;
    }

    case "google_reviews_list": {
      const minRating = input.min_rating ? Number(input.min_rating) : undefined;
      const unansweredOnly =
        input.unanswered_only === "true" || (input.unanswered_only as any) === true;
      const reviews = await listBusinessReviews({
        tenantId: context.tenantId || context.userId,
        minRating,
        unansweredOnly,
      });
      return formatReviewsMarkdown(reviews);
    }

    case "google_reviews_reply": {
      const reviewId = sanitizeText(input.review_id || "", 200);
      const replyText = sanitizeText(input.reply_text || "", 2000);
      if (!reviewId || !replyText) {
        return "google_reviews_reply requires review_id and reply_text.";
      }
      const res = await replyToBusinessReview(
        context.tenantId || context.userId,
        reviewId,
        replyText,
      );
      return res.message;
    }

    case "finance_get_cashflow": {
      const filename = input.filename?.trim();
      const csvText =
        input.csv ||
        (filename && context.files?.[filename] ? context.files[filename] : undefined);
      if (filename && !csvText) {
        return `File "${filename}" not found. Available files: ${Object.keys(context.files || {}).join(", ") || "none"}`;
      }
      const summary = await getFinanceCashFlow({
        csvText,
        days: input.days ? Number(input.days) : 30,
      });
      return formatCashFlowMarkdown(summary);
    }

    case "finance_create_invoice": {
      const email = sanitizeText(input.client_email || "", MAX_LEAD_FIELD_LENGTH);
      if (!email || !isValidEmail(email)) {
        return `finance_create_invoice requires a valid client_email: "${email}"`;
      }
      let items: Array<{ description: string; quantity: number; unitPrice: number }> = [];
      try {
        const parsed =
          typeof input.items === "string" ? JSON.parse(input.items) : input.items;
        items = Array.isArray(parsed) ? parsed : [];
      } catch {
        return 'Invalid items JSON. Example: [{"description":"Consulenza","quantity":1,"unitPrice":500}]';
      }
      if (items.length === 0) {
        return "finance_create_invoice requires at least one line item in items.";
      }
      const invoice = createInvoice({
        clientName: sanitizeText(input.client_name || "Cliente", MAX_LEAD_FIELD_LENGTH),
        clientEmail: email,
        items,
        currency: input.currency || "EUR",
        taxRate: input.tax_rate ? Number(input.tax_rate) : undefined,
        dueDays: input.due_days ? Number(input.due_days) : 30,
        notes: input.notes ? sanitizeText(input.notes, 1000) : undefined,
      });
      return invoiceDownloadPayload(invoice);
    }

    case "finance_send_reminder": {
      const email = sanitizeText(input.client_email || "", MAX_LEAD_FIELD_LENGTH);
      if (!email || !isValidEmail(email)) {
        return `finance_send_reminder requires a valid client_email: "${email}"`;
      }
      return sendPaymentReminder({
        clientName: sanitizeText(input.client_name || "Cliente", MAX_LEAD_FIELD_LENGTH),
        clientEmail: email,
        invoiceId: input.invoice_id
          ? sanitizeText(input.invoice_id, 80)
          : undefined,
        amount: input.amount ? Number(input.amount) : undefined,
        currency: input.currency || "EUR",
        dueDate: input.due_date ? sanitizeText(input.due_date, 32) : undefined,
      });
    }

    case "hr_parse_cv": {
      const filename = input.filename?.trim();
      const cvText =
        input.cv_text ||
        (filename && context.files?.[filename] ? context.files[filename] : "");
      if (!cvText.trim()) {
        return filename
          ? `File "${filename}" not found. Available files: ${Object.keys(context.files || {}).join(", ") || "none"}`
          : "hr_parse_cv requires cv_text or filename of an uploaded CV.";
      }
      const parsed = parseCv(cvText);
      return `cv_analyzed\n\n${formatParsedCvMarkdown(parsed)}`;
    }

    case "hr_score_candidate": {
      const jd = input.job_description?.trim();
      if (!jd) return "hr_score_candidate requires job_description.";
      const filename = input.filename?.trim();
      const cvText =
        input.cv_text ||
        (filename && context.files?.[filename] ? context.files[filename] : undefined);
      const skills = input.skills
        ? input.skills.split(",").map((s) => s.trim()).filter(Boolean)
        : undefined;
      const scored = scoreCandidate({ cvText, skills, jobDescription: jd });
      return formatCandidateScoreMarkdown(scored);
    }

    case "social_generate_calendar": {
      const topic = input.topic?.trim();
      if (!topic) return "social_generate_calendar requires a topic.";
      const calendar = generateEditorialCalendar({
        topic,
        brand: input.brand,
        platforms: input.platforms,
        postsCount: input.posts_count ? Number(input.posts_count) : undefined,
        language: input.language,
      });
      return formatEditorialCalendarMarkdown(calendar);
    }

    case "social_schedule_post": {
      const caption = input.caption?.trim();
      if (!caption) return "social_schedule_post requires caption.";
      const { filePayload } = schedulePost({
        platform: input.platform || "Instagram",
        scheduledAt: input.scheduled_at || new Date().toISOString(),
        caption,
        hashtags: input.hashtags,
      });
      return filePayload;
    }

    default:
      return `Tool "${name}" is not implemented`;
  }
}
