import 'package:flutter/material.dart';
import '../models/agent.dart';
import '../theme/theme.dart';

class AgentCard extends StatelessWidget {
  final Agent agent;
  final bool inCart;
  final bool owned;
  final VoidCallback? onAddToCart;
  final VoidCallback? onOpenChat;

  const AgentCard({super.key, required this.agent, this.inCart = false, this.owned = false, this.onAddToCart, this.onOpenChat});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AgentCloudTheme.surfaceCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AgentCloudTheme.surfaceBorder),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(color: agent.accent.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(12)),
                child: Icon(agent.icon, color: agent.accent),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(agent.name, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
                    Text(agent.category, style: const TextStyle(color: AgentCloudTheme.textMuted, fontSize: 11, fontWeight: FontWeight.w600)),
                  ],
                ),
              ),
              if (!agent.active)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(color: Colors.amber.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(20)),
                  child: const Text('Presto', style: TextStyle(color: Colors.amber, fontSize: 10, fontWeight: FontWeight.bold)),
                ),
            ],
          ),
          const SizedBox(height: 8),
          Text(agent.description, style: const TextStyle(color: AgentCloudTheme.textSecondary, fontSize: 13, height: 1.4)),
          const SizedBox(height: 10),
          Wrap(
            spacing: 6,
            children: agent.capabilities.map((c) => Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(color: const Color(0xFF064E3B).withValues(alpha: 0.4), borderRadius: BorderRadius.circular(20)),
              child: Text(c, style: const TextStyle(color: Color(0xFF6EE7B7), fontSize: 11, fontWeight: FontWeight.w600)),
            )).toList(),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Text(agent.displayPrice, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              const Spacer(),
              if (owned)
                ElevatedButton.icon(
                  onPressed: onOpenChat,
                  icon: const Icon(Icons.chat_bubble, size: 14),
                  label: const Text('Apri in chat'),
                  style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF10B981), foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20))),
                )
              else if (inCart)
                OutlinedButton.icon(
                  onPressed: null,
                  icon: const Icon(Icons.check, size: 14),
                  label: const Text('Nel carrello'),
                  style: OutlinedButton.styleFrom(side: const BorderSide(color: AgentCloudTheme.surfaceBorder)),
                )
              else
                ElevatedButton(
                  onPressed: agent.active ? onAddToCart : null,
                  style: ElevatedButton.styleFrom(backgroundColor: AgentCloudTheme.primary, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20))),
                  child: const Text('Aggiungi'),
                ),
            ],
          )
        ],
      ),
    );
  }
}
