import 'package:flutter/material.dart';

class Agent {
  final String slug;
  final String name;
  final String shortName;
  final String category;
  final String description;
  final IconData icon;
  final String brand;
  final int priceCents;
  final String displayPrice;
  final bool active;
  final String setupTime;
  final List<String> capabilities;
  final Color accent;

  const Agent({
    required this.slug,
    required this.name,
    required this.shortName,
    required this.category,
    required this.description,
    required this.icon,
    required this.brand,
    required this.priceCents,
    required this.displayPrice,
    this.active = true,
    this.setupTime = '2 minuti',
    this.capabilities = const [],
    required this.accent,
  });

  double get priceEuro => priceCents / 100;

  static const List<Agent> all = [
    Agent(
      slug: 'shopify-agent',
      name: 'Shopify Agent',
      shortName: 'Shopify',
      category: 'E-commerce & Finance',
      description: 'Cerca prodotti, crea carrelli e verifica ordini e spedizioni 24/7.',
      icon: Icons.shopping_bag_rounded,
      brand: 'shopify',
      priceCents: 999,
      displayPrice: '€9,99/mo',
      setupTime: '2 minuti',
      accent: Color(0xFF95BF47),
      capabilities: ['Ricerca catalogo', 'Link carrello', 'Stato ordine'],
    ),
    Agent(
      slug: 'email-manager',
      name: 'Email Manager',
      shortName: 'Email Manager',
      category: 'Business & Operations',
      description: 'Smista, priorizza e prepara bozze. Tu approvi con un clic.',
      icon: Icons.mail_rounded,
      brand: 'gmail',
      priceCents: 1499,
      displayPrice: '€14,99/mo',
      accent: Color(0xFFEA4335),
      capabilities: ['Classifica email', 'Bozze pronte', 'Follow-up'],
    ),
    Agent(
      slug: 'support-agent',
      name: 'Support Agent',
      shortName: 'Support',
      category: 'Customer Service',
      description: 'Risponde a domande su prodotti e ordini 24/7 con FAQ automatiche.',
      icon: Icons.support_agent_rounded,
      brand: 'zendesk',
      priceCents: 1499,
      displayPrice: '€14,99/mo',
      accent: Color(0xFF00B8D4),
      capabilities: ['FAQ auto', 'Ordini', 'Resi'],
    ),
    Agent(
      slug: 'lead-capture',
      name: 'Lead Capture',
      shortName: 'Lead Capture',
      category: 'Marketing & Sales',
      description: 'Cattura lead dal sito, arricchisce e avvisa Slack/HubSpot.',
      icon: Icons.filter_alt_rounded,
      brand: 'hubspot',
      priceCents: 999,
      displayPrice: '€9,99/mo',
      accent: Color(0xFFFF6B00),
      capabilities: ['Form → CRM', 'Arricchimento', 'Notifica vendite'],
    ),
    Agent(
      slug: 'calendar-booking',
      name: 'Calendar Booking',
      shortName: 'Calendar',
      category: 'Business & Operations',
      description: 'Propone slot, prenota e invia inviti con reminder automatici.',
      icon: Icons.calendar_month_rounded,
      brand: 'googlecalendar',
      priceCents: 999,
      displayPrice: '€9,99/mo',
      accent: Color(0xFF4285F4),
      capabilities: ['Disponibilità', 'Prenota', 'Reminder'],
    ),
    Agent(
      slug: 'finance-manager',
      name: 'Finance Manager',
      shortName: 'Finance',
      category: 'E-commerce & Finance',
      description: 'Fatture, cashflow da CSV/Stripe e solleciti gentili automatici.',
      icon: Icons.receipt_long_rounded,
      brand: 'stripe',
      priceCents: 1499,
      displayPrice: '€14,99/mo',
      accent: Color(0xFF635BFF),
      capabilities: ['Fatture', 'Incassi', 'Solleciti'],
    ),
    Agent(
      slug: 'seo-agent',
      name: 'SEO Content',
      shortName: 'SEO',
      category: 'Marketing & Sales',
      description: 'Genera contenuti ottimizzati SEO e pianifica il calendario editoriale.',
      icon: Icons.search_rounded,
      brand: 'google',
      priceCents: 1499,
      displayPrice: '€14,99/mo',
      accent: Color(0xFF34A853),
      capabilities: ['Articoli SEO', 'Keyword', 'Calendario'],
    ),
    Agent(
      slug: 'copywriter',
      name: 'Copywriter',
      shortName: 'Copywriter',
      category: 'Design & Content',
      description: 'Copy per landing, DEM e social con tono personalizzabile.',
      icon: Icons.edit_note_rounded,
      brand: 'notion',
      priceCents: 1499,
      displayPrice: '€14,99/mo',
      accent: Color(0xFF8B5CF6),
      capabilities: ['Landing', 'DEM', 'Social'],
    ),
  ];

  static Agent? bySlug(String slug) {
    try {
      return all.firstWhere((a) => a.slug == slug);
    } catch (_) {
      return null;
    }
  }
}
