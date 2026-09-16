import 'agent.dart';

class Bundle {
  final String slug;
  final String name;
  final String description;
  final List<String> agentSlugs;
  final int monthlyCents;
  final int quarterlyCents;
  final int yearlyCents;
  final String badge;

  const Bundle({
    required this.slug,
    required this.name,
    required this.description,
    required this.agentSlugs,
    required this.monthlyCents,
    required this.quarterlyCents,
    required this.yearlyCents,
    this.badge = 'Risparmia 22%',
  });

  List<Agent> get agents => agentSlugs.map((s) => Agent.bySlug(s)).whereType<Agent>().toList();

  int get singleTotal => agents.fold(0, (sum, a) => sum + a.priceCents);
  double get quarterlySaving => (1 - quarterlyCents / singleTotal) * 100;
  double get yearlySaving => (1 - yearlyCents / singleTotal) * 100;

  static const List<Bundle> all = [
    Bundle(
      slug: 'ecommerce-starter',
      name: 'E-commerce Starter',
      description: 'Shopify + Support per vendere senza attrito.',
      agentSlugs: ['shopify-agent', 'support-agent'],
      monthlyCents: 2498,
      quarterlyCents: 1948,
      yearlyCents: 1598,
      badge: 'Starter',
    ),
    Bundle(
      slug: 'marketing-power',
      name: 'Marketing Power',
      description: 'Lead Capture + SEO + Copywriter per acquisire.',
      agentSlugs: ['lead-capture', 'seo-agent', 'copywriter'],
      monthlyCents: 3997,
      quarterlyCents: 3097,
      yearlyCents: 2597,
      badge: 'Growth',
    ),
    Bundle(
      slug: 'operations-hub',
      name: 'Operations Hub',
      description: 'Email + Calendar + Finance per operations fluide.',
      agentSlugs: ['email-manager', 'calendar-booking', 'finance-manager'],
      monthlyCents: 3997,
      quarterlyCents: 3097,
      yearlyCents: 2597,
      badge: 'Ops',
    ),
  ];
}
