import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../theme/theme.dart';
import '../../providers/auth_provider.dart';
import '../../config/app_config.dart';

class AccountScreen extends StatelessWidget {
  const AccountScreen({super.key});
  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;
    return Scaffold(
      appBar: AppBar(title: const Text('Account')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: AgentCloudTheme.surfaceCard, borderRadius: BorderRadius.circular(16), border: Border.all(color: AgentCloudTheme.surfaceBorder)),
            child: Row(
              children: [
                CircleAvatar(backgroundColor: AgentCloudTheme.primary.withValues(alpha: 0.2), radius: 24, child: Text((user?.email ?? '?').substring(0, 1).toUpperCase(), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold))),
                const SizedBox(width: 12),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(user?.email ?? 'Ospite', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                  Text(user != null ? 'Accesso effettuato' : 'Non connesso', style: const TextStyle(color: AgentCloudTheme.textMuted, fontSize: 12)),
                ])),
                if (user != null)
                  IconButton(icon: const Icon(Icons.logout, color: Colors.redAccent), onPressed: () async { await auth.signOut(); }),
              ],
            ),
          ),
          const SizedBox(height: 20),
          _tile(Icons.settings, 'Impostazioni', 'Lingua, tema, notifiche', onTap: () {}),
          _tile(Icons.shopping_bag, 'I miei abbonamenti', 'Gestisci fatturazione e rinnovi', onTap: () => launchUrl(Uri.parse('${AppConfig.siteUrl}/dashboard/subscriptions'), mode: LaunchMode.externalApplication)),
          _tile(Icons.hub, 'Integrazioni', 'Collega Stripe, Notion, Slack...', onTap: () {}),
          _tile(Icons.privacy_tip_outlined, 'Privacy', 'Informativa e GDPR', onTap: () => launchUrl(Uri.parse('${AppConfig.siteUrl}/privacy'), mode: LaunchMode.externalApplication)),
          _tile(Icons.description_outlined, 'Termini', 'Termini di servizio', onTap: () => launchUrl(Uri.parse('${AppConfig.siteUrl}/terms'), mode: LaunchMode.externalApplication)),
          _tile(Icons.support_agent, 'Supporto', AppConfig.supportEmail, onTap: () => launchUrl(Uri.parse('mailto:${AppConfig.supportEmail}'))),
          const SizedBox(height: 20),
          if (user == null)
            ElevatedButton(
              onPressed: () => Navigator.pushNamed(context, '/login'),
              style: ElevatedButton.styleFrom(backgroundColor: AgentCloudTheme.primary, foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
              child: const Text('Accedi / Registrati'),
            ),
          const SizedBox(height: 12),
          const Center(child: Text('AgentCloud Mobile v1.0.0 • Flutter', style: TextStyle(color: AgentCloudTheme.textMuted, fontSize: 11))),
        ],
      ),
    );
  }

  Widget _tile(IconData icon, String title, String subtitle, {VoidCallback? onTap}) {
    return Card(
      child: ListTile(
        leading: Container(padding: const EdgeInsets.all(8), decoration: BoxDecoration(color: AgentCloudTheme.surface, borderRadius: BorderRadius.circular(10)), child: Icon(icon, color: AgentCloudTheme.primaryLight, size: 18)),
        title: Text(title, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 14)),
        subtitle: Text(subtitle, style: const TextStyle(color: AgentCloudTheme.textMuted, fontSize: 12)),
        trailing: const Icon(Icons.chevron_right, color: AgentCloudTheme.textMuted, size: 18),
        onTap: onTap,
      ),
    );
  }
}
