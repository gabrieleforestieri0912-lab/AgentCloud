import 'package:flutter/material.dart';
import '../../theme/theme.dart';
import '../../api/agentcloud_client.dart';

class ChatScreen extends StatefulWidget {
  final String agentSlug;

  const ChatScreen({super.key, required this.agentSlug});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final TextEditingController _controller = TextEditingController();
  final List<Map<String, String>> _messages = [];
  final AgentCloudClient _client = AgentCloudClient();
  bool _isLoading = false;

  void _sendMessage() async {
    final text = _controller.text.trim();
    if (text.isEmpty || _isLoading) return;

    setState(() {
      _messages.add({'sender': 'user', 'text': text});
      _isLoading = true;
      _controller.clear();
    });

    try {
      final res = await _client.runAgent(
        agentSlug: widget.agentSlug,
        prompt: text,
      );
      final reply = res['output'] ?? res['response'] ?? 'Azione completata.';
      setState(() {
        _messages.add({'sender': 'agent', 'text': reply.toString()});
      });
    } catch (e) {
      setState(() {
        _messages.add({
          'sender': 'agent',
          'text': 'Errore durante l\'esecuzione: $e',
        });
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Chat: ${widget.agentSlug}'),
      ),
      body: Column(
        children: [
          Expanded(
            child: _messages.isEmpty
                ? const Center(
                    child: Text(
                      'Inizia una conversazione con l\'agente...',
                      style: TextStyle(color: AgentCloudTheme.textMuted),
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _messages.length,
                    itemBuilder: (context, index) {
                      final msg = _messages[index];
                      final isUser = msg['sender'] == 'user';
                      return Align(
                        alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
                        child: Container(
                          margin: const EdgeInsets.only(bottom: 12),
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          constraints: BoxConstraints(
                            maxWidth: MediaQuery.of(context).size.width * 0.75,
                          ),
                          decoration: BoxDecoration(
                            color: isUser ? AgentCloudTheme.primary : AgentCloudTheme.surfaceCard,
                            borderRadius: BorderRadius.circular(16),
                            border: isUser
                                ? null
                                : Border.all(color: AgentCloudTheme.surfaceBorder),
                          ),
                          child: Text(
                            msg['text'] ?? '',
                            style: const TextStyle(color: AgentCloudTheme.textPrimary),
                          ),
                        ),
                      );
                    },
                  ),
          ),
          if (_isLoading)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 8),
              child: LinearProgressIndicator(
                backgroundColor: AgentCloudTheme.surface,
                color: AgentCloudTheme.primary,
              ),
            ),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: const BoxDecoration(
              color: AgentCloudTheme.surface,
              border: Border(top: BorderSide(color: AgentCloudTheme.surfaceBorder)),
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _controller,
                    decoration: InputDecoration(
                      hintText: 'Scrivi un messaggio...',
                      hintStyle: const TextStyle(color: AgentCloudTheme.textMuted),
                      filled: true,
                      fillColor: AgentCloudTheme.surfaceCard,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: AgentCloudTheme.surfaceBorder),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: AgentCloudTheme.surfaceBorder),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: AgentCloudTheme.primary),
                      ),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    ),
                    onSubmitted: (_) => _sendMessage(),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  icon: const Icon(Icons.send_rounded, color: AgentCloudTheme.primary),
                  onPressed: _sendMessage,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
