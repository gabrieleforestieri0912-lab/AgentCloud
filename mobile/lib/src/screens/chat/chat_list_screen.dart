import 'package:flutter/material.dart';
import '../../models/agent.dart';
import '../../theme/theme.dart';
import 'chat_screen.dart';

class ChatListScreen extends StatelessWidget {
  const ChatListScreen({super.key});
  @override
  Widget build(BuildContext context) {
    final agents = Agent.all.where((a) => a.active).toList();
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
          const Text('Scegli un agente', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
          const SizedBox(height: 12),
          ...agents.map((a) => Card(
            child: ListTile(
              leading: Container(padding: const EdgeInsets.all(10), decoration: BoxDecoration(color: a.accent.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(12)), child: Icon(a.icon, color: a.accent)),
              title: Text(a.name, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
              subtitle: Text(a.category, style: const TextStyle(color: AgentCloudTheme.textMuted, fontSize: 12)),
              trailing: const Icon(Icons.arrow_forward_ios, size: 14, color: AgentCloudTheme.textMuted),
              onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => ChatScreen(agentSlug: a.slug))),
            ),
          )),
          const SizedBox(height: 12),
          Card(
            child: ListTile(
              leading: Container(padding: const EdgeInsets.all(10), decoration: BoxDecoration(color: AgentCloudTheme.surface, borderRadius: BorderRadius.circular(12)), child: const Icon(Icons.auto_awesome, color: AgentCloudTheme.textSecondary)),
              title: const Text('Chat generica', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
              subtitle: const Text('Parla con il router: instrada al giusto agente', style: TextStyle(color: AgentCloudTheme.textMuted, fontSize: 12)),
              trailing: const Icon(Icons.arrow_forward_ios, size: 14, color: AgentCloudTheme.textMuted),
              onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ChatScreen(agentSlug: 'general'))),
            ),
          ),
        ],
      ),
    );
  }
}
