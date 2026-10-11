import type { PluginLocalization } from "./skillCatalog";

/** English overlay of the skills catalog (canonical language: Italian). */
export const SKILL_LOCALIZATIONS_EN: Record<string, PluginLocalization> = {
  "ecommerce-operations": {
    name: "E-commerce Operations",
    tagline: "Manage catalog, orders and inventory",
    description:
      "Complete suite for e-commerce operations: product search with cart links, order status and tracking, discount management, low-stock alerts with reorder forecasts, and sales summaries.",
    category: "E-commerce",
    agents: {
      "shopify-agent": "Shopify Agent natively handles catalog and orders",
      "inventory-logistics": "Inventory & Logistics handles warehouse and stock",
      "finance-manager": "Finance Manager analyzes sales metrics",
      "reviews-agent": "Reviews & Reputation uses order data for reviews",
    },
    integrations: {
      woocommerce: "WooCommerce provides catalog and orders",
      shopify: "Shopify natively handles catalog and orders",
      googlesheets: "Sheets acts as a lightweight warehouse",
      airtable: "Airtable manages inventory",
      slack: "Slack notifies critical stock levels",
      gmail: "Gmail sends order updates",
      paypal: "PayPal processes payments",
    },
    changelog: [
      {
        version: "1.0.0",
        date: "2026-01-15",
        changes: [
          "First version of the plugin: 5 operational skills (catalog, order tracking, discounts, stock, sales summary).",
          "WooCommerce and Google Sheets already available; Shopify and PayPal listed as coming soon, never required.",
        ],
      },
    ],
    skills: {
      "catalog-search": {
        name: "Catalog Search",
        description:
          "Searches products in the catalog and generates cart links. Use when the customer asks about products, availability, or prices.",
        whenNot: [
          "The customer asks about an already placed order (use Order Tracking)",
          "The connected catalog is unavailable: never invent prices, offer the store link",
        ],
        procedure: [
          "Ask or infer from context: product name, variant, quantity, budget",
          "Search the connected catalog using the customer's exact terms",
          "If there are variants, offer at most 3 with a clear price difference",
          "Fill in the output: name, SKU, price, availability, cart link",
          "Always add the disclaimer: prices and availability subject to checkout verification",
        ],
        rules: [
          "Never invent prices, SKUs, or availability: if a detail is missing, say so",
          "Never apply discounts: discount management is a separate skill with approval",
          "Tone: professional and direct, short sentences",
        ],
        output:
          "Product table (name, SKU, price, availability) + cart link + checkout verification note",
        example: "I need something for Marta's birthday, budget 60 euros",
      },
      "order-tracking": {
        name: "Order Tracking",
        description:
          "Checks order status and provides tracking. Use for requests like 'where is my order' or shipping updates.",
        whenNot: [
          "No connected orders: ask for the order number or purchase email",
          "The customer asks for a return or refund (not tracking: route to Support Agent)",
        ],
        procedure: [
          "Identify the order: order number, email, or first + last name",
          "If the identifier is missing, ask and do not proceed",
          "Read status, expected date, tracking code, and carrier",
          "Report the expected delivery date and the latest tracking event",
          "If delivery is late, offer the refund/replacement path as an option",
        ],
        rules: [
          "Never invent tracking codes or delivery dates",
          "Never promise refunds: propose first, then human approval",
          "Minimal personal data in the summary (name, city, never the full address)",
        ],
        output:
          "One-line order status + tracking table (event, date) + expected delivery date",
        example: "Where did my order #1042 end up?",
      },
      "discount-management": {
        name: "Discount Management",
        description:
          "Handles discount codes and promotions. Use for discount or promotion requests; requires approval for discounts above 20%.",
        whenNot: [
          "Discount requested above 20%: route through human approval",
          "Promotion affecting list prices: do not apply, flag to the manager",
        ],
        procedure: [
          "Verify the requested discount and its percentage amount",
          "Check that no promotions are already active on the same product range",
          "If 20% or less: apply it and communicate code and validity",
          "If above 20%: prepare the draft, explain the impact, and ask for approval",
          "Always record the applied discount with date and commercial reason",
        ],
        rules: [
          "Approval threshold: 20%. Above it, never without explicit confirmation",
          "Never invent existing promotional codes",
          "Never combine codes if the store excludes it (check the rules)",
        ],
        output:
          "Discount code + percentage + validity + application confirmation, or approval request",
        example: "A long-standing customer asks for 25%: do we grant it?",
      },
      "stock-alert": {
        name: "Stock Alert",
        description:
          "Monitors stock levels and generates reorder forecasts. Use to alert when a product falls below the minimum threshold.",
        whenNot: [
          "No warehouse system connected: use Sheets/Airtable if available",
          "Concrete reorder request to a supplier: route to Inventory & Logistics",
        ],
        procedure: [
          "Read stock levels of products sold in the recent period",
          "Compare against the agreed minimum threshold",
          "Compute the reorder forecast: average daily sales x coverage days",
          "Flag below-threshold products with an estimated stock-out date",
          "Notify the team (Slack) only for critical stock",
        ],
        rules: [
          "Never change warehouse levels: this skill only reads and alerts",
          "Explicit estimate: always state the method (30-day average)",
          "Minimum threshold: if undefined, ask before notifying",
        ],
        output:
          "Below-threshold product list: name, stock, threshold, estimated stock-out, suggested reorder qty",
        example: "What is about to run out? Give me the reorder list",
      },
      "sales-summary": {
        name: "Sales Summary",
        description:
          "Generates a daily, weekly, or monthly sales report with key metrics and change versus the previous period.",
        whenNot: [
          "Strategic analysis or decision request: use Reports & Decisions",
        ],
        procedure: [
          "Determine the period (today, 7 days, 30 days) and align the comparison period",
          "Compute: orders, revenue, average ticket, conversion rate if available",
          "Compute the percentage change versus the previous period",
          "Highlight the 3 products and 3 categories with the most relevant change",
          "Close with 1-3 suggested actions, not a list of numbers",
        ],
        rules: [
          "Always cite the exact period and the data source",
          "No uncomputed figures: if a datum is missing, write 'not available'",
          "Never forecast revenue without sufficient history",
        ],
        output:
          "KPI table (current vs previous period, change) + 3 highlights + 3 actions",
        example: "How much did we sell this week versus last week?",
      },
    },
  },
  "lead-sales": {
    name: "Leads & Sales",
    tagline: "Capture, qualify, and convert leads",
    description:
      "Lead management system: contact capture and validation, profile enrichment, High/Medium/Low scoring, team notification, follow-up sequence, and pipeline updates.",
    category: "Sales",
    agents: {
      "lead-capture": "Lead Capture is dedicated to lead capture and management",
      "crm-agent": "CRM Agent handles pipeline and qualified leads",
      "whatsapp-agent": "WhatsApp Agent follows up leads via chat",
      "calendar-booking": "Calendar Booking closes the lead with an appointment",
    },
    integrations: {
      hubspot: "HubSpot is the contact source of truth",
      slack: "Slack alerts hot leads in real time",
      gmail: "Gmail sends the email follow-up",
      googlesheets: "Sheets tracks the lead pipeline",
      googlecalendar: "Calendar books follow-up calls",
      whatsapp: "WhatsApp follows up the lead via chat",
      calendly: "Calendly books the meeting",
      mailchimp: "Mailchimp manages email campaigns",
    },
    changelog: [
      {
        version: "1.0.0",
        date: "2026-01-15",
        changes: [
          "First version: capture, enrichment, scoring, team notification, and follow-up sequence.",
          "HubSpot, Slack, Gmail, Sheets, and Calendar already available; WhatsApp, Calendly, and Mailchimp coming soon.",
        ],
      },
    ],
    skills: {
      "lead-capture": {
        name: "Lead Capture",
        description:
          "Captures and validates new leads from various sources. Use when a contact request, quote request, or form arrives.",
        whenNot: [
          "The contact is already in the CRM: update (Profile Enrichment), do not duplicate",
          "Request that is actually post-sales support: route to Support Agent",
        ],
        procedure: [
          "Extract available data: name, email, phone, company, source",
          "Validate the data: formally valid email, plausible phone, consistent postal data",
          "Ask only for missing fields, in a single short message",
          "Record the lead in the CRM with source and date",
          "Return acquisition confirmation and next step",
        ],
        rules: [
          "Consent: always record the data origin and the consent basis",
          "Never buy or enrich lists: only data provided by the contact",
          "GDPR: retention and legal bases for B2B leads must be verified before export",
        ],
        output:
          "Lead card (name, company, email, phone, source, missing fields) + CRM confirmation",
        example: "I am Marco Bianchi from Bianchi Srl, I would like a quote for 300 chairs",
      },
      "lead-enrichment": {
        name: "Profile Enrichment",
        description:
          "Enriches the lead profile with company data and records interaction history. Use after capture to complete the card.",
        whenNot: [
          "Company data unavailable in connected sources: ask, do not guess",
          "Bulk scraping request: outside the least-privilege principle",
        ],
        procedure: [
          "Read the current lead card and spot empty fields",
          "Complete only with data present in connected sources (CRM, Sheets, Notes)",
          "Add a timestamped note for each interaction",
          "Flag fields still unknown, never fill them with assumptions",
          "Update the CRM card",
        ],
        rules: [
          "No invented data: sources or 'not available'",
          "No personal data beyond what is needed (name, role, company)",
          "Every addition must carry date and source",
        ],
        output: "Updated lead card + list of still-missing fields + sources used",
        example: "Complete Marco Bianchi's card with what you know",
      },
      "lead-scoring": {
        name: "Lead Scoring",
        description:
          "Scores the lead High/Medium/Low based on engagement, budget, and timing. Use to decide follow-up priority.",
        whenNot: [
          "No historical interaction data: assign 'Low (insufficient data)'",
          "Final commercial decision: scoring supports, never replaces the verdict",
        ],
        procedure: [
          "Collect signals: visits, opened emails, requests, role, company size",
          "Assess three dimensions: engagement (activity), budget (size/preferences), timeline (urgency)",
          "Compute the 0-100 score and band: High 70+, Medium 40-69, Low <40",
          "List the 3 signals that weighed most, with reasons",
          "Propose the band-consistent next action",
        ],
        rules: [
          "The score is a stated estimate: always show its component signals",
          "No protected data (health, religion, orientation) enters scoring",
          "Recompute at each interaction: scoring is not a fixed label",
        ],
        output: "Band + score + 3 main signals + recommended next action",
        example: "How do we rate Bianchi Srl? They asked for three quotes",
      },
      "team-notification": {
        name: "Team Notification",
        description:
          "Notifies the sales team about a hot lead with a summary and suggested actions. Use when a lead passes the High threshold.",
        whenNot: [
          "Lead is not High: do not disturb the team, it reads in the CRM",
          "Slack channel not connected: propose email or defer",
        ],
        procedure: [
          "Verify the lead is High and the channel is connected",
          "Compose the message in at most 6 lines: who, what they ask, value, action, deadline",
          "Include a direct link to the CRM card",
          "Send the notification and confirm delivery",
          "Log the notification on the lead card",
        ],
        rules: [
          "No sensitive personal data in the notification message",
          "Never notify the same lead twice without a new event",
          "The message must be self-sufficient: Slack-only readers must understand",
        ],
        output: "Notification message sent (6-line preview) + outcome",
        example: "Alert the team: Bianchi Srl is a hot lead, 12k quote",
      },
      "followup-sequence": {
        name: "Follow-up Sequence",
        description:
          "Creates and manages personalized follow-up sequences based on lead score. Use to close stalled deals.",
        whenNot: [
          "The lead replied or said 'not interested': stop the sequence",
          "Sequence beyond 5 emails: requires explicit approval",
        ],
        procedure: [
          "Check deal status and last contact",
          "Define steps: channel, topic, date, goal for each step",
          "Write each email short (max 120 words), company tone, single CTA",
          "Schedule the sequence and log the plan on the card",
          "Any lead reply automatically stops later steps",
        ],
        rules: [
          "Maximum 5 emails per sequence, at least 2 days apart",
          "Opt-out always present ('reply CANCEL to stop receiving')",
          "No unconfirmed commercial promises",
        ],
        output:
          "Sequence table (step, date, channel, email subject, goal) + draft texts",
        example: "Prepare the follow-up for Bianchi: no reply in 9 days",
      },
    },
  },
  "support-reputation": {
    name: "Support & Reputation",
    tagline: "Customer support and review management",
    description:
      "Customer service suite: knowledge-base answers with escalation, ticket urgency classification, review reply drafts with sentiment analysis, complaint handling, and brand tone of voice.",
    category: "Support",
    agents: {
      "support-agent": "Support Agent handles tickets and knowledge base",
      "reviews-agent": "Reviews & Reputation handles reviews and reputation",
      "whatsapp-agent": "WhatsApp Agent supports customers via chat",
      "email-manager": "Email Manager handles tickets via email",
    },
    integrations: {
      slack: "Slack handles human escalation",
      notion: "Notion is the knowledge base (RAG)",
      googledrive: "Drive hosts knowledge-base documents",
      gmail: "Gmail handles tickets via email",
      googlesheets: "Sheets tracks tickets and SLAs",
      zendesk: "Zendesk handles advanced tickets",
      whatsapp: "WhatsApp supports customers in chat",
      googlechat: "Google Chat handles internal support",
    },
    changelog: [
      {
        version: "1.0.0",
        date: "2026-01-15",
        changes: [
          "First version: knowledge-base answers, ticket urgency, review drafts, and complaint handling.",
          "Complaint handling is high risk: every proposed resolution must be approved before sending.",
        ],
      },
    ],
    skills: {
      "kb-response": {
        name: "Knowledge Base Answer",
        description:
          "Answers customer questions from the company knowledge base. Use when the question has a documented answer; escalate if uncertain.",
        whenNot: [
          "The knowledge base has no answer: escalate, never improvise",
          "Legal, medical, or safety request: immediate escalation to a human",
        ],
        procedure: [
          "Search the knowledge base (Notion/Drive) for relevant documents",
          "Verify the document truly covers the customer case",
          "Reply in plain language, with numbered steps",
          "Cite the source document used",
          "If coverage is partial, say so and propose escalation",
        ],
        rules: [
          "Never invent a procedure: if undocumented, it does not exist",
          "Tone: empathetic and concrete, 150 words max",
          "Never share sensitive internal documents with the customer: only the answer",
        ],
        output:
          "Customer reply (150 words max) + source document + search outcome (complete/partial)",
        example: "How do I replace an air conditioner filter?",
      },
      "ticket-urgency": {
        name: "Urgency Classification",
        description:
          "Classifies tickets by urgency (critical, high, medium, low) based on SLA and customer impact. Use for every new ticket.",
        whenNot: [
          "Ticket about deleted personal data or security breaches: always critical",
          "Unclear whether the customer is paying: ask before classifying",
        ],
        procedure: [
          "Read the ticket and identify impact, customer, and applicable SLA",
          "Classify: critical (service down/security/broken SLA), high (operational block), medium (request with workaround), low (information)",
          "Assign the expected first response per SLA",
          "State the reason in one line",
          "For critical and high, notify the team immediately",
        ],
        rules: [
          "SLAs are the company ones: if undefined, state it and use the default",
          "Never close a critical ticket without verified resolution",
          "Classification is not final: it can be revised with the customer",
        ],
        output: "Ticket + urgency band + SLA first response + reason + notification (if high)",
        example: "I have 12 tickets open since yesterday, tell me which to handle first",
      },
      "review-draft": {
        name: "Review Reply Draft",
        description:
          "Drafts a review reply analyzing sentiment. Use to answer positive or negative reviews.",
        whenNot: [
          "Review alleging personal data issues or fraud: escalate before replying",
          "Request for a fake review or unjustified removal: never",
        ],
        procedure: [
          "Analyze sentiment: positive, neutral, negative (and severity if negative)",
          "For positive: thank by name and invite to buy again",
          "For negative: acknowledge the issue, apologize without blame, offer direct contact, never argue publicly",
          "Keep the brand tone of voice and cite no customer personal data",
          "Prepare the draft: publishing remains an action requiring approval",
        ],
        rules: [
          "Never reply defensively or sarcastically",
          "100 words max, no monetary promises",
          "No personal data beyond the already published name",
        ],
        output: "Reply draft + detected sentiment + possible escalation flag",
        example: "This review is negative about delivery, shall we reply?",
      },
      "complaint-handling": {
        name: "Complaint Handling",
        description:
          "Handles complaints with a standard procedure, verifies resolution feasibility, and keeps the log. Use for formal complaints.",
        whenNot: [
          "Complaint requiring refund or penalty: proposal plus mandatory human approval",
          "Complaint with personal data: verify GDPR before sharing any document",
        ],
        procedure: [
          "Collect the facts: what happened, when, which order, what impact",
          "Verify resolution feasibility with real data (orders, shipments, policy)",
          "Propose the resolution: one, concrete, with timing",
          "Log the complaint with outcome and closing date",
          "If sending the reply includes commitments or refunds, ask for approval",
        ],
        rules: [
          "High-risk action: the complaint reply must be approved before sending",
          "Acknowledging a mistake is a good-faith duty: never deny evidence",
          "Never offer compensation outside company policy",
        ],
        output:
          "Complaint log (facts, proposed resolution, timing, outcome) + draft reply pending approval",
        example: "Customer complaint order #331: arrived broken and no reply for 5 days",
      },
    },
  },
  "bookings-calendar": {
    name: "Bookings & Calendar",
    tagline: "Manage appointments and calendar",
    description:
      "Calendar management system: availability checks and slot proposals, booking with video link, reminders and no-show handling, rescheduling and cancellations, day planning and deep-work blocks.",
    category: "Productivity",
    agents: {
      "calendar-booking": "Calendar Booking handles appointments and availability",
      "personal-assistant": "Personal Assistant plans calendar and tasks",
      "hr-recruiter": "HR & Recruiter schedules interviews",
      "whatsapp-agent": "WhatsApp Agent confirms appointments via chat",
    },
    integrations: {
      googlecalendar: "Calendar is essential for bookings",
      gmail: "Gmail sends confirmations and reminders",
      notion: "Notion keeps meeting and task notes",
      googlemeet: "Google Meet generates the video link",
      microsoftoutlook: "Outlook extends calendar coverage",
      calendly: "Calendly simplifies booking",
      googletasks: "Google Tasks syncs tasks",
    },
    changelog: [
      {
        version: "1.0.0",
        date: "2026-01-15",
        changes: [
          "First version: availability, booking, no-show reminders, rescheduling, and day planning.",
          "Google Calendar and Gmail already available; Google Meet, Outlook, Calendly, and Tasks coming soon.",
        ],
      },
    ],
    skills: {
      "availability-check": {
        name: "Availability Check",
        description:
          "Checks calendar availability and proposes optimal slots respecting preferences. Use at the start of every appointment request.",
        whenNot: [
          "Urgent request for today: still propose, flagging constraints",
          "Calendar not connected: propose times and ask for manual confirmation",
        ],
        procedure: [
          "Read commitments in the requested period",
          "Apply constraints: working hours, minimum duration, breaks, customer time zone",
          "Propose at most 3 slots, with explicit date, time, and duration",
          "State the time zone for each slot",
          "Ask which they prefer; do not book yet",
        ],
        rules: [
          "Always show the time zone: time-zone errors are the #1 no-show cause",
          "At most 3 proposals, never an endless menu",
          "Never propose out-of-hours slots without flagging them",
        ],
        output: "List of at most 3 slots (date, time, duration, time zone) + standard service duration",
        example: "I would like a call on Thursday, 45 minutes",
      },
      "booking-creation": {
        name: "Booking Creation",
        description:
          "Creates the calendar appointment with video link and sends confirmation. Use after the customer picks a slot.",
        whenNot: [
          "Slot not yet confirmed by the customer: do not create the event",
          "Request to change an existing appointment: use Reschedule/Cancel",
        ],
        procedure: [
          "Verify the slot is still free before writing it",
          "Create the event with an understandable title, time, duration, attendees",
          "Add the video link if the integration is connected, otherwise flag it as to-add",
          "Send confirmation with: date, time, time zone, link, what to bring",
          "Record the event for reminders",
        ],
        rules: [
          "Customer-readable event title, no internal codes",
          "Always confirm within 2 minutes of customer confirmation",
          "Never share other attendees' details",
        ],
        output:
          "Appointment created (date, time, duration, video link) + confirmation sent + reminder status",
        example: "Perfect, Thursday at 3pm works for me",
      },
      "reminder-no-show": {
        name: "No-show Reminders",
        description:
          "Handles pre-appointment reminders and no-show follow-up. Use for all confirmed appointments.",
        whenNot: [
          "Appointment not yet confirmed: no reminders",
          "Reminder already sent: do not duplicate",
        ],
        procedure: [
          "Prepare the reminder: date, time, time zone, link, goal in 2 lines",
          "Send 24h ahead; if the request is within 24h, send immediately",
          "If the appointment passes unattended, send a kind follow-up within 2 hours",
          "Propose a new date with 2 alternative slots",
          "Log the event (reminder sent / no-show)",
        ],
        rules: [
          "One reminder per appointment, 24h ahead",
          "Follow-up tone: no blame, 2 lines max",
          "Never infer a definitive absence from a few minutes' delay",
        ],
        output: "Reminder sent (time) or no-show follow-up (time) + 2 alternative slots",
        example: "The 3pm customer never joined, what do we write them?",
      },
      "reschedule-cancel": {
        name: "Reschedule/Cancel",
        description:
          "Handles change or cancellation requests applying company policies. Use when a customer asks to move or cancel.",
        whenNot: [
          "Cancellation with penalty beyond policy: proposal plus human approval",
          "Third-party request for someone else's appointment: verify authorization",
        ],
        procedure: [
          "Read the appointment and company policy (e.g. 24h notice)",
          "Check whether the request meets terms: no penalty or penalty to apply",
          "For a change, propose 2 slots using the same Availability Check logic",
          "Update or cancel the event",
          "Send confirmation with the new date or the cancellation and any penalties",
        ],
        rules: [
          "Penalties are quoted from written policy: never improvised",
          "Above-threshold cancellation: always human confirmation",
          "Notify internal parties only if the policy requires it",
        ],
        output:
          "Outcome (moved/cancelled) + new date if rescheduled + penalty applied (if any) + confirmation sent",
        example: "I need to move Tuesday's appointment to Thursday",
      },
      "day-planning": {
        name: "Day Planning",
        description:
          "Organizes the day with deep-work blocks and priority handling. Use in the morning or on daily-plan request.",
        whenNot: [
          "Day already full of fixed commitments: still propose, moving only flexible ones",
          "Week/sprint priority request: use Projects & Tasks",
        ],
        procedure: [
          "Read the day's fixed commitments",
          "Identify 2-3 high-priority, strategically important tasks",
          "Propose 1-2 deep-work blocks of 90 minutes in free windows",
          "Insert 15-minute buffers between blocks",
          "Close with the list of things NOT done today, to avoid guilt",
        ],
        rules: [
          "At most 3 'tasks of the day': a long list only creates anxiety",
          "Deep work 60 minutes or more: below that it is not deep work",
          "Never move meetings with others without saying so",
        ],
        output:
          "Day plan: tasks of the day (3) + deep-work blocks with time + what stays on the list",
        example: "Organize my Thursday",
      },
    },
  },
  "quotes-finance": {
    name: "Quotes & Finance",
    tagline: "Generate quotes and manage accounting",
    description:
      "Finance suite: requirements gathering and quote calculation with VAT, formal document generation, income and expense reconciliation, tax deadline calendar with reminders, and invoice data extraction.",
    category: "Finance",
    agents: {
      "quote-agent": "Quotes & Estimates generates professional quotes",
      "finance-manager": "Finance Manager handles accounting and invoices",
      "invoice-agent": "Invoice Agent handles invoicing",
      "business-manager": "Business Manager analyzes financial metrics",
    },
    integrations: {
      gmail: "Gmail sends quotes and reminders",
      googlesheets: "Sheets keeps the tax deadline calendar",
      microsoftexcel: "Excel creates financial documents",
      microsoftword: "Word generates formal documents",
      googledrive: "Drive hosts tax documents",
      paypal: "PayPal processes payments",
    },
    changelog: [
      {
        version: "1.0.0",
        date: "2026-01-15",
        changes: [
          "First version: quote calculation with 22% VAT, formal document, reconciliation, and tax deadline calendar.",
          "Reconciliation and reminders are high risk: postings and sends require approval.",
        ],
      },
    ],
    skills: {
      "quote-calculation": {
        name: "Quote Calculation",
        description:
          "Gathers requirements and computes the quote with taxable amount, 22% VAT, and discounts. Use when the customer asks for a quote.",
        whenNot: [
          "Quotes with a different VAT rate: ask and use the stated rate",
          "Price list unavailable: ask for prices, never invent them",
        ],
        procedure: [
          "Gather requirements: what is needed, quantities, timing, special needs",
          "Apply list prices per line, one row per item",
          "Compute taxable = sum of lines minus discounts; VAT = taxable x 22%; total = taxable + VAT",
          "Show each line with quantity, unit price, amount, and VAT",
          "State quote validity (default 30 days) and payment terms",
        ],
        rules: [
          "VAT: use the correct rate (default 22%) and show it clearly",
          "Round to 2 decimals, never at random",
          "No unquoted costs: extra items must be stated upfront",
        ],
        output:
          "Line-item table + taxable, 22% VAT, total; payment terms and validity",
        example: "Quote for 300 chairs, 12 tables, and assembly, delivery in Milan",
      },
      "document-generation": {
        name: "Document Generation",
        description:
          "Generates the formal document (Word/PDF) from the company template. Use after quote calculation.",
        whenNot: [
          "Document with unverified tax data: block and ask for confirmation",
          "Sending the document to the customer: high-risk action, needs approval",
        ],
        procedure: [
          "Take the latest computed quote and customer data",
          "Fill the company template: header, customer, items, totals, terms",
          "Verify mandatory fields: company name, VAT ID/tax code, date, signatures",
          "Generate the document and report the file name",
          "Sending remains an action requiring human approval",
        ],
        rules: [
          "VAT ID and tax code mandatory: no document is generated without complete tax data",
          "Never insert bank details unless present in the template",
          "File name: `preventivo-<cliente>-<data>.docx`",
        ],
        output:
          "Document generated (file name) + list of verified fields + send status (pending approval)",
        example: "Generate the quote document for Bianchi Srl",
      },
      "reconciliation": {
        name: "Reconciliation",
        description:
          "Reconciles income and expenses by matching invoices against bank movements. Use at month end or on balancing request.",
        whenNot: [
          "Bank movements inaccessible: reconciliation must be done manually",
          "Tax data in writing: this skill only flags, never posts",
        ],
        procedure: [
          "Load the period bank statement and the invoice list",
          "Match by amount, date, and reference; mark certain matches",
          "List unmatched items in two groups: missing and duplicates",
          "For each unmatched item state the most likely hypothesis and what is needed to confirm it",
          "Propose postings, without applying them",
        ],
        rules: [
          "High-risk action: no accounting posting without approval",
          "Never modify source data (invoices or bank statement)",
          "Every proposal must cite at least two supporting data points",
        ],
        output:
          "Summary: matched (count and total), missing, duplicates, posting proposals to approve",
        example: "Let us reconcile September",
      },
      "fiscal-deadlines": {
        name: "Tax Deadline Calendar",
        description:
          "Manages tax deadlines and prepares reminders. Use for periodic deadline monitoring.",
        whenNot: [
          "Automatic customer reminders: always require approval",
          "Tax filings or obligations: this skill tracks, never computes",
        ],
        procedure: [
          "List period deadlines with amount, customer, and date",
          "Split: overdue, due within 7 days, later",
          "For overdue ones, draft the reminder (100 words max, cordial but firm tone)",
          "Flag internal tax deadlines with days of advance notice",
          "Every reminder stays pending approval before sending",
        ],
        rules: [
          "Sending reminders = high-risk action: never without approval",
          "No tax figures computed by this skill: track and flag only",
          "Quote the deadline with exact date and amount",
        ],
        output:
          "Deadline calendar: overdue / next 7 days / later + reminder drafts pending approval",
        example: "Which invoices are overdue and whom do I write to?",
      },
    },
  },
  "content-seo": {
    name: "Content & SEO",
    tagline: "Create SEO-optimized content",
    description:
      "Content marketing toolkit: keyword research with search intent, competitor content analysis, structured SEO articles, landing and ads copy with A/B variants, email sequences and newsletters.",
    category: "Marketing",
    agents: {
      "seo-agent": "SEO Content Agent optimizes content for search",
      "copywriter": "Copywriter creates persuasive copy",
      "social-media-agent": "Social Media reuses content for posts",
      "research-agent": "Research Agent provides content data",
    },
    integrations: {
      notion: "Notion for content drafts and review",
      googlesheets: "Sheets for the editorial plan and keywords",
      microsoftword: "Word for final revisions",
      googledrive: "Drive hosts content",
      googleanalytics: "Analytics measures content performance",
      googledocs: "Docs for content collaboration",
      mailchimp: "Mailchimp manages campaigns",
      googleads: "Google Ads measures ads performance",
    },
    changelog: [
      {
        version: "1.0.0",
        date: "2026-01-15",
        changes: [
          "First version: keyword research, competitor analysis, SEO article, and ads copy with A/B variants.",
          "Notion, Sheets, Word, and Drive already available; Analytics, Docs, Mailchimp, and Ads coming soon.",
        ],
      },
    ],
    skills: {
      "keyword-research": {
        name: "Keyword Research",
        description:
          "Researches keywords with volume, difficulty, and search-intent analysis. Use before writing any SEO content.",
        whenNot: [
          "No SEO data source connected: propose reasoning-based keywords and state it",
          "Topic irrelevant to the business: flag it and propose alternatives",
        ],
        procedure: [
          "Collect theme, audience, and content goal",
          "Derive long-tail keywords matching real intent (informational, commercial, transactional)",
          "Group by intent and difficulty",
          "Select 1 primary and 5-8 secondary keywords",
          "State the source of each datum: if estimated, say so",
        ],
        rules: [
          "Never invent search volumes: if unavailable, mark 'to verify'",
          "Priority to low-difficulty long-tail keywords for SMBs",
          "No keyword stuffing: natural density is fine",
        ],
        output: "Keyword table (keyword, intent, difficulty, role) + recommended primary keyword",
        example: "Which keywords do I target for 'how to choose office chairs'?",
      },
      "competitor-analysis": {
        name: "Competitor Analysis",
        description:
          "Analyzes competitor content to find gaps and opportunities. Use before defining the editorial plan.",
        whenNot: [
          "Competitors unidentified: ask for names, never guess them",
          "Verbatim copy request: never, structural analysis only",
        ],
        procedure: [
          "List the provided or already known competitors",
          "For each: covered topics, content formats, length, tone",
          "Spot gaps: unanswered questions, missing formats, uncovered angles",
          "Propose 3 content angles nobody covers",
          "Always report the sources (URLs) used",
        ],
        rules: [
          "No reproduction of others' texts: analysis only",
          "Every competitor claim carries its URL",
          "Never attribute traffic volumes unless available",
        ],
        output:
          "Competitor table (topics, formats, gaps) + 3 proposed angles + sources",
        example: "Analyze my 3 main competitors' content",
      },
      "seo-article": {
        name: "SEO Article",
        description:
          "Generates a structured SEO article with headings, meta description, and on-page optimization. Use when the keyword is already set.",
        whenNot: [
          "Keyword not yet defined: go through Keyword Research",
          "Article requiring unavailable proprietary data: flag it",
        ],
        procedure: [
          "Take the primary keyword and target audience",
          "Structure: single H1, logical H2/H3, answer the question within the first 100 words",
          "Write 800-1500 words, short paragraphs, lists where needed",
          "Add meta title (60 chars max) and meta description (155 max)",
          "Insert 2-3 suggested internal links and FAQs",
        ],
        rules: [
          "Single H1, meta title 60 chars or less, meta description 155 or less",
          "No invented facts or figures: numbers come from sources",
          "Clear English, short sentences, no industry jargon",
        ],
        output:
          "Complete article with heading structure + meta title + meta description + suggested internal links",
        example: "Write the article on 'how to choose office chairs'",
      },
      "copy-ads": {
        name: "Ads Copy",
        description:
          "Creates landing page and ads copy with A/B test variants. Use for campaigns and landing pages.",
        whenNot: [
          "Regulated claims (health, finance): statements must be verified",
          "Copy without a clear offer: first define what is sold and at what price",
        ],
        procedure: [
          "Ask goal, offer, audience, and tone of voice",
          "Write 3 headline variants (8 words max), 3 subheadline variants, 3 CTA variants",
          "State which variant is A, B, C and why",
          "Add the social-proof claim only if real data exists",
          "Close with the full assembled text of each variant",
        ],
        rules: [
          "Variants must change the angle, not just synonyms",
          "No unsustainable promises ('100% guaranteed')",
          "Single, repeatable CTA per variant",
        ],
        output:
          "3 complete variants (headline, subheadline, CTA, angle) with assembled texts",
        example: "Write the copy for our cleaning service landing page",
      },
    },
  },
  "social-media": {
    name: "Social Media",
    tagline: "Manage social presence",
    description:
      "Social media suite: weekly editorial calendar, per-channel captions (Instagram, LinkedIn, TikTok, Facebook), hashtag and trend research, repurposing one piece of content across channels, and performance reports.",
    category: "Marketing",
    agents: {
      "social-media-agent": "Social Media manages the social presence",
      "copywriter": "Copywriter creates captions and copy",
      "reviews-agent": "Reviews & Reputation handles social reviews",
    },
    integrations: {
      googlesheets: "Sheets for the editorial calendar",
      notion: "Notion for content drafts",
      googledrive: "Drive hosts assets and content",
      slack: "Slack notifies the team for approval",
      instagram: "Instagram for direct publishing",
      facebook: "Facebook for direct publishing",
      tiktok: "TikTok for direct publishing",
      figma: "Figma for social creatives",
    },
    changelog: [
      {
        version: "1.0.0",
        date: "2026-01-15",
        changes: [
          "First version: editorial calendar, per-channel captions, hashtags, content repurposing, and performance reports.",
          "Until channels are connectable, skills produce plans and copy exportable to Sheets and Notion.",
        ],
      },
    ],
    skills: {
      "editorial-calendar": {
        name: "Editorial Calendar",
        description:
          "Plans the weekly editorial calendar with themes, formats, and deadlines. Use at the start of the week.",
        whenNot: [
          "Brand tone of voice unclear: ask before planning",
          "Annual plan request: proceed by quarters, with priorities",
        ],
        procedure: [
          "Collect month goals (visibility, leads, sales) and running promotions",
          "Distribute posts: 60% education, 30% social proof, 10% promotion",
          "Assign format and channel to each post",
          "Set an internal 2-day deadline for approval",
          "Export the plan to Sheets with owner and status",
        ],
        rules: [
          "At most 3 posts per week per channel: quality, not quantity",
          "Each post has a single stated goal",
          "No publishing without approval ('pending' status)",
        ],
        output:
          "Weekly plan table (day, channel, format, theme, goal, status, deadline)",
        example: "Prepare this week's editorial plan",
      },
      "caption-generation": {
        name: "Caption Generation",
        description:
          "Generates optimized captions for Instagram, LinkedIn, TikTok, and Facebook. Use to write the text of an already planned post.",
        whenNot: [
          "Content requiring unavailable data (numbers, dates): flag it",
          "Moderation or negative-comment reply request: route to Support",
        ],
        procedure: [
          "Adapt tone to the channel: professional for LinkedIn, casual for Instagram/TikTok",
          "First line = hook (125 chars max, emoji allowed if tone fits)",
          "Develop in 3-6 short lines",
          "Close with a single CTA",
          "Adapt length to the channel (short for TikTok and Instagram, more discursive for LinkedIn)",
        ],
        rules: [
          "No irrelevant tags or hashtags: the caption is not a list",
          "No unverifiable promises",
          "Brand tone, never spammy words nor overly formal",
        ],
        output: "Caption for the requested channel (hook, body, CTA) + suggested length",
        example: "Write the caption for today's LinkedIn post",
      },
      "hashtag-research": {
        name: "Hashtag Research",
        description:
          "Researches hashtags and trends per platform with engagement analysis. Use before publishing.",
        whenNot: [
          "Platform-banned hashtags: never, even if they perform",
          "No trend data available: flag it, never invent",
        ],
        procedure: [
          "Split hashtags by role: industry (5-8), local (3-5), branded (2-3)",
          "For local hashtags use the city or neighborhood name",
          "Select 10-15 hashtags for Instagram, 3-5 for TikTok, 2-3 for LinkedIn",
          "Drop hashtags with negative trend or irrelevant ones",
          "Note the rationale of each group",
        ],
        rules: [
          "15 hashtags max: beyond is spam",
          "No hashtag readable as an insult or prejudice",
          "Branded hashtags must be verified against brand policy",
        ],
        output: "Hashtag list by group (industry, local, branded) with count and rationale",
        example: "Which hashtags do we use for our restaurant in Bologna?",
      },
      "content-repurposing": {
        name: "Content Repurposing",
        description:
          "Adapts existing content to multiple channels keeping tone consistent. Use to maximize already produced content.",
        whenNot: [
          "Original content unavailable: ask for it, do not recreate from scratch",
          "Content to adapt with time-sensitive data: always update dates",
        ],
        procedure: [
          "Read the original content and extract the 3 key messages",
          "Decide the per-channel angle: one message per channel, never copy-paste",
          "Adapt format (video, carousel, text) and length",
          "Readapt hashtags to the channel",
          "Deliver 3 versions ready for approval",
        ],
        rules: [
          "No identical content on two channels",
          "Always update dates, numbers, and references before repurposing",
          "Each version keeps the brand tone",
        ],
        output: "3 channel-adapted versions (format, length, text, hashtags)",
        example: "Take last month's SEO article and pull 3 posts out of it",
      },
      "social-performance-report": {
        name: "Performance Report",
        description:
          "Generates the social channel performance report with trends and actions. Use at month or week end.",
        whenNot: [
          "Channels not published directly: the report relies on manual data",
          "Data unavailable: never extrapolate trends from a single post",
        ],
        procedure: [
          "Collect per-channel data: reach, engagement, visits, followers",
          "Compute engagement rate = interactions / reach",
          "Compare with the previous period and the industry benchmark",
          "Highlight the 2 best and 2 worst pieces with hypotheses",
          "Propose 2 actions for next month",
        ],
        rules: [
          "No aggregated data without source and period",
          "If unavailable, the industry benchmark is reported as \"not available\"",
          "The report never judges employees: it looks at content",
        ],
        output:
          "KPI table per channel + period comparison + 2 highlights + 2 actions",
        example: "How did socials perform this month?",
      },
    },
  },
  "inbox-productivity": {
    name: "Inbox & Productivity",
    tagline: "Email triage and task management",
    description:
      "Productivity system: email triage by priority, reply drafts, deadline and commitment tracking, daily digest, meeting minutes, and the inbox-zero method.",
    category: "Productivity",
    agents: {
      "email-manager": "Email Manager handles inbox and email",
      "email-agent": "Email Agent triages and answers emails",
      "personal-assistant": "Personal Assistant handles productivity",
      "business-manager": "Business Manager uses productivity digests",
    },
    integrations: {
      gmail: "Gmail is the primary email source",
      googlecalendar: "Calendar tracks deadlines and commitments",
      notion: "Notion hosts notes and tasks",
      microsoftonenote: "OneNote hosts notes and documents",
      microsoftoutlook: "Outlook extends email coverage",
      googletasks: "Google Tasks manages tasks",
      googlekeep: "Google Keep hosts quick notes",
    },
    changelog: [
      {
        version: "1.0.0",
        date: "2026-01-15",
        changes: [
          "First version: email triage, reply drafts, deadlines, meeting minutes, and the inbox-zero method.",
          "Gmail, Calendar, Notion, and OneNote already available; Outlook, Tasks, and Keep coming soon.",
        ],
      },
    ],
    skills: {
      "email-triage": {
        name: "Email Triage",
        description:
          "Classifies emails by priority (urgent, important, normal) based on content, sender, and deadlines. Use at the start of the day.",
        whenNot: [
          "Other users' mailboxes: never, only the authorized mailbox",
          "Emails from unknown addresses with payment requests: always verify",
        ],
        procedure: [
          "Read unread emails from the last 3 days",
          "Classify: urgent (within 24h or operational block), important (within the week), normal (informational)",
          "Flag emails containing payment requests or sensitive data",
          "Propose labels/folders for each group",
          "Return a digest: 3 emails to do today",
        ],
        rules: [
          "Priority is stated with its reason, never an absolute fact",
          "No email archived or deleted: proposal only",
          "Payment requests must always be flagged separately",
        ],
        output:
          "Three groups (urgent/important/normal) with the 3 'do today' emails and payment requests",
        example: "Triage my unread emails",
      },
      "email-draft": {
        name: "Reply Draft",
        description:
          "Generates the email reply draft based on context and sender preferences. Use for requests needing an answer.",
        whenNot: [
          "Email requiring a financial or legal commitment: draft only, with approval",
          "Content requiring unavailable data: flag the gap",
        ],
        procedure: [
          "Read the original email and the thread history",
          "Identify the questions to answer and the missing information",
          "Write the draft: subject, opening, numbered answers, closing",
          "Tone consistent with the customer's previous exchanges",
          "SENDING is an action requiring explicit approval",
        ],
        rules: [
          "Sending always requires approval: this skill only prepares",
          "150 words max, one topic per email",
          "No unconfirmed delivery or price promises",
        ],
        output: "Draft (subject, body) + list of missing information + send status (to approve)",
        example: "Reply to yesterday's email asking about delivery times",
      },
      "deadline-tracking": {
        name: "Deadline Tracking",
        description:
          "Tracks deadlines and commitments with priority notifications. Use to never lose commitments made in emails.",
        whenNot: [
          "Formal company deadlines (contracts, tax): tracked by Quotes & Finance",
          "Already-expired commitments to flag in bulk: list them by date first",
        ],
        procedure: [
          "Extract dated commitments from emails",
          "Assign priority by impact and deadline",
          "Create one task per commitment with date and owner",
          "Flag today the commitments due within 3 days",
          "Update the status of tasks already in progress",
        ],
        rules: [
          "Every deadline has a date and owner: without an owner it does not enter tracking",
          "No invented deadlines: only stated or deducible ones",
          "Use the user's time zone for deadlines",
        ],
        output:
          "Commitment list (what, date, owner, priority) + next-3-days highlight",
        example: "Which deadlines do I have in the next 3 days?",
      },
      "meeting-notes": {
        name: "Meeting Minutes",
        description:
          "Generates meeting minutes with action items and owners. Use after every meeting with notes or transcript.",
        whenNot: [
          "Confidential meetings without sharing authorization: ask",
          "Meetings with nothing to write about: no minutes is better",
        ],
        procedure: [
          "Collect notes or transcript",
          "Split: decisions, action items, open points",
          "Assign each action item an owner and a date",
          "Summarize in one page max: no endless minutes",
          "Export the minutes to the company document",
        ],
        rules: [
          "Every action item has an owner and date: if missing, flag as 'to assign'",
          "Faithful summary: no interpretation of decisions",
          "Attendee personal data: name and role only",
        ],
        output:
          "Minutes: decisions, action items (what, who, by when), open points",
        example: "Write up this morning's meeting",
      },
    },
  },
  "reports-bi": {
    name: "Reports & Decisions",
    tagline: "Data analysis and strategic decisions",
    description:
      "Business intelligence: weekly and monthly KPI reports, period-over-period comparison, anomaly detection, strategic priorities, and plain-language owner briefings.",
    category: "Analytics",
    agents: {
      "business-manager": "Business Manager analyzes data and decisions",
      "analytics-agent": "Analytics Agent generates detailed reports",
      "finance-manager": "Finance Manager uses financial data",
      "shopify-agent": "Shopify Agent provides e-commerce data",
    },
    integrations: {
      googlesheets: "Sheets is the primary data source",
      microsoftexcel: "Excel for advanced analysis",
      airtable: "Airtable for the business database",
      hubspot: "HubSpot for CRM data",
      microsoftpowerpoint: "PowerPoint for management reporting",
      googleanalytics: "Analytics for web metrics",
      googleads: "Google Ads for marketing metrics",
    },
    changelog: [
      {
        version: "1.0.0",
        date: "2026-01-15",
        changes: [
          "First version: KPI reports, period comparison, anomalies, strategic priorities, and executive summary.",
          "Sheets, Excel, Airtable, HubSpot, and PowerPoint already available; Analytics and Ads coming soon.",
        ],
      },
    ],
    skills: {
      "kpi-report": {
        name: "KPI Report",
        description:
          "Generates the weekly or monthly KPI report with key metrics and trends. Use for the weekly or monthly cadence.",
        whenNot: [
          "KPIs undefined by the owner: propose a standard set and ask for confirmation",
          "Single-day data presented as a trend: that is not a trend",
        ],
        procedure: [
          "Confirm the period and KPI list with the owner (or use the default: revenue, orders, cost, margin)",
          "Read data from connected sources",
          "Compute each KPI over the period and the change versus the previous one",
          "Flag off-target KPIs",
          "Close with 3 actions, not a repetition of numbers",
        ],
        rules: [
          "Always cite source and period for every figure",
          "No KPI computed on incomplete data without a warning",
          "The report states and proposes, never interprets causes",
        ],
        output:
          "KPI table (value, change, status) + 3 off-target + 3 actions + sources",
        example: "Give me this week's KPI report",
      },
      "period-comparison": {
        name: "Period Comparison",
        description:
          "Compares one period's data against the previous one, analyzing changes and anomalies. Use to understand what changed.",
        whenNot: [
          "Different-length periods: normalize per day before comparing",
          "Data with fewer than 2 periods: comparison is meaningless",
        ],
        procedure: [
          "Define the two periods, same length",
          "Compare metrics and compute absolute and percentage change",
          "Flag anomalies: changes beyond the datum's typical threshold",
          "For each anomaly, list 3 verifiable hypotheses (not one explanation)",
          "State which data would be needed to confirm",
        ],
        rules: [
          "More revenue never equals success alone: look at margin with revenue",
          "Anomalies are flagged, never explained with certainty",
          "Every change comes with its absolute-value change",
        ],
        output:
          "Comparison table (period A, period B, delta, delta %) + anomalies + verifiable hypotheses",
        example: "Compare this quarter with the previous one",
      },
      "anomaly-detection": {
        name: "Anomaly Detection",
        description:
          "Detects data anomalies and proposes checks. Use when a number deviates from the norm.",
        whenNot: [
          "Unexplained anomalies: never treat them as certain",
          "Seasonal data (holidays, sales): compare with the same period last year",
        ],
        procedure: [
          "Compute mean and standard deviation of the latest period",
          "Flag values beyond 2 deviations from the mean",
          "Compare with the same period last year to rule out seasonality",
          "Classify: system anomaly, isolated event, data error",
          "Propose the concrete check for each",
        ],
        rules: [
          "Every anomaly carries the check that would confirm it",
          "No alarm without the comparison value",
          "Possible data error: always check the source",
        ],
        output:
          "Anomaly list (metric, value, mean, deviation, classification, proposed check)",
        example: "February collapsed, what happened?",
      },
      "strategic-priorities": {
        name: "Strategic Priorities",
        description:
          "Turns data into strategic priorities with estimated impact and cost. Use to decide where to invest time.",
        whenNot: [
          "Priorities requiring financial investment: cash data is needed",
          "Already-made decisions: this skill helps choose, not ratify",
        ],
        procedure: [
          "List candidates (actions, projects, channels) emerging from the data",
          "Assess each candidate: expected impact, effort, cost, payback time",
          "Rank by impact/effort ratio",
          "Propose at most 3 priorities with one verification line each",
          "State what NOT to do to free up time",
        ],
        rules: [
          "3 priorities max: a long list is not a priority",
          "Impact is stated as an estimate with reasoning",
          "No recommendation based on a single datum",
        ],
        output:
          "Candidate table (impact, effort, cost, payback) + 3 priorities + what not",
        example: "What do we do first next quarter?",
      },
      "executive-summary": {
        name: "Executive Summary",
        description:
          "Summarizes data for the owner in plain language, no jargon. Use for the weekly briefing.",
        whenNot: [
          "Unconsolidated data: flag the summary as provisional",
          "Formal document request: that needs Documentation, not a summary",
        ],
        procedure: [
          "Take the 5 most relevant data points of the period",
          "Translate them into business language: what happened, what it means",
          "Split: good, to watch, to fix",
          "Close with 3 decisions requested from the owner",
          "Keep 200 words max",
        ],
        rules: [
          "No technical jargon and no unexplained BI formulas",
          "Every number must sit inside a sentence",
          "The summary never hides negative data",
        ],
        output:
          "Briefing (good / to watch / to fix) + 3 requested decisions",
        example: "Write this week's owner briefing",
      },
    },
  },
  "hr-recruiting": {
    name: "HR & Recruiting",
    tagline: "Manage applications and recruiting",
    description:
      "HR suite: CV screening against the job description, skill matching, pre-qualification questions, structured candidate feedback, interview scheduling, and candidate cards.",
    category: "Human resources",
    agents: {
      "hr-recruiter": "HR & Recruiter handles hiring",
      "calendar-booking": "Calendar Booking schedules interviews",
      "email-manager": "Email Manager communicates with candidates",
    },
    integrations: {
      gmail: "Gmail communicates with candidates",
      googlecalendar: "Calendar schedules interviews",
      googledrive: "Drive hosts CVs and documents",
      microsoftword: "Word generates HR documents",
      airtable: "Airtable tracks candidates",
      notion: "Notion hosts interview notes",
      googlemeet: "Google Meet for video interviews",
      microsoftoutlook: "Outlook extends calendar coverage",
    },
    changelog: [
      {
        version: "1.0.0",
        date: "2026-01-15",
        changes: [
          "First version: CV screening, candidate matching, interview questions, feedback, and interview scheduling.",
          "No score uses protected personal data: we assess only documented skills and experience.",
        ],
      },
    ],
    skills: {
      "cv-screening": {
        name: "CV Screening",
        description:
          "Compares CVs against the job description and generates skill matching. Use for new applications.",
        whenNot: [
          "Roles subject to company diversity criteria: criteria remain the company's",
          "Unreadable CVs or unsupported formats: ask for an alternative version",
        ],
        procedure: [
          "Extract mandatory and desirable requirements from the job description",
          "Extract from the CV: experience, roles, industry, results, languages",
          "Compare per requirement: met, partial, missing",
          "Compute requirement coverage and produce the reasoned verdict",
          "List points to verify in the interview",
        ],
        rules: [
          "No judgment based on personal data (age, gender, nationality, photo)",
          "Assess only documented skills and experience",
          "The score supports the human decision, never replaces it",
        ],
        output:
          "Requirement table (mandatory/desirable, outcome, CV evidence) + coverage % + points to verify",
        example: "Screen the CVs received for the sales assistant posting",
      },
      "candidate-matching": {
        name: "Candidate Matching",
        description:
          "Compares candidate skills against role requirements and generates a ranking. Use after screening multiple applications.",
        whenNot: [
          "Single application: matching is unnecessary, use CV Screening",
          "Ranking used as a final outcome: the decision stays human",
        ],
        procedure: [
          "Collect the already filtered candidate cards",
          "Compare each candidate on mandatory requirements, in weight order",
          "Assign a 0-100 score and a 2-line rationale",
          "Rank by score and flag 'under discussion' candidates",
          "Update the candidate tracker",
        ],
        rules: [
          "No personal data in the score",
          "Each candidate rationale must be specific, not generic",
          "First assessment, not outcome: a person makes the hire",
        ],
        output:
          "Ranking (candidate, score, covered requirements, rationale) + 'to assess with HR' note",
        example: "Rank the 6 candidates for the sales assistant role",
      },
      "interview-questions": {
        name: "Interview Questions",
        description:
          "Generates pre-qualification questions based on role and seniority. Use before the interview.",
        whenNot: [
          "Role undefined: ask for job description and level",
          "Questions requiring protected personal data: excluded",
        ],
        procedure: [
          "Take the job description and role level",
          "Generate 6-8 questions: 3 behavioral, 3 technical, 1-2 verification",
          "For each question state what to observe",
          "Add 2-3 closing questions for the candidate",
          "Avoid any question about age, marital status, health, religion, orientation",
        ],
        rules: [
          "Zero discriminatory questions: skills and experience only",
          "Behavioral questions start with 'Tell me about a time when...'",
          "10 questions max: a long interview is not an interview",
        ],
        output:
          "Question list by type with observed goal + closing questions",
        example: "Prepare the questions for the sales rep interview",
      },
      "candidate-feedback": {
        name: "Candidate Feedback",
        description:
          "Generates structured candidate feedback after the interview. Use to communicate outcome and feedback.",
        whenNot: [
          "Feedback announcing a not-yet-made internal decision: wait for the outcome",
          "Feedback discussing compensation: only if authorized",
        ],
        procedure: [
          "Confirm the process outcome with the decision maker",
          "Prepare the feedback: outcome, reasons, 2 strengths, 1 growth area",
          "Tone: respectful and specific, never generic",
          "Sending to the candidate requires approval",
          "Log the outcome on the candidate card",
        ],
        rules: [
          "Email sending = action requiring approval",
          "No discriminatory feedback or personal-data references",
          "A candidate deserves useful feedback: not a 'not the profile'",
        ],
        output:
          "Feedback draft (outcome, 2 strengths, 1 growth area) + send status (to approve)",
        example: "Write the feedback to the candidate for the accountant role",
      },
      "interview-planning": {
        name: "Interview Scheduling",
        description:
          "Plans interviews (who interviews, when, with which questions) and prepares the candidate card. Use to organize interview days.",
        whenNot: [
          "Interviews beyond participant availability: propose alternatives",
          "Involve the candidate only after internal confirmation",
        ],
        procedure: [
          "Collect interviewer, candidate, and panel availability",
          "Propose 2-3 slots, with duration and attendees",
          "Assign each interviewer a different focus, no overlaps",
          "Create the event only after candidate confirmation",
          "Prepare the candidate card with CV, requirements, and assigned questions",
        ],
        rules: [
          "Time zone and duration must always be stated in the proposal",
          "No personal participant calendars beyond the shared agenda",
          "The candidate card holds selection data only, no private notes",
        ],
        output:
          "Interview plan (slots, attendees, focus, duration) + candidate card ready for each interview",
        example: "Organize Tuesday's interviews for the 3 final candidates",
      },
    },
  },
  "documents-office": {
    name: "Documents & Office",
    tagline: "Manage documents and office",
    description:
      "Document suite: PDF reading and summaries, structured data extraction, contract version comparison, Word, Excel, and PowerPoint creation and editing, answers to document-content questions.",
    category: "Productivity",
    agents: {
      "document-agent": "Document Agent handles documents",
      "quote-agent": "Quotes & Estimates generates formal documents",
      "business-manager": "Business Manager analyzes documents",
      "support-agent": "Support Agent answers customer questions",
    },
    integrations: {
      microsoftword: "Word for document creation",
      microsoftexcel: "Excel for data analysis",
      microsoftpowerpoint: "PowerPoint for presentations",
      googledrive: "Drive hosts documents",
      microsoftonenote: "OneNote hosts notes",
      microsoftonedrive: "OneDrive syncs documents",
      microsoftsharepoint: "SharePoint for enterprise documents",
      dropbox: "Dropbox for document storage",
      googledocs: "Docs for document collaboration",
    },
    changelog: [
      {
        version: "1.0.0",
        date: "2026-01-15",
        changes: [
          "First version: PDF summary, data extraction, Q&A with quotes, document creation, and version comparison.",
          "Word, Excel, PowerPoint, Drive, and OneNote already available; OneDrive, SharePoint, Dropbox, and Docs coming soon.",
        ],
      },
    ],
    skills: {
      "pdf-summary": {
        name: "PDF Summary",
        description:
          "Reads and summarizes a PDF document extracting key points. Use for contracts, invoices, manuals, and long reports.",
        whenNot: [
          "Image-scanned PDF without OCR: flag the limitation",
          "Document with third-party personal data: verify the legal basis before sharing its content",
        ],
        procedure: [
          "Read the whole document before summarizing",
          "Extract: subject, parties, dates, amounts, obligations, deadlines",
          "Summarize in 3 blocks: in short, key points, to verify",
          "Close with the questions the document does not answer",
          "If many pages, cite page references",
        ],
        rules: [
          "250 words max: if more is needed, it is a block summary",
          "Cite the page when the document exceeds 5 pages",
          "No invented data: if absent from the document, write 'not present'",
        ],
        output:
          "Summary: in short (3 lines) + key points with references + open questions",
        example: "Summarize this attached supply contract",
      },
      "data-extraction": {
        name: "Data Extraction",
        description:
          "Extracts structured data from documents (tables, dates, amounts). Use to populate spreadsheets or reports.",
        whenNot: [
          "Tables with multiple possible readings: flag the ambiguity",
          "Extracting unnecessary personal data: only required fields",
        ],
        procedure: [
          "Identify the document structure (tables, lists, sections)",
          "Define the fields to extract before starting",
          "Extract row by row, without interpreting",
          "Flag illegible values as 'to verify', never as estimates",
          "Export in Excel/Sheets-ready tabular format",
        ],
        rules: [
          "No interpretation: extract, do not infer",
          "Illegible values are marked, never invented",
          "Dates in ISO format (YYYY-MM-DD) to avoid ambiguity",
        ],
        output:
          "Extracted table (fields as columns) + row count + list of values to verify",
        example: "Extract the expense table from the expense-report PDF",
      },
      "document-qa": {
        name: "Document Q&A",
        description:
          "Answers questions about document content with quotes. Use when the user asks about an uploaded document.",
        whenNot: [
          "Question the document does not cover: say so, do not extend the document",
          "Legal interpretation request: report the text, interpretation stays with a professional",
        ],
        procedure: [
          "Find the relevant passage in the document",
          "Answer in 2-4 lines, quoting the text",
          "State page or section",
          "If several answers are plausible, present both",
          "If the answer is absent, propose where to look",
        ],
        rules: [
          "Every answer carries the document quote",
          "No inference unsupported by the text",
          "Tone: direct, with the source right under the answer",
        ],
        output: "Short answer + quote (in parentheses) + page reference",
        example: "Does the contract include a late-delivery penalty clause?",
      },
      "document-creation": {
        name: "Document Creation",
        description:
          "Creates and edits Word, Excel, and PowerPoint documents. Use when a new document is needed or an existing one updated.",
        whenNot: [
          "Document to use as an authoritative source (contracts, financials): mandatory human review",
          "Sharing the document with the customer: action requiring approval",
        ],
        procedure: [
          "Ask for or use the existing company template",
          "Fill fields with verified data",
          "For Excel: one table, frozen headers, formulas if needed",
          "For PowerPoint: 1 message per slide max, titles as statements",
          "Generate the file and return the file name",
        ],
        rules: [
          "Never create documents mimicking third parties' look",
          "For Excel: no hard-coded data inside formulas",
          "Documents with personal data: verify consent",
        ],
        output:
          "Generated file (name, format) + list of filled fields + any requested revisions",
        example: "Create the Word report with this week's data",
      },
      "version-comparison": {
        name: "Version Comparison",
        description:
          "Compares two document versions and lists differences. Use for contract revisions or drafts.",
        whenNot: [
          "Documents in non-comparable formats (scanned PDF): flag the limitation",
          "Undated versions: ask which is the latest",
        ],
        procedure: [
          "Compare the two documents section by section",
          "Classify each difference: added, removed, changed",
          "For each change, assess impact (material or formal)",
          "Flag changes needing attention (amounts, dates, obligations)",
          "Give no legal opinions: report differences",
        ],
        rules: [
          "No legal opinion on changes: statement only",
          "Amount and deadline changes must always be highlighted",
          "Order by decreasing impact",
        ],
        output:
          "Difference list (section, type, impact, before/after text) + material-change summary",
        example: "Compare contract v2 against v1",
      },
    },
  },
  "research-competitor": {
    name: "Competitor Research",
    tagline: "Analyze market and competitors",
    description:
      "Market research toolkit: market research with verifiable sources, price and review comparison, complete competitor cards, and summaries with quotes and confidence levels.",
    category: "Research",
    agents: {
      "research-agent": "Research Agent analyzes market and competitors",
      "seo-agent": "SEO Content uses competitor data",
      "business-manager": "Business Manager uses the analyses",
      "social-media-agent": "Social Media monitors competitors",
    },
    integrations: {
      notion: "Notion hosts research",
      googlesheets: "Sheets for competitor data",
      microsoftpowerpoint: "PowerPoint for presentations",
      googledrive: "Drive hosts research documents",
    },
    changelog: [
      {
        version: "1.0.0",
        date: "2026-01-15",
        changes: [
          "First version: market research, price comparison, competitor cards, and summaries with confidence levels.",
          "Every datum carries its source: when research finds no value, the skill states it instead of estimating.",
        ],
      },
    ],
    skills: {
      "market-research": {
        name: "Market Research",
        description:
          "Researches the target market with verifiable sources and trend analysis. Use at the start of an analysis.",
        whenNot: [
          "Unverifiable market data: state the limit, never estimate",
          "Long-term forecast request: documented trends only",
        ],
        procedure: [
          "Define the market: industry, geography, customer segment",
          "Collect data from public, verifiable sources",
          "Separate verified data from opinions",
          "Identify trends with their supporting source",
          "Every datum carries its source (URL or document name) and date",
        ],
        rules: [
          "No market datum without a cited source",
          "Third-party estimates are estimates: attribute them",
          "No invented data when research fails: say so",
        ],
        output:
          "Market summary + trends (with source and date) + verified data vs estimates",
        example: "How fast is the office-chair industry growing in Italy?",
      },
      "price-comparison": {
        name: "Price Comparison",
        description:
          "Compares competitor prices against our offer. Use to decide positioning.",
        whenNot: [
          "Unpublished prices: report 'not published', never estimate",
          "Non-comparable products: align specs first",
        ],
        procedure: [
          "Align specs: models, sizes, materials, included services",
          "Collect published prices, with date",
          "Compare like-for-like",
          "Compute market positioning",
          "Flag where our offer is pricier and where it is cheaper",
        ],
        rules: [
          "Compare equivalent products only: spec differences make comparison useless",
          "Every price with source and date",
          "No unpublished price data",
        ],
        output:
          "Price table (competitor, specs, price, source, date) + positioning",
        example: "Let us compare our direct competitors' prices",
      },
      "competitor-profile": {
        name: "Competitor Card",
        description:
          "Generates the complete competitor card with prices, reviews, and positioning. Use for periodic analyses.",
        whenNot: [
          "Competitor with no verifiable activity: state it, never invent",
          "Card used for pricing decisions: a human decision is needed",
        ],
        procedure: [
          "Collect public information about the competitor",
          "Organize: positioning, offer, prices, channels, reviews",
          "Compute review sentiment (positive/negative) if available",
          "State observable strengths and weaknesses",
          "Close with 3 differentiation ideas for us",
        ],
        rules: [
          "Public data only: no non-public information",
          "Every statement carries its source",
          "No moral judgment on the competitor company",
        ],
        output:
          "Competitor card (positioning, offer, prices, reviews, strengths/weaknesses) + 3 differentiation ideas",
        example: "Build me the competitor card for Bianchi Srl",
      },
      "insight-synthesis": {
        name: "Quoted Summary",
        description:
          "Synthesizes research into a document with quotes and confidence levels. Use to close an analysis.",
        whenNot: [
          "Insufficient sources: the summary states a low confidence level",
          "Document to share externally: action requiring approval",
        ],
        procedure: [
          "Collect results of previous research",
          "Split: confirmed (multiple sources), likely (one strong source), to verify",
          "Assign a confidence level: high, medium, low",
          "Cite each statement with its source in parentheses",
          "List checks still to run",
        ],
        rules: [
          "Every statement with its source; no summary without quotes",
          "Confidence level is mandatory",
          "Unverified information stays marked as such",
        ],
        output:
          "Summary document: confirmed / likely / to verify + sources + confidence level",
        example: "Let us close the market research with a quoted summary",
      },
    },
  },
  "projects-tasks": {
    name: "Projects & Tasks",
    tagline: "Manage projects and tasks",
    description:
      "Project management: turning requests into tasks, updating boards, progress reports, automatic standups, and deadline reminders.",
    category: "Productivity",
    agents: {
      "personal-assistant": "Personal Assistant handles tasks and projects",
      "business-manager": "Business Manager tracks project progress",
      "email-manager": "Email Manager communicates tasks and deadlines",
    },
    integrations: {
      trello: "Trello for project management",
      asana: "Asana for task management",
      clickup: "ClickUp for project management",
      notion: "Notion for tasks and documents",
      slack: "Slack for team notifications",
      github: "GitHub for technical teams",
      jira: "Jira for enterprise projects",
      microsoftteams: "Teams for collaboration",
    },
    changelog: [
      {
        version: "1.0.0",
        date: "2026-01-15",
        changes: [
          "First version: request-to-task, board updates, progress reports, standups, and reminders.",
          "Trello, Asana, ClickUp, Notion, Slack, and GitHub already available; Jira and Teams coming soon.",
        ],
      },
    ],
    skills: {
      "request-to-task": {
        name: "Request to Task",
        description:
          "Turns a verbal request into structured tasks with priority and deadline. Use for requests to triage.",
        whenNot: [
          "Request that is not a task (information, question): do not create tasks",
          "Project without a defined goal: clarify the goal first",
        ],
        procedure: [
          "Ask the request goal in one sentence",
          "Split into 3-7 tasks, each with a verifiable outcome",
          "Assign priority (P1/P2/P3) and hour estimate",
          "Set the deadline or ask for it",
          "Create the tasks on the board and return the list",
        ],
        rules: [
          "One task = one verifiable outcome, not a series of actions",
          "Every task has priority and deadline, otherwise it is a wish",
          "No task without an owner: ask who owns it",
        ],
        output:
          "Task list (title, outcome, priority, estimate, deadline, owner) + creation confirmation",
        example: "The customer wants the new catalog by month end: which tasks do I create?",
      },
      "board-update": {
        name: "Board Update",
        description:
          "Updates the project board (Trello, Asana, ClickUp) with task status. Use at end of day.",
        whenNot: [
          "Status unconfirmed by the team: do not move tasks by deduction",
          "Board not connected: produce the list of changes to apply",
        ],
        procedure: [
          "Read the board and compare with known commitments",
          "Move only confirmed-status tasks",
          "Add status comments to in-progress tasks",
          "Never close tasks: that is up to whoever did them",
          "Return the list of applied changes",
        ],
        rules: [
          "No task moved to 'done' without confirmation",
          "Existing priorities never change without a stated reason",
          "Every change is reversible: no deletions",
        ],
        output: "List of applied changes + tasks left unchanged due to doubt",
        example: "Update the board with today's status",
      },
      "progress-report": {
        name: "Progress Report",
        description:
          "Generates the project progress report with blockers and next steps. Use for the customer or management.",
        whenNot: [
          "Project without tracked tasks: the report would be invented",
          "Internal and external use together: ask which",
        ],
        procedure: [
          "Collect tasks by status: done, in progress, to start",
          "Compute percent progress on completed tasks",
          "List blockers with cause and who must unblock",
          "Define the 3 next steps with owner and date",
          "Flag deviations from plan",
        ],
        rules: [
          "Progress is computed on tasks, not effort estimates",
          "No blocker without an assigned owner",
          "If a project date slips, state it: never 'on track' when it is not",
        ],
        output:
          "Report: % progress + done/in-progress/to-start + blockers (cause, owner) + 3 next steps",
        example: "Where are we with the catalog project?",
      },
      "auto-standup": {
        name: "Automatic Standup",
        description:
          "Generates the daily standup digest from team tasks. Use in the morning or on request.",
        whenNot: [
          "Team without tracked tasks: the standup cannot be reconstructed",
          "Standup with personal data: no private team-member notes",
        ],
        procedure: [
          "Collect per member: in-progress tasks, yesterday's completions, blockers",
          "Group into three columns: yesterday, today, blockers",
          "Flag members without updates",
          "Close with the decisions needed today",
          "15 lines max: a standup is not a report",
        ],
        rules: [
          "No judging people: task facts only",
          "No private team-member notes",
          "Whoever did not update is flagged, never inferred",
        ],
        output: "Standup: yesterday / today / blockers (by task, not person) + requested decisions",
        example: "Prepare today's standup",
      },
      "deadline-reminder": {
        name: "Deadline Reminders",
        description:
          "Reminds of approaching deadlines with enough margin to act. Use on schedule or daily.",
        whenNot: [
          "Reminder already sent today for the same deadline: do not duplicate",
          "Formal company deadlines: tracked by Quotes & Finance",
        ],
        procedure: [
          "List deadlines within 3 days",
          "For each state remaining margin and whether already late",
          "Flag late ones with the proposed new date",
          "Send a concise reminder (5 lines max)",
          "Propose updating dates if the margin is unrecoverable",
        ],
        rules: [
          "One reminder per deadline per day",
          "Late deadlines are stated openly: no implicit alarms",
          "No automatic sending to third parties: internal owner only",
        ],
        output:
          "Reminder sent with deadline list (deadline, margin, status) + proposal for overdue dates",
        example: "What expires in the next 3 days?",
      },
    },
  },
};
