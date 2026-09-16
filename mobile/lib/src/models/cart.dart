import 'agent.dart';
import 'bundle.dart';

class CartItem {
  final String agentSlug;
  final int quantity;
  final Agent? agent;

  CartItem({required this.agentSlug, this.quantity = 1}) : agent = Agent.bySlug(agentSlug);

  int get priceCents => (agent?.priceCents ?? 0) * quantity;
}

class Cart {
  final List<CartItem> items;
  final List<Bundle> bundles;

  const Cart({this.items = const [], this.bundles = const []});

  int get totalCents {
    final agentsTotal = items.fold<int>(0, (sum, it) => sum + it.priceCents);
    final bundlesTotal = bundles.fold<int>(0, (sum, b) => sum + b.monthlyCents);
    return agentsTotal + bundlesTotal;
  }

  String get totalDisplay => '€${(totalCents / 100).toStringAsFixed(2)}';
  bool get isEmpty => items.isEmpty && bundles.isEmpty;
  int get count => items.length + bundles.length;
}
