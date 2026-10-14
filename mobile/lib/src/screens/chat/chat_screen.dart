import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../theme/theme.dart';
import '../../api/agentcloud_client.dart';
import '../../chat/chat_files.dart';
import 'file_preview_screen.dart';

/// Messaggio in chat: testo già pulito dai blocchi file + card allegate.
class _ChatMessage {
  final String sender;
  final String text;
  final List<ChatFileBlock> files;

  const _ChatMessage({required this.sender, required this.text, this.files = const []});
}

class ChatScreen extends StatefulWidget {
  final String agentSlug;

  const ChatScreen({super.key, required this.agentSlug});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final TextEditingController _controller = TextEditingController();
  final List<_ChatMessage> _messages = [];
  // Cronologia dei turni completati: il client invia `history + prompt corrente`.
  final List<Map<String, String>> _history = [];
  final AgentCloudClient _client = AgentCloudClient();
  bool _isLoading = false;
  bool _sharing = false;
  String? _activity;
  // Provider in attesa di connessione (evento `connection` del server).
  String? _pendingProvider;

  /// Conferma umana in attesa: il server ha messo in pausa la run. Salviamo
  /// token firmato + il body esatto con cui riprenderla (stessa semantica web).
  Map<String, dynamic>? _pending;

  void _sendMessage() {
    final text = _controller.text.trim();
    if (text.isEmpty || _isLoading) return;
    _controller.clear();
    setState(() {
      _messages.add(_ChatMessage(sender: 'user', text: text));
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
      _pendingProvider = null;
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
        final parsed = parseChatFiles(stripConnectMarkers(res.output));
        setState(() {
          _messages.add(_ChatMessage(sender: 'agent', text: parsed.text, files: parsed.files));
        });
        _history.add({'role': 'assistant', 'content': res.output});
      } else if (res.pendingApproval == null) {
        setState(() {
          _messages.add(const _ChatMessage(sender: 'agent', text: 'Azione completata.'));
        });
        _history.add({'role': 'assistant', 'content': 'Azione completata.'});
      }
    } catch (e) {
      setState(() {
        _messages.add(_ChatMessage(
          sender: 'agent',
          text: 'Errore durante l\'esecuzione: $e',
        ));
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
      // La connessione OAuth si completa nel browser: banner con deep-link,
      // come la card inline della chat web.
      setState(() => _pendingProvider = event['provider'] as String);
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
      _messages.add(const _ChatMessage(
        sender: 'agent',
        text: 'Operazione annullata: nessuna modifica è stata applicata.',
      ));
    });
  }

  /// Apre il flusso OAuth nel browser esterno.
  Future<void> _connect(String provider) async {
    final url = AgentCloudClient.connectUrlFor(_client.baseUrl, provider);
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  /// Crea il link di condivisione in sola lettura e lo copia.
  Future<void> _share() async {
    if (_sharing || _messages.isEmpty) return;
    setState(() => _sharing = true);
    try {
      final url = await _client.shareChat(
        title: 'Chat ${widget.agentSlug}',
        messages: [
          for (final m in _messages)
            {
              'role': m.sender == 'user' ? 'user' : 'assistant',
              'content': m.text,
              if (m.sender != 'user') 'agentSlug': widget.agentSlug,
            },
        ],
      );
      await Clipboard.setData(ClipboardData(text: url));
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Link copiato (sola lettura): $url')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Condivisione fallita: $e')),
      );
    } finally {
      if (mounted) setState(() => _sharing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Chat: ${widget.agentSlug}'),
        actions: [
          if (_messages.isNotEmpty)
            _sharing
                ? const Padding(
                    padding: EdgeInsets.all(16),
                    child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)),
                  )
                : IconButton(
                    icon: const Icon(Icons.share_outlined, size: 20),
                    tooltip: 'Condividi (sola lettura)',
                    onPressed: _share,
                  ),
        ],
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
                      final isUser = msg.sender == 'user';
                      return Align(
                        alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
                        child: ConstrainedBox(
                          constraints: BoxConstraints(
                            maxWidth: MediaQuery.of(context).size.width * 0.85,
                          ),
                          child: Column(
                            crossAxisAlignment: isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                            children: [
                              Container(
                                margin: const EdgeInsets.only(bottom: 4),
                                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                                decoration: BoxDecoration(
                                  color: isUser ? AgentCloudTheme.primary : AgentCloudTheme.surfaceCard,
                                  borderRadius: BorderRadius.circular(16),
                                  border: isUser
                                      ? null
                                      : Border.all(color: AgentCloudTheme.surfaceBorder),
                                ),
                                child: isUser
                                    ? Text(
                                        msg.text,
                                        style: const TextStyle(color: AgentCloudTheme.textPrimary),
                                      )
                                    : MarkdownBody(
                                        data: msg.text.isEmpty ? '…' : msg.text,
                                        selectable: true,
                                        styleSheet: MarkdownStyleSheet(
                                          p: const TextStyle(color: AgentCloudTheme.textPrimary, fontSize: 14, height: 1.5),
                                          listBullet: const TextStyle(color: AgentCloudTheme.textPrimary),
                                          code: const TextStyle(color: Color(0xFF6EE7B7), fontSize: 12),
                                          a: const TextStyle(color: AgentCloudTheme.primaryLight),
                                        ),
                                      ),
                              ),
                              for (final f in msg.files)
                                _FileCard(
                                  file: f,
                                  onOpen: () => Navigator.push(
                                    context,
                                    MaterialPageRoute(builder: (_) => FilePreviewScreen(file: f)),
                                  ),
                                ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),
          if (_pendingProvider != null)
            Container(
              width: double.infinity,
              margin: const EdgeInsets.fromLTRB(16, 0, 16, 8),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AgentCloudTheme.surfaceCard,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AgentCloudTheme.primary),
              ),
              child: Row(
                children: [
                  const Icon(Icons.link, size: 18, color: AgentCloudTheme.primaryLight),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Collega ${_pendingProvider!} per continuare.',
                      style: const TextStyle(color: AgentCloudTheme.textPrimary, fontSize: 12),
                    ),
                  ),
                  TextButton(
                    onPressed: () => _connect(_pendingProvider!),
                    child: const Text('Collega'),
                  ),
                ],
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

/// Card di un file generato: tap per l'anteprima (come la card web).
class _FileCard extends StatelessWidget {
  final ChatFileBlock file;
  final VoidCallback onOpen;

  const _FileCard({required this.file, required this.onOpen});

  @override
  Widget build(BuildContext context) {
    final isHtml = file.type == 'html';
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        onTap: onOpen,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            color: AgentCloudTheme.surfaceCard,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AgentCloudTheme.primary),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                isHtml ? Icons.web_asset : Icons.insert_drive_file_outlined,
                size: 16,
                color: AgentCloudTheme.primaryLight,
              ),
              const SizedBox(width: 8),
              Flexible(
                child: Text(
                  file.title ?? file.name,
                  style: const TextStyle(color: AgentCloudTheme.textPrimary, fontSize: 12, fontWeight: FontWeight.w600),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 4),
              const Icon(Icons.open_in_new, size: 14, color: AgentCloudTheme.textMuted),
            ],
          ),
        ),
      ),
    );
  }
}
