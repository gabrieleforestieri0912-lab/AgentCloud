import 'package:flutter/material.dart';

/// Catalogo statico delle integrazioni mostrate nella schermata Integrazioni.
///
/// SYNC WITH `src/lib/integrations.ts` (INTEGRATIONS): nome, categoria, stato
/// `available` e ordine devono restare identici alla fonte di verità web. Il
/// test `scripts/test-clients-alignment.mjs` fallisce se le due liste divergono.
///
/// `provider` è l'id del provider OAuth (tabella `tenant_integrations`): le
/// quattro app Microsoft condividono UNA sola connessione (`microsoft`), quindi
/// serve per non contare/gestire quattro connessioni distinte. Corrisponde a
/// `BRAND_TO_PROVIDER` di `src/lib/integrations.ts`.
class Integration {
  final String slug;
  final String name;
  final String brand;
  final String category;
  final bool available;
  final String? agentSlug;
  /// Id provider OAuth quando l'app è collegabile (`null` per "Prossimamente").
  final String? provider;
  final IconData icon;

  const Integration({
    required this.slug,
    required this.name,
    required this.brand,
    required this.category,
    this.available = false,
    this.agentSlug,
    this.provider,
    required this.icon,
  });

  static const List<Integration> all = [
    // ─── Disponibili ora ───
    Integration(slug: 'gmail', name: 'Gmail', brand: 'gmail', category: 'Email Service', available: true, agentSlug: 'email-manager', provider: 'gmail', icon: Icons.mail),
    Integration(slug: 'googlecalendar', name: 'Google Calendar', brand: 'googlecalendar', category: 'Calendar', available: true, agentSlug: 'calendar-booking', provider: 'google_calendar', icon: Icons.calendar_today),
    Integration(slug: 'hubspot', name: 'HubSpot', brand: 'hubspot', category: 'CRM', available: true, agentSlug: 'lead-capture', provider: 'hubspot', icon: Icons.hub),
    Integration(slug: 'notion', name: 'Notion', brand: 'notion', category: 'Productivity', available: true, agentSlug: 'personal-assistant', provider: 'notion', icon: Icons.description),
    Integration(slug: 'googlesheets', name: 'Google Sheets', brand: 'googlesheets', category: 'Productivity', available: true, agentSlug: 'business-manager', provider: 'google_sheets', icon: Icons.table_chart),
    Integration(slug: 'slack', name: 'Slack', brand: 'slack', category: 'Messaging', available: true, agentSlug: 'support-agent', provider: 'slack', icon: Icons.chat_bubble),
    Integration(slug: 'woocommerce', name: 'WooCommerce', brand: 'woocommerce', category: 'E-commerce', available: true, provider: 'woocommerce', icon: Icons.store),
    Integration(slug: 'mailchimp', name: 'Mailchimp', brand: 'mailchimp', category: 'Marketing', available: true, provider: 'mailchimp', icon: Icons.campaign),
    Integration(slug: 'trello', name: 'Trello', brand: 'trello', category: 'Project Management', available: true, provider: 'trello', icon: Icons.view_kanban),
    Integration(slug: 'asana', name: 'Asana', brand: 'asana', category: 'Productivity', available: true, provider: 'asana', icon: Icons.check_circle_outline),
    Integration(slug: 'airtable', name: 'Airtable', brand: 'airtable', category: 'Database', available: true, provider: 'airtable', icon: Icons.grid_on),
    Integration(slug: 'clickup', name: 'ClickUp', brand: 'clickup', category: 'Productivity', available: true, provider: 'clickup', icon: Icons.checklist),
    Integration(slug: 'github', name: 'GitHub', brand: 'github', category: 'Developer', available: true, provider: 'github', icon: Icons.code),
    Integration(slug: 'googledrive', name: 'Google Drive', brand: 'googledrive', category: 'Storage', available: true, provider: 'google_drive', icon: Icons.folder),
    // Microsoft 365 — una sola connessione (`microsoft`) abilita le quattro app.
    Integration(slug: 'microsoftword', name: 'Microsoft Word', brand: 'microsoftword', category: 'Productivity', available: true, provider: 'microsoft', icon: Icons.article),
    Integration(slug: 'microsoftexcel', name: 'Microsoft Excel', brand: 'microsoftexcel', category: 'Productivity', available: true, provider: 'microsoft', icon: Icons.grid_on),
    Integration(slug: 'microsoftpowerpoint', name: 'Microsoft PowerPoint', brand: 'microsoftpowerpoint', category: 'Productivity', available: true, provider: 'microsoft', icon: Icons.slideshow),
    Integration(slug: 'microsoftonenote', name: 'Microsoft OneNote', brand: 'microsoftonenote', category: 'Productivity', available: true, provider: 'microsoft', icon: Icons.note),
    // ─── Prossimamente ───
    // Shopify è temporaneamente qui (integrazione non collegabile per ora).
    Integration(slug: 'shopify', name: 'Shopify', brand: 'shopify', category: 'E-commerce', agentSlug: 'shopify-agent', icon: Icons.shopping_bag),
    Integration(slug: 'whatsapp', name: 'WhatsApp', brand: 'whatsapp', category: 'Messaging', icon: Icons.chat),
    Integration(slug: 'paypal', name: 'PayPal', brand: 'paypal', category: 'Payments', icon: Icons.payment),
    Integration(slug: 'facebook', name: 'Facebook', brand: 'facebook', category: 'Social & Ads', icon: Icons.facebook),
    Integration(slug: 'instagram', name: 'Instagram', brand: 'instagram', category: 'Social & Ads', icon: Icons.camera_alt),
    Integration(slug: 'tiktok', name: 'TikTok', brand: 'tiktok', category: 'Social & Ads', icon: Icons.music_note),
    Integration(slug: 'googleads', name: 'Google Ads', brand: 'googleads', category: 'Advertising', icon: Icons.ads_click),
    Integration(slug: 'googleanalytics', name: 'Google Analytics', brand: 'googleanalytics', category: 'Analytics', icon: Icons.insights),
    Integration(slug: 'googlemeet', name: 'Google Meet', brand: 'googlemeet', category: 'Meetings', icon: Icons.video_call),
    Integration(slug: 'calendly', name: 'Calendly', brand: 'calendly', category: 'Scheduling', icon: Icons.event_available),
    Integration(slug: 'zendesk', name: 'Zendesk', brand: 'zendesk', category: 'Support', icon: Icons.support_agent),
    Integration(slug: 'jira', name: 'Jira', brand: 'jira', category: 'Productivity', icon: Icons.bug_report),
    Integration(slug: 'figma', name: 'Figma', brand: 'figma', category: 'Design', icon: Icons.design_services),
    Integration(slug: 'dropbox', name: 'Dropbox', brand: 'dropbox', category: 'Storage', icon: Icons.cloud),
    Integration(slug: 'googledocs', name: 'Google Docs', brand: 'googledocs', category: 'Productivity', icon: Icons.article_outlined),
    Integration(slug: 'googleslides', name: 'Google Slides', brand: 'googleslides', category: 'Productivity', icon: Icons.slideshow_outlined),
    Integration(slug: 'googleforms', name: 'Google Forms', brand: 'googleforms', category: 'Productivity', icon: Icons.ballot),
    Integration(slug: 'googlekeep', name: 'Google Keep', brand: 'googlekeep', category: 'Productivity', icon: Icons.sticky_note_2),
    Integration(slug: 'googletasks', name: 'Google Tasks', brand: 'googletasks', category: 'Productivity', icon: Icons.task_alt),
    Integration(slug: 'googlechat', name: 'Google Chat', brand: 'googlechat', category: 'Messaging', icon: Icons.forum),
    Integration(slug: 'googlecloud', name: 'Google Cloud', brand: 'googlecloud', category: 'Cloud', icon: Icons.cloud_queue),
    Integration(slug: 'microsoftteams', name: 'Microsoft Teams', brand: 'microsoftteams', category: 'Messaging', icon: Icons.groups),
    Integration(slug: 'microsoftoutlook', name: 'Microsoft Outlook', brand: 'microsoftoutlook', category: 'Email Service', icon: Icons.mark_email_unread),
    Integration(slug: 'microsoftonedrive', name: 'OneDrive', brand: 'microsoftonedrive', category: 'Storage', icon: Icons.cloud_upload),
    Integration(slug: 'microsoftsharepoint', name: 'SharePoint', brand: 'microsoftsharepoint', category: 'Storage', icon: Icons.business),
  ];
}

