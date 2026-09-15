import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../theme/theme.dart';

class InstallScreen extends StatelessWidget {
  const InstallScreen({super.key});

  static const String cliInstallCommand = 'npm install -g @agentcloud/cli';
  static const String cliNpxCommand = 'npx @agentcloud/cli login';
  static const String extensionUrl = 'https://agentcloud.agency/install#extension';
  static const String cliDocsUrl = 'https://agentcloud.agency/docs/cli';

  void _copyToClipboard(BuildContext context, String text, String message) {
    Clipboard.setData(ClipboardData(text: text));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.check_circle_rounded, color: Colors.white, size: 20),
            const SizedBox(width: 8),
            Text(message),
          ],
        ),
        backgroundColor: const Color(0xFF10B981),
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 2),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Installa Ecosistema'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          // Header Banner
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
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AgentCloudTheme.primary.withValues(alpha: 0.3),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.hub_rounded, color: Colors.white, size: 24),
                    ),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Text(
                        'Ecosistema AgentCloud',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                const Text(
                  'Usa AgentCloud ovunque: nel terminale con la CLI, nel browser con l\'estensione Chrome e in mobilità con l\'app Flutter.',
                  style: TextStyle(color: Color(0xFFC7D2FE), fontSize: 13, height: 1.4),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // CLI Card
          _buildCard(
            context: context,
            title: 'AgentCloud CLI',
            subtitle: 'Controlla ed esegui i tuoi agenti direttamente dal tuo terminale.',
            icon: Icons.terminal_rounded,
            accentColor: AgentCloudTheme.primaryLight,
            children: [
              const Text(
                'Comando di installazione globale:',
                style: TextStyle(color: AgentCloudTheme.textSecondary, fontSize: 12),
              ),
              const SizedBox(height: 8),
              _buildCodeSnippet(
                context: context,
                code: cliInstallCommand,
                copyMessage: 'Comando installazione CLI copiato!',
              ),
              const SizedBox(height: 12),
              const Text(
                'Oppure avvio rapido con npx:',
                style: TextStyle(color: AgentCloudTheme.textSecondary, fontSize: 12),
              ),
              const SizedBox(height: 8),
              _buildCodeSnippet(
                context: context,
                code: cliNpxCommand,
                copyMessage: 'Comando npx copiato!',
              ),
              const SizedBox(height: 16),
              OutlinedButton.icon(
                onPressed: () => _copyToClipboard(
                  context,
                  cliDocsUrl,
                  'URL documentazione CLI copiato!',
                ),
                icon: const Icon(Icons.link_rounded, size: 16),
                label: const Text('Copia URL Documentazione CLI'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AgentCloudTheme.primaryLight,
                  side: const BorderSide(color: AgentCloudTheme.surfaceBorder),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ],
          ),

          const SizedBox(height: 20),

          // Chrome Extension Card
          _buildCard(
            context: context,
            title: 'Estensione Chrome',
            subtitle: 'Automazioni web, analisi pagine e interazioni con un clic nel browser.',
            icon: Icons.extension_rounded,
            accentColor: AgentCloudTheme.accentCyan,
            children: [
              const Text(
                'Aggiungi l\'estensione al tuo browser Chromium (Chrome, Edge, Brave):',
                style: TextStyle(color: AgentCloudTheme.textSecondary, fontSize: 12),
              ),
              const SizedBox(height: 12),
              _buildCodeSnippet(
                context: context,
                code: extensionUrl,
                copyMessage: 'URL estensione Chrome copiato!',
              ),
              const SizedBox(height: 16),
              ElevatedButton.icon(
                onPressed: () => _copyToClipboard(
                  context,
                  extensionUrl,
                  'URL di installazione estensione copiato!',
                ),
                icon: const Icon(Icons.content_copy_rounded, size: 16),
                label: const Text('Copia Link Estensione Chrome'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AgentCloudTheme.accentCyan,
                  foregroundColor: Colors.black,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ],
          ),

          const SizedBox(height: 20),

          // API Key Integration Guide
          _buildCard(
            context: context,
            title: 'Come collegare gli strumenti',
            subtitle: 'Autentica la CLI e l\'estensione con la tua API Key AgentCloud.',
            icon: Icons.key_rounded,
            accentColor: const Color(0xFFF59E0B),
            children: [
              const Text(
                '1. Genera o copia la tua chiave segreta dalla dashboard web (Impostazioni > API Key).\n'
                '2. Nella CLI esegui: agentcloud login --key <TUA_CHIAVE>\n'
                '3. Nell\'estensione Chrome incolla la chiave nel popup delle impostazioni.',
                style: TextStyle(
                  color: AgentCloudTheme.textSecondary,
                  fontSize: 13,
                  height: 1.5,
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildCard({
    required BuildContext context,
    required String title,
    required String subtitle,
    required IconData icon,
    required Color accentColor,
    required List<Widget> children,
  }) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AgentCloudTheme.surfaceCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AgentCloudTheme.surfaceBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: accentColor.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: accentColor, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: AgentCloudTheme.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: const TextStyle(
                        fontSize: 12,
                        color: AgentCloudTheme.textMuted,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          ...children,
        ],
      ),
    );
  }

  Widget _buildCodeSnippet({
    required BuildContext context,
    required String code,
    required String copyMessage,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: AgentCloudTheme.surface,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AgentCloudTheme.surfaceBorder),
      ),
      child: Row(
        children: [
          Expanded(
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Text(
                code,
                style: const TextStyle(
                  fontFamily: 'monospace',
                  fontSize: 13,
                  color: AgentCloudTheme.textPrimary,
                ),
              ),
            ),
          ),
          const SizedBox(width: 8),
          IconButton(
            icon: const Icon(Icons.copy_rounded, size: 18, color: AgentCloudTheme.textSecondary),
            splashRadius: 18,
            tooltip: 'Copia negli appunti',
            onPressed: () => _copyToClipboard(context, code, copyMessage),
          ),
        ],
      ),
    );
  }
}
