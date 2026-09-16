import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/agent.dart';
import '../../services/cart_service.dart';
import '../../theme/theme.dart';
import '../chat/chat_screen.dart';
import 'package:url_launcher/url_launcher.dart';

class AgentDetailScreen extends StatelessWidget {
  final Agent agent;
  const AgentDetailScreen({super.key, required this.agent});

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<CartService>();
    final inCart = cart.contains(agent.slug);
    return Scaffold(
      appBar: AppBar(title: Text(agent.name)),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(color: AgentCloudTheme.surfaceCard, borderRadius: BorderRadius.circular(16), border: Border.all(color: AgentCloudTheme.surfaceBorder)),
              child: Row(
                children: [
                  Container(padding: const EdgeInsets.all(14), decoration: BoxDecoration(color: agent.accent.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(14)), child: Icon(agent.icon, color: agent.accent, size: 28)),
                  const SizedBox(width: 16),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(agent.name, style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800)),
                    Text(agent.category, style: const TextStyle(color: AgentCloudTheme.textMuted, fontSize: 12)),
                    const SizedBox(height: 6),
                    Text(agent.displayPrice, style: const TextStyle(color: AgentCloudTheme.primaryLight, fontWeight: FontWeight.bold)),
                  ])),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Text(agent.description, style: const TextStyle(color: AgentCloudTheme.textSecondary, fontSize: 14, height: 1.5)),
            const SizedBox(height: 12),
            const Text('Cosa automatizza', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Wrap(spacing: 8, runSpacing: 8, children: agent.capabilities.map((c) => Chip(label: Text(c, style: const TextStyle(fontSize: 12)), backgroundColor: const Color(0xFF064E3B).withValues(alpha: 0.4), labelStyle: const TextStyle(color: Color(0xFF6EE7B7)))).toList()),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: inCart ? null : () { context.read<CartService>().add(agent.slug); ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Aggiunto al carrello'))); },
                icon: Icon(inCart ? Icons.check : Icons.shopping_cart, size: 18),
                label: Text(inCart ? 'Nel carrello' : 'Aggiungi al carrello — ${agent.displayPrice}'),
                style: ElevatedButton.styleFrom(backgroundColor: AgentCloudTheme.primary, foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 16), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
              ),
            ),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => ChatScreen(agentSlug: agent.slug))),
                icon: const Icon(Icons.chat_bubble_outline, size: 18),
                label: const Text('Prova in chat'),
                style: OutlinedButton.styleFrom(foregroundColor: Colors.white, side: const BorderSide(color: AgentCloudTheme.surfaceBorder), padding: const EdgeInsets.symmetric(vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
              ),
            ),
            const SizedBox(height: 16),
            const Text('Setup in 2 minuti • GDPR-ready • Token cifrati', style: TextStyle(color: AgentCloudTheme.textMuted, fontSize: 11)),
            const SizedBox(height: 12),
            TextButton.icon(onPressed: () => launchUrl(Uri.parse('https://agentcloud.agency/agents/${agent.slug}'), mode: LaunchMode.externalApplication), icon: const Icon(Icons.open_in_new, size: 14), label: const Text('Vedi sul web')),
          ],
        ),
      ),
    );
  }
}
