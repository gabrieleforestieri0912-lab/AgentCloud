import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/agent.dart';
import '../../models/bundle.dart';
import '../../services/cart_service.dart';
import '../../theme/theme.dart';
import '../../widgets/agent_card.dart';
import 'agent_detail_screen.dart';

class MarketplaceScreen extends StatefulWidget {
  const MarketplaceScreen({super.key});
  @override
  State<MarketplaceScreen> createState() => _MarketplaceScreenState();
}

class _MarketplaceScreenState extends State<MarketplaceScreen> {
  String _query = '';
  String _category = 'Tutti';

  List<String> get categories => ['Tutti', ...Agent.all.map((a) => a.category).toSet()];

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<CartService>();
    final filtered = Agent.all.where((a) {
      final q = _query.toLowerCase();
      final matchQ = q.isEmpty || a.name.toLowerCase().contains(q) || a.description.toLowerCase().contains(q);
      final matchC = _category == 'Tutti' || a.category == _category;
      return matchQ && matchC;
    }).toList();

    return Scaffold(
      appBar: AppBar(title: const Text('Marketplace')),
      body: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  TextField(
                    onChanged: (v) => setState(() => _query = v),
                    decoration: InputDecoration(
                      hintText: 'Cerca agenti per nome o funzionalità...',
                      prefixIcon: const Icon(Icons.search),
                      filled: true,
                      fillColor: AgentCloudTheme.surfaceCard,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AgentCloudTheme.surfaceBorder)),
                    ),
                  ),
                  const SizedBox(height: 12),
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: categories.map((c) => Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ChoiceChip(
                          label: Text(c, style: const TextStyle(fontSize: 12)),
                          selected: _category == c,
                          onSelected: (_) => setState(() => _category = c),
                          selectedColor: AgentCloudTheme.primary.withValues(alpha: 0.3),
                        ),
                      )).toList(),
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Text('Bundle & Risparmia', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 16)),
                  const SizedBox(height: 8),
                  SizedBox(
                    height: 140,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemCount: Bundle.all.length,
                      separatorBuilder: (_, __) => const SizedBox(width: 12),
                      itemBuilder: (_, i) {
                        final b = Bundle.all[i];
                        return Container(
                          width: 260,
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(color: AgentCloudTheme.surfaceCard, borderRadius: BorderRadius.circular(16), border: Border.all(color: AgentCloudTheme.surfaceBorder)),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(b.name, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                              Text(b.description, style: const TextStyle(color: AgentCloudTheme.textSecondary, fontSize: 12)),
                              const Spacer(),
                              Text('Da €${(b.monthlyCents/100).toStringAsFixed(2)}/mo', style: const TextStyle(color: AgentCloudTheme.primaryLight, fontWeight: FontWeight.bold, fontSize: 12)),
                            ],
                          ),
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            sliver: SliverList.separated(
              itemCount: filtered.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (_, i) {
                final agent = filtered[i];
                return InkWell(
                  onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => AgentDetailScreen(agent: agent))),
                  child: AgentCard(
                    agent: agent,
                    inCart: cart.contains(agent.slug),
                    onAddToCart: () => cart.add(agent.slug),
                    onOpenChat: () => Navigator.pushNamed(context, '/chat', arguments: agent.slug),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
