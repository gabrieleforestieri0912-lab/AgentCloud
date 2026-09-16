import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../models/integration.dart';
import '../../theme/theme.dart';

class IntegrationsScreen extends StatelessWidget {
  const IntegrationsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final available = Integration.all.where((i) => i.available).toList();
    final soon = Integration.all.where((i) => !i.available).toList();
    return Scaffold(
      appBar: AppBar(title: const Text('Integrazioni')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text('Collega i tuoi strumenti — token cifrati, disconnessione 1 clic.', style: TextStyle(color: AgentCloudTheme.textSecondary)),
          const SizedBox(height: 16),
          const Text('Disponibili ora', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 3, crossAxisSpacing: 10, mainAxisSpacing: 10, childAspectRatio: 1.1),
            itemCount: available.length,
            itemBuilder: (_, i) {
              final it = available[i];
              return Container(
                decoration: BoxDecoration(color: AgentCloudTheme.surfaceCard, borderRadius: BorderRadius.circular(14), border: Border.all(color: AgentCloudTheme.surfaceBorder)),
                child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                  Icon(it.icon, color: AgentCloudTheme.primaryLight),
                  const SizedBox(height: 6),
                  Text(it.name, style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600), textAlign: TextAlign.center),
                  Container(margin: const EdgeInsets.only(top: 4), padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2), decoration: BoxDecoration(color: const Color(0xFF064E3B).withValues(alpha: 0.4), borderRadius: BorderRadius.circular(20)), child: const Text('Attivo', style: TextStyle(color: Color(0xFF6EE7B7), fontSize: 9, fontWeight: FontWeight.bold))),
                ]),
              );
            },
          ),
          const SizedBox(height: 20),
          const Text('Prossimamente', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: soon.map((it) => Chip(label: Text(it.name, style: const TextStyle(fontSize: 12)), backgroundColor: AgentCloudTheme.surfaceCard, side: const BorderSide(color: AgentCloudTheme.surfaceBorder), avatar: Icon(it.icon, size: 14, color: AgentCloudTheme.textMuted))).toList(),
          ),
          const SizedBox(height: 20),
          ElevatedButton.icon(
            onPressed: () => launchUrl(Uri.parse('https://agentcloud.agency/integrations'), mode: LaunchMode.externalApplication),
            icon: const Icon(Icons.open_in_new, size: 16),
            label: const Text('Gestisci su web'),
            style: ElevatedButton.styleFrom(backgroundColor: AgentCloudTheme.primary, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
          ),
        ],
      ),
    );
  }
}
