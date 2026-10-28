import 'package:flutter/material.dart';

import '../../models/agent.dart';
import '../../services/conversation_service.dart';
import '../../theme/theme.dart';
import 'chat_screen.dart';

/// Lista chat: le conversazioni salvate (stessa semantica della sidebar
/// della chat web, persistite in locale) sopra, il selettore degli agenti
/// sotto. Si ricarica al ritorno da una chat: conversazioni nuove o
/// rintracciate aggiornano subito l'elenco.
class ChatListScreen extends StatefulWidget {
  const ChatListScreen({super.key});
  @override
  State<ChatListScreen> createState() => _ChatListScreenState();
}

class _ChatListScreenState extends State<ChatListScreen> {
  final ConversationService _store = ConversationService();
  List<Conversation>? _conversations;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  Future<void> _reload() async {
    final list = await _store.load();
    if (!mounted) return;
    setState(() => _conversations = list);
  }

  Future<void> _openConversation(Conversation conv) async {
    await Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => ChatScreen(agentSlug: conv.agentSlug, resume: conv)),
    );
    _reload();
  }

  /// Apre una chat nuova; alla chiusura la storia si aggiorna.
  Future<void> _openChat(String slug) async {
    await Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => ChatScreen(agentSlug: slug)),
    );
    _reload();
  }

  @override
  Widget build(BuildContext context) {
    final agents = Agent.all.where((a) => a.active).toList();
    final conversations = _conversations;
    return Scaffold(
      appBar: AppBar(title: const Text('Chat AI')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(gradient: const LinearGradient(colors: [Color(0xFF1E1B4B), Color(0xFF312E81)]), borderRadius: BorderRadius.circular(16)),
            child: const Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Chatta con i tuoi agenti', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
              SizedBox(height: 6),
              Text('Ogni agente ha memoria della conversazione e accesso ai tuoi strumenti collegati.', style: TextStyle(color: Color(0xFFC7D2FE), fontSize: 12)),
            ]),
          ),
          const SizedBox(height: 16),

          // Conversazioni salvate (mini-cronologia, come la sidebar web).
          if (conversations != null && conversations.isNotEmpty) ...[
            Row(
              children: [
                const Expanded(
                  child: Text('Recenti', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                ),
                TextButton(
                  onPressed: () async {
                    final confirmed = await showDialog<bool>(
                      context: context,
                      builder: (ctx) => AlertDialog(
                        backgroundColor: AgentCloudTheme.surfaceCard,
                        title: const Text('Svuota la cronologia?', style: TextStyle(color: Colors.white, fontSize: 16)),
                        content: const Text('Tutte le conversazioni salvate su questo dispositivo verranno eliminate.', style: TextStyle(color: AgentCloudTheme.textSecondary, fontSize: 13)),
                        actions: [
                          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annulla')),
                          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Elimina', style: TextStyle(color: Colors.redAccent))),
                        ],
                      ),
                    );
                    if (confirmed != true) return;
                    await _store.clearAll();
                    _reload();
                  },
                  child: const Text('Svuota', style: TextStyle(fontSize: 12)),
                ),
              ],
            ),
            const SizedBox(height: 4),
            ...conversations.map((conv) => Card(
                  child: ListTile(
                    leading: Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: (Agent.bySlug(conv.agentSlug)?.accent ?? AgentCloudTheme.primary).withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(
                        Agent.bySlug(conv.agentSlug)?.icon ?? Icons.auto_awesome,
                        color: Agent.bySlug(conv.agentSlug)?.accent ?? AgentCloudTheme.primaryLight,
                      ),
                    ),
                    title: Text(conv.title, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600), maxLines: 1, overflow: TextOverflow.ellipsis),
                    subtitle: Text(
                      '${conv.messages.length} messaggi · ${Agent.bySlug(conv.agentSlug)?.name ?? conv.agentSlug}',
                      style: const TextStyle(color: AgentCloudTheme.textMuted, fontSize: 12),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    trailing: const Icon(Icons.arrow_forward_ios, size: 14, color: AgentCloudTheme.textMuted),
                    onTap: () => _openConversation(conv),
                  ),
                )),
            const SizedBox(height: 12),
            const Text('Nuova chat', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
            const SizedBox(height: 12),
          ] else ...[
            const Text('Scegli un agente', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
            const SizedBox(height: 12),
          ],
          ...agents.map((a) => Card(
                child: ListTile(
                  leading: Container(padding: const EdgeInsets.all(10), decoration: BoxDecoration(color: a.accent.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(12)), child: Icon(a.icon, color: a.accent)),
                  title: Text(a.name, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                  subtitle: Text(a.category, style: const TextStyle(color: AgentCloudTheme.textMuted, fontSize: 12)),
                  trailing: const Icon(Icons.arrow_forward_ios, size: 14, color: AgentCloudTheme.textMuted),
                  onTap: () => _openChat(a.slug),
                ),
              )),
          const SizedBox(height: 12),
          Card(
            child: ListTile(
              leading: Container(padding: const EdgeInsets.all(10), decoration: BoxDecoration(color: AgentCloudTheme.surface, borderRadius: BorderRadius.circular(12)), child: const Icon(Icons.auto_awesome, color: AgentCloudTheme.textSecondary)),
              title: const Text('Chat generica', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
              subtitle: const Text('Parla con il router: instrada al giusto agente', style: TextStyle(color: AgentCloudTheme.textMuted, fontSize: 12)),
              trailing: const Icon(Icons.arrow_forward_ios, size: 14, color: AgentCloudTheme.textMuted),
              onTap: () => _openChat('general'),
            ),
          ),
        ],
      ),
    );
  }
}
