import 'package:flutter/material.dart';

class Integration {
  final String slug;
  final String name;
  final String brand;
  final String category;
  final bool available;
  final String? agentSlug;
  final IconData icon;

  const Integration({
    required this.slug,
    required this.name,
    required this.brand,
    required this.category,
    this.available = false,
    this.agentSlug,
    required this.icon,
  });

  static const List<Integration> all = [
    Integration(slug: 'shopify', name: 'Shopify', brand: 'shopify', category: 'E-commerce', available: true, agentSlug: 'shopify-agent', icon: Icons.shopping_bag),
    Integration(slug: 'gmail', name: 'Gmail', brand: 'gmail', category: 'Email', available: true, agentSlug: 'email-manager', icon: Icons.mail),
    Integration(slug: 'slack', name: 'Slack', brand: 'slack', category: 'Messaging', available: true, icon: Icons.chat_bubble),
    Integration(slug: 'notion', name: 'Notion', brand: 'notion', category: 'Docs', available: true, icon: Icons.description),
    Integration(slug: 'hubspot', name: 'HubSpot', brand: 'hubspot', category: 'CRM', available: true, icon: Icons.hub),
    Integration(slug: 'google_sheets', name: 'Google Sheets', brand: 'googlesheets', category: 'Sheets', available: true, icon: Icons.table_chart),
    Integration(slug: 'stripe', name: 'Stripe', brand: 'stripe', category: 'Payments', available: true, icon: Icons.credit_card),
    Integration(slug: 'google_calendar', name: 'Google Calendar', brand: 'googlecalendar', category: 'Calendar', available: true, agentSlug: 'calendar-booking', icon: Icons.calendar_today),
    // Prossimamente
    Integration(slug: 'whatsapp', name: 'WhatsApp', brand: 'whatsapp', category: 'Messaging', icon: Icons.chat),
    Integration(slug: 'facebook', name: 'Facebook', brand: 'facebook', category: 'Social', icon: Icons.facebook),
    Integration(slug: 'instagram', name: 'Instagram', brand: 'instagram', category: 'Social', icon: Icons.camera_alt),
    Integration(slug: 'tiktok', name: 'TikTok', brand: 'tiktok', category: 'Social', icon: Icons.music_note),
    Integration(slug: 'paypal', name: 'PayPal', brand: 'paypal', category: 'Payments', icon: Icons.payment),
    Integration(slug: 'woocommerce', name: 'WooCommerce', brand: 'woocommerce', category: 'E-commerce', icon: Icons.store),
    Integration(slug: 'salesforce', name: 'Salesforce', brand: 'salesforce', category: 'CRM', icon: Icons.business),
    Integration(slug: 'zapier', name: 'Zapier', brand: 'zapier', category: 'Automation', icon: Icons.bolt),
  ];
}
