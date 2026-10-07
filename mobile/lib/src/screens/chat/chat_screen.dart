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
  // Cronologia dei turni completati: il client invia `history + prompt corrente`.
  final List<Map<String, String>> _history = [];
  final AgentCloudClient _client = AgentCloudClient();
  bool _isLoading = false;
  String? _activity;

  /// Conferma umana in attesa: il server ha messo in pausa la run. Salviamo
  /// token firmato + il body esatto con cui riprenderla (stessa semantica web).
  Map<String, dynamic>? _pending;

  void _sendMessage() {
    final text = _controller.text.trim();
    if (text.isEmpty || _isLoading) return;
    _controller.clear();
    setState(() {
      _messages.add({'sender': 'user', 'text': text});
    });
    final history = List<Map<String, String>>.from(_history);
    _history.add({'role': 'user', 'content': text});
    _run(prompt: text, history: history);
  }

  /// Esegue (o riprende) una run mostrando testo, tool e richieste di connessione.
  Future<void> _run({
    required String prompt,
    required List<Map<String, String>> history,
    String? approvalToken,
  }) async {
    setState(() {
      _isLoading = true;
      _pending = null;
      _activity = null;
    });
    try {
      final res = await _client.runAgent(
        agentSlug: widget.agentSlug,
        prompt: prompt,
        history: history,
        approvalToken: approvalToken,
        onEvent: _onEvent,
      );

      if (res.pendingApproval != null) {
        // Run in pausa: la UI mostra Approva/Annulla e conserva come riprenderla.
        setState(() {
          _pending = {
            'token': res.pendingApproval!.token,
            'toolName': res.pendingApproval!.toolName,
            'prompt': prompt,
            'history': history,
          };
        });
      }
      if (res.output.isNotEmpty) {
        setState(() {
          _messages.add({'sender': 'agent', 'text': res.output});
        });
        _history.add({'role': 'assistant', 'content': res.output});
      } else if (res.pendingApproval == null) {
        setState(() {
          _messages.add({'sender': 'agent', 'text': 'Azione completata.'});
        });
        _history.add({'role': 'assistant', 'content': 'Azione completata.'});
      }
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
        _activity = null;
      });
    }
  }

  /// Eventi operativi dello stream: tool in esecuzione e richieste di connessione.
  void _onEvent(Map<String, dynamic> event) {
    final type = event['type'];
    if (type == 'tool_start') {
      setState(() => _activity = 'Uso ${event['toolName'] ?? 'uno strumento'}…');
    } else if (type == 'tool_done') {
      setState(() => _activity = 'Completato ${event['toolName'] ?? 'strumento'}.');
    } else if (type == 'connection' && event['provider'] is String) {
      // La connessione OAuth si completa sul sito.
      setState(() => _activity = 'Connessione richiesta (${event['provider']}): completala dal sito.');
    }
  }

  /// Approva il tool in attesa e riprende la run con il token firmato.
  Future<void> _approve() async {
    final pending = _pending;
    if (pending == null) return;
    final prompt = pending['prompt'] as String;
    final history = (pending['history'] as List).cast<Map<String, String>>();
    final token = pending['token'] as String;
    setState(() => _pending = null);
    await _run(prompt: prompt, history: history, approvalToken: token);
  }

  /// Annulla: nessun tool eseguito, la chat torna disponibile.
  void _deny() {
    if (_pending == null) return;
    setState(() {
      _pending = null;
      _messages.add({
        'sender': 'agent',
        'text': 'Operazione annullata: nessuna modifica è stata applicata.',
      });
    });
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
          if (_pending != null)
            Container(
              width: double.infinity,
              margin: const EdgeInsets.fromLTRB(16, 0, 16, 8),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFF2E2712),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFF6B5520)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '"${_pending!['toolName']}" modifica un contenuto esistente. Approvare l\'operazione?',
                    style: const TextStyle(color: Color(0xFFF2D98A), fontSize: 12),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      ElevatedButton(
                        onPressed: _approve,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AgentCloudTheme.primary,
                          foregroundColor: Colors.white,
                        ),
                        child: const Text('Approva'),
                      ),
                      const SizedBox(width: 8),
                      TextButton(
                        onPressed: _deny,
                        child: const Text('Annulla', style: TextStyle(color: Color(0xFFD8C07A))),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          if (_isLoading)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Column(
                children: [
                  if (_activity != null)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 6),
                      child: Text(
                        _activity!,
                        style: const TextStyle(color: AgentCloudTheme.textMuted, fontSize: 11),
                      ),
                    ),
                  const LinearProgressIndicator(
                    backgroundColor: AgentCloudTheme.surface,
                    color: AgentCloudTheme.primary,
                  ),
                ],
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
                  onPressed: _isLoading ? null : _sendMessage,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
