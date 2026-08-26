import Anthropic from "@anthropic-ai/sdk";
import { logAudit } from "@/lib/audit";
import {
  getTenantCredentials,
  updateTenantGoogleTokens,
  updateTenantShopifyCredentials,
} from "@/lib/tenants";

export const TOOL_DEFINITIONS: Record<string, Anthropic.Tool> = {
  web_search: {
    name: "web_search",
    description: "Search the internet for up-to-date information on any topic",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "The search query" },
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
      "Connect a Shopify store by saving the shop domain and admin access token. Use this when the user does NOT yet have a store connected or wants to change their store.",
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

  calendar_book_event: {
    name: "calendar_book_event",
    description: "Book an event in the configured calendar.",
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
};

export type ToolContext = {
  userId: string;
  tenantId?: string;
  files?: Record<string, string>;
};

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
 * Resolve Shopify credentials: first try tenant (per-user), then env vars.
 * Returns null when no credentials are available.
 */
function getShopifyCredentials(tenantId?: string): {
  shopDomain: string;
  accessToken: string;
} | null {
  let shopDomain = process.env.SHOPIFY_SHOP_DOMAIN;
  let accessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  if (tenantId) {
    const creds = getTenantCredentials(tenantId);
    if (creds?.shopify) {
      shopDomain = creds.shopify.shopDomain || shopDomain;
      accessToken = creds.shopify.accessToken || accessToken;
    }
  }
  if (!shopDomain || !accessToken) return null;
  return { shopDomain, accessToken };
}

/** Execute a Shopify GraphQL Admin API query/mutation. */
async function shopifyGraphQL(
  shopDomain: string,
  accessToken: string,
  query: string,
  variables: Record<string, unknown> = {},
): Promise<{ ok: boolean; data?: unknown; errors?: unknown; statusText?: string; raw?: string }> {
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
      const text = await res.text();
      return { ok: false, statusText: `${res.status} ${res.statusText}`, raw: text };
    }
    const json = await res.json();
    return { ok: true, data: json.data, errors: json.errors };
  } catch (e) {
    return { ok: false, statusText: e instanceof Error ? e.message : String(e) };
  }
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
  switch (name) {
    case "web_search": {
      logAudit("tool_exec_start", { tool: "web_search" });
      try {
        const res = await fetch(
          `https://html.duckduckgo.com/html/?q=${encodeURIComponent(input.query)}`,
          { headers: { "User-Agent": "AgentCloud/1.0" } },
        );
        const html = await res.text();
        const snippets = html.match(
          /<a[^>]*class="result__a"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi,
        );
        if (!snippets || snippets.length === 0) return "No results found";

        const results = snippets.slice(0, 5).map((s: string) => {
          const titleMatch = s.match(/class="result__a"[^>]*>([\s\S]*?)<\/a>/);
          const snippetMatch = s.match(
            /class="result__snippet"[^>]*>([\s\S]*?)<\/a>/,
          );
          const linkMatch = s.match(/href="([^"]+)"/);
          return [
            `Title: ${titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : "N/A"}`,
            `URL: ${linkMatch ? linkMatch[1] : "N/A"}`,
            `Snippet: ${snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, "").trim() : "N/A"}`,
          ].join("\n");
        });
        return results.join("\n\n");
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
      const tenantId = context.tenantId;
      let shopDomain = process.env.SHOPIFY_SHOP_DOMAIN;
      let accessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
      if (tenantId) {
        const creds = getTenantCredentials(tenantId);
        if (creds?.shopify) {
          shopDomain = creds.shopify.shopDomain;
          accessToken = creds.shopify.accessToken;
        }
      }
      if (!shopDomain || !accessToken) {
        return "Shopify tool not configured. Set SHOPIFY_SHOP_DOMAIN and SHOPIFY_ADMIN_ACCESS_TOKEN in your environment.";
      }

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
        const res = await fetch(
          `https://${shopDomain}/admin/api/2024-10/graphql.json`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Shopify-Access-Token": accessToken,
            },
            body: JSON.stringify({
              query: graphql,
              variables: { query, first: limit },
            }),
          },
        );

        if (!res.ok) {
          const text = await res.text();
          return `Shopify product search failed: ${res.status} ${res.statusText} - ${text}`;
        }

        const data = await res.json();
        if (data.errors) {
          return `Shopify product search error: ${JSON.stringify(data.errors)}`;
        }

        const productEdges = data.data?.products?.edges || [];
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
      const tenantId = context.tenantId;
      let shopDomain = process.env.SHOPIFY_SHOP_DOMAIN;
      let accessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
      if (tenantId) {
        const creds = getTenantCredentials(tenantId);
        if (creds?.shopify) {
          shopDomain = creds.shopify.shopDomain || shopDomain;
          accessToken = creds.shopify.accessToken || accessToken;
        }
      }
      if (!shopDomain || !accessToken) {
        return "Shopify tool not configured. Set SHOPIFY_SHOP_DOMAIN and SHOPIFY_ADMIN_ACCESS_TOKEN in your environment or register tenant credentials.";
      }

      const orderNumber = input.order_number || "";
      const email = input.email || "";
      if (!orderNumber || !email) {
        return "Order status requires both order_number and email.";
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
        const res = await fetch(
          `https://${shopDomain}/admin/api/2024-10/graphql.json`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Shopify-Access-Token": accessToken,
            },
            body: JSON.stringify({
              query: graphql,
              variables: { query: searchQuery },
            }),
          },
        );

        if (!res.ok) {
          const text = await res.text();
          return `Shopify order status failed: ${res.status} ${res.statusText} - ${text}`;
        }

        const data = await res.json();
        if (data.errors) {
          return `Shopify order status error: ${JSON.stringify(data.errors)}`;
        }

        const edge = data.data?.orders?.edges?.[0];
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
      const tenantId = context.tenantId;
      let shopDomain = process.env.SHOPIFY_SHOP_DOMAIN;
      if (tenantId) {
        const creds = getTenantCredentials(tenantId);
        if (creds?.shopify) shopDomain = creds.shopify.shopDomain || shopDomain;
      }
      if (!shopDomain) {
        return "Shopify tool not configured. Set SHOPIFY_SHOP_DOMAIN in your environment or register tenant credentials.";
      }
      const variantId = input.variant_id || "";
      const quantity = Number(input.quantity) || 1;
      const match = variantId.match(/ProductVariant\/(\d+)/);
      if (!match) {
        return `Invalid variant_id: ${variantId}`;
      }
      return `https://${shopDomain}/cart/${match[1]}:${quantity}`;
    }

    case "shopify_setup_store": {
      const shopDomain = sanitizeText(input.shop_domain || "", 200).replace(
        /^https?:\/\//,
        "",
      );
      const accessToken = sanitizeText(input.access_token || "", 200);

      if (!shopDomain) {
        return "shop_domain is required (e.g. my-store.myshopify.com).";
      }
      if (!accessToken) {
        return "access_token is required.";
      }
      if (!shopDomain.includes(".myshopify.com")) {
        return "The shop_domain must be a valid Shopify domain (e.g. my-store.myshopify.com).";
      }
      if (!accessToken.startsWith("shpat_")) {
        return "The access_token should start with 'shpat_' — please use a valid Shopify Admin API access token.";
      }

      // Save credentials for this tenant (user)
      if (context.tenantId) {
        updateTenantShopifyCredentials(context.tenantId, shopDomain, accessToken);
      }

      // Verify the token works by making a test query
      const test = await shopifyGraphQL(
        shopDomain,
        accessToken,
        `query { shop { name primaryDomain { host } } }`,
      );

      if (!test.ok) {
        return `Connection failed: ${test.statusText}. Please check your domain and access token.`;
      }
      if (test.errors) {
        return `Connection error: ${JSON.stringify(test.errors)}. The token may lack the required permissions (read_products, read_orders, write_products, write_discounts).`;
      }

      const shop = (test.data as { shop?: { name?: string; primaryDomain?: { host?: string } } })?.shop;
      return `Store connected successfully!
Store name: ${shop?.name ?? "N/A"}
Domain: ${shop?.primaryDomain?.host ?? shopDomain}

I now have full access to your Shopify store. I can help you with:
• Searching and managing products
• Creating new products and discount codes
• Managing collections and inventory
• Viewing customer data and sales analytics
• Generating cart links for customers
• Checking order status

What would you like to do first?`;
    }

    case "shopify_list_customers": {
      const creds = getShopifyCredentials(context.tenantId);
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
      const creds = getShopifyCredentials(context.tenantId);
      if (!creds) {
        return "Shopify not configured. Use shopify_setup_store to connect your store first, or set SHOPIFY_SHOP_DOMAIN and SHOPIFY_ADMIN_ACCESS_TOKEN in your environment.";
      }

      const period = input.period || "30d";
      const days = period === "today" ? 1 : period === "7d" ? 7 : period === "90d" ? 90 : 30;
      const since = new Date(Date.now() - days * 86400000).toISOString();

      const graphql = `
        query getAnalytics($since: String!) {
          orders(first: 250, query: "created_at:>=$since") {
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
            primaryDomain { host }
          }
        }
      `;

      const result = await shopifyGraphQL(creds.shopDomain, creds.accessToken, graphql, { since });
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
      const creds = getShopifyCredentials(context.tenantId);
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

      const productInput: Record<string, unknown> = {
        title,
        descriptionHtml,
        variants: [{
          price,
          ...(compareAt && parseFloat(compareAt) > 0 ? { compareAtPrice: compareAt } : {}),
        }],
        ...(tags ? { tags: tags.split(",").map((t: string) => t.trim()).filter(Boolean) } : {}),
      };

      const result = await shopifyGraphQL(creds.shopDomain, creds.accessToken, graphql, { input: productInput });
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
      const creds = getShopifyCredentials(context.tenantId);
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
      const creds = getShopifyCredentials(context.tenantId);
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
      const creds = getShopifyCredentials(context.tenantId);
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
      const creds = getShopifyCredentials(context.tenantId);
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
      };

      if (!leadDetails.email) {
        return "lead_capture_submit requires an email address.";
      }

      if (!isValidEmail(leadDetails.email)) {
        return `Invalid email address: ${leadDetails.email}`;
      }

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
          const message = `*New lead captured*\n• Name: ${leadDetails.name}\n• Email: ${leadDetails.email}\n• Company: ${leadDetails.company}\n• Phone: ${leadDetails.phone}\n• Source: ${leadDetails.source}\n• Message: ${leadDetails.message}`;
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

      return "Lead capture tool not configured. Set LEAD_CAPTURE_ENDPOINT or SLACK_WEBHOOK_URL in your environment.";
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

    default:
      return `Tool "${name}" is not implemented`;
  }
}
