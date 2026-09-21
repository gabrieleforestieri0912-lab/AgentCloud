// ignore_for_file: prefer_const_declarations

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../theme/theme.dart';
import '../models/agent.dart';
import '../services/cart_service.dart';
import 'chat/chat_screen.dart';
import 'install_screen.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final agents = Agent.all;
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                  color: AgentCloudTheme.primary.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(10)),
              child: const Icon(Icons.auto_awesome,
                  color: AgentCloudTheme.primaryLight, size: 20),
            ),
            const SizedBox(width: 12),
            const Text('AgentCloud'),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Installa CLI & Estensione',
            icon: const Icon(Icons.install_desktop_rounded,
                color: AgentCloudTheme.textSecondary),
            onPressed: () => Navigator.push(context,
                MaterialPageRoute(builder: (_) => const InstallScreen())),
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Banner
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                  colors: [Color(0xFF1E1B4B), Color(0xFF312E81)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFF4338CA)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Ecosistema AgentCloud',
                    style: TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                const Text(
                    'Gestisci ed esegui i tuoi agenti autonomi in mobilità con connessione real-time.',
                    style: TextStyle(
                        color: Color(0xFFC7D2FE), fontSize: 13, height: 1.4)),
                const SizedBox(height: 16),
                Wrap(
                  spacing: 12,
                  runSpacing: 8,
                  children: [
                    ElevatedButton.icon(
                      onPressed: () => Navigator.push(
                          context,
                          MaterialPageRoute(
                              builder: (_) => const ChatScreen(
                                  agentSlug: 'support-agent'))),
                      icon: const Icon(Icons.chat_bubble_outline_rounded,
                          size: 18),
                      label: const Text('Avvia Chat Rapida'),
                      style: ElevatedButton.styleFrom(
                          backgroundColor: AgentCloudTheme.primary,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10))),
                    ),
                    OutlinedButton.icon(
                      onPressed: () => Navigator.push(
                          context,
                          MaterialPageRoute(
                              builder: (_) => const InstallScreen())),
                      icon: const Icon(Icons.download_rounded, size: 18),
                      label: const Text('Installa CLI'),
                      style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.white,
                          side: const BorderSide(color: Color(0xFF6366F1)),
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10))),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          // Stats
          Row(
            children: [
              _stat('Agenti', '${agents.length}', Icons.smart_toy),
              const SizedBox(width: 10),
              _stat('Attivi', '${agents.where((a) => a.active).length}',
                  Icons.check_circle),
              const SizedBox(width: 10),
              Consumer<CartService>(
                  builder: (_, cart, __) =>
                      _stat('Carrello', '${cart.count}', Icons.shopping_cart)),
            ],
          ),
          const SizedBox(height: 20),
          const Text('I tuoi Agenti AI',
              style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: AgentCloudTheme.textPrimary)),
          const SizedBox(height: 12),
          ...agents.map((agent) {
            final isAvailable = agent.active;
            return Card(
              margin: const EdgeInsets.only(bottom: 10),
              child: ListTile(
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                      color: agent.accent.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(12)),
                  child: Icon(agent.icon, color: agent.accent),
                ),
                title: Text(agent.name,
                    style: const TextStyle(
                        fontWeight: FontWeight.w600, color: Colors.white)),
                subtitle: Text(agent.description,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        color: AgentCloudTheme.textMuted, fontSize: 12)),
                trailing: Chip(
                  label: Text(isAvailable ? 'Attivo' : 'Presto',
                      style: TextStyle(
                          fontSize: 11,
                          color: isAvailable
                              ? const Color(0xFF34D399)
                              : AgentCloudTheme.textMuted)),
                  backgroundColor: isAvailable
                      ? const Color(0xFF064E3B).withValues(alpha: 0.5)
                      : AgentCloudTheme.surface,
                  padding: EdgeInsets.zero,
                ),
                onTap: isAvailable
                    ? () => Navigator.push(
                        context,
                        MaterialPageRoute(
                            builder: (_) => ChatScreen(agentSlug: agent.slug)))
                    : null,
              ),
            );
          }),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
                color: AgentCloudTheme.surfaceCard,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AgentCloudTheme.surfaceBorder)),
            child: const Row(children: [
              Icon(Icons.info_outline,
                  size: 16, color: AgentCloudTheme.textMuted),
              SizedBox(width: 8),
              Expanded(
                  child: Text(
                      'Tocca un agente per chattare, o vai su Marketplace per acquistarne di nuovi.',
                      style: TextStyle(
                          color: AgentCloudTheme.textSecondary, fontSize: 12))),
            ]),
          ),
        ],
      ),
    );
  }

  Widget _stat(String label, String value, IconData icon) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
            color: AgentCloudTheme.surfaceCard,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AgentCloudTheme.surfaceBorder)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Icon(icon, size: 16, color: AgentCloudTheme.primaryLight),
          const SizedBox(height: 6),
          Text(value,
              style: const TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.w800)),
          Text(label,
              style: const TextStyle(
                  color: AgentCloudTheme.textMuted,
                  fontSize: 11,
                  fontWeight: FontWeight.w600)),
        ]),
      ),
    );
  }
}
