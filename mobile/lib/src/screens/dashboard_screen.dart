import 'package:flutter/material.dart';

import '../theme/theme.dart';
import 'chat_screen.dart';
import 'install_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final List<Map<String, dynamic>> _agents = [
    {
      'slug': 'email-assistant',
      'name': 'Email Assistant',
      'role': 'Automazione Inbox & Follow-up',
      'icon': Icons.mail_outline_rounded,
      'status': 'Attivo',
    },
    {
      'slug': 'support-agent',
      'name': 'Customer Support',
      'role': 'Risoluzione Ticket 24/7',
      'icon': Icons.support_agent_rounded,
      'status': 'Attivo',
    },
    {
      'slug': 'lead-qualifier',
      'name': 'Lead Qualifier',
      'role': 'Scoring e Qualifica CRM',
      'icon': Icons.filter_alt_outlined,
      'status': 'In arrivo',
    },
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AgentCloudTheme.primary.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(
                Icons.auto_awesome,
                color: AgentCloudTheme.primaryLight,
                size: 20,
              ),
            ),
            const SizedBox(width: 12),
            const Text('AgentCloud'),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Installa CLI & Estensione',
            icon: const Icon(Icons.install_desktop_rounded, color: AgentCloudTheme.textSecondary),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const InstallScreen()),
              );
            },
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          // Banner di stato
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF1E1B4B), Color(0xFF312E81)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFF4338CA)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Ecosistema AgentCloud',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Gestisci ed esegui i tuoi agenti autonomi in mobilità con connessione real-time.',
                  style: TextStyle(color: Color(0xFFC7D2FE), fontSize: 14),
                ),
                const SizedBox(height: 16),
                Wrap(
                  spacing: 12,
                  runSpacing: 8,
                  children: [
                    ElevatedButton.icon(
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) =>
                                const ChatScreen(agentSlug: 'support-agent'),
                          ),
                        );
                      },
                      icon: const Icon(Icons.chat_bubble_outline_rounded, size: 18),
                      label: const Text('Avvia Chat Rapida'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AgentCloudTheme.primary,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                    ),
                    OutlinedButton.icon(
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => const InstallScreen(),
                          ),
                        );
                      },
                      icon: const Icon(Icons.download_rounded, size: 18),
                      label: const Text('Installa CLI / Estensione'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.white,
                        side: const BorderSide(color: Color(0xFF6366F1)),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          const Text(
            'I tuoi Agenti AI',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: AgentCloudTheme.textPrimary,
            ),
          ),
          const SizedBox(height: 12),
          ..._agents.map((agent) {
            final isAvailable = agent['status'] == 'Attivo';
            return Card(
              margin: const EdgeInsets.only(bottom: 12),
              child: ListTile(
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 8,
                ),
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AgentCloudTheme.surface,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    agent['icon'] as IconData,
                    color: AgentCloudTheme.primaryLight,
                  ),
                ),
                title: Text(
                  agent['name'] as String,
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
                subtitle: Text(
                  agent['role'] as String,
                  style: const TextStyle(
                    color: AgentCloudTheme.textMuted,
                    fontSize: 13,
                  ),
                ),
                trailing: Chip(
                  label: Text(
                    agent['status'] as String,
                    style: TextStyle(
                      fontSize: 11,
                      color: isAvailable
                          ? const Color(0xFF34D399)
                          : AgentCloudTheme.textMuted,
                    ),
                  ),
                  backgroundColor: isAvailable
                      ? const Color(0xFF064E3B).withValues(alpha: 0.5)
                      : AgentCloudTheme.surface,
                  padding: EdgeInsets.zero,
                ),
                onTap: isAvailable
                    ? () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) =>
                                ChatScreen(agentSlug: agent['slug'] as String),
                          ),
                        );
                      }
                    : null,
              ),
            );
          }),
        ],
      ),
    );
  }
}
