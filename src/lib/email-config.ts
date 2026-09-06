/**
 * Centralized email addresses for the AgentCloud domain.
 *
 * All outbound mail is sent from the verified domain (Resend), and inbound
 * support/feedback notifications land on the domain inboxes configured below.
 * Override via env vars — no code change needed.
 */

export const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "support@agentcloud.agency";

export const FEEDBACK_EMAIL =
  process.env.FEEDBACK_EMAIL || "feedback@agentcloud.agency";

/** Branded sender used for all transactional / notification emails. */
export const FROM_EMAIL = `AgentCloud <${SUPPORT_EMAIL}>`;

/** Client-safe variant (NEXT_PUBLIC_* is inlined at build time). */
export const PUBLIC_SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL || SUPPORT_EMAIL;
