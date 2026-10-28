import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../theme/theme.dart';
import '../../api/agentcloud_client.dart';
import '../../chat/chat_files.dart';
import '../../services/conversation_service.dart';
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
  /// Conversazione da riprendere: la chat web porta avanti la stessa
  /// cronologia; qui viene ripopolato lo stesso thread con il suo titolo.
  final Conversation? resume;

  const ChatScreen({super.key, required this.agentSlug, this.resume});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final TextEditingController _controller = TextEditingController();
  final ScrollController _scroll = ScrollController();
  final ConversationService _conversationStore = ConversationService();
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

  /// Streaming-like: mentre la run gira accumuliamo qui il testo già
  /// ricevuto (eventi `text`) e lo mostriamo in una bolla viva — prima la
  /// risposta compariva solo a run conclusa, a schermo nero per decine di
  /// secondi. Risorsa come la web che streama token per token.
  String _streamingText = '';

  /// Generazione in corso: il campo indica che l'utente ha premuto "Interrompi"
  /// e serve a ignorare i successivi eventi/messaggi della run abbandonata.
  /// (Il package `http` non espone un abort forzato del body SSE: lo stop è
  /// "cessate le attività" lato UI, il server completa la sua run in pace.)
  bool _stopping = false;

  /// Epoca della run corrente: ogni nuovo avvio e ogni stop incrementano il
  /// contatore. Le Future della run abbandonata (che comunque completa)
  /// controllano l'epoca prima di toccare lo stato: se è cambiato, sono
  /// stantie e non aggiungono messaggi doppi. È il modo standard di
  /// annullare richieste async in Dart senza abort di connessione.
  int _runEpoch = 0;

  /// Conversazione corrente (solo in RAM finché possibile): con il primo
  /// messaggio riceve un titolo e viene salvata nel negozio locale.
  Conversation? _conversation;
  late final String _agentSlug = widget.resume?.agentSlug ?? widget.agentSlug;

  @override
  void initState() {
    super.initState();
    final resume = widget.resume;
    if (resume != null) {
      // Ripresa di una conversazione salvata: cronologia completa.
      _conversation = resume;
      for (final m in resume.messages) {
        final parsed = parseChatFiles(stripConnectMarkers(m.content));
        _messages.add(_ChatMessage(
          sender: m.role,
          text: parsed.text,
          files: parsed.files,
        ));
        _history.add({'role': m.role, 'content': m.content});
      }
    }
    // Scroll al fondo appena il primo frame è pronto (conversazioni riprese).
    WidgetsBinding.instance.addPostFrameCallback((_) => _scrollDown());
  }

  @override
  void dispose() {
    _controller.dispose();
    _scroll.dispose();
    super.dispose();
  }

  void _scrollDown() {
    if (!_scroll.hasClients) return;
    _scroll.animateTo(
      _scroll.position.maxScrollExtent,
      duration: const Duration(milliseconds: 250),
      curve: Curves.easeOut,
    );
  }

  String _newConvId() =>
      'conv_${DateTime.now().microsecondsSinceEpoch}_${Random().nextInt(1 << 32)}';

  /// Salva (o crea) la conversazione corrente nel negozio locale.
  Future<void> _persistConversation() async {
    if (_history.isEmpty) return;
    final now = DateTime.now();
    final conv = (_conversation ??
        Conversation(
          id: _newConvId(),
          title: ConversationService.titleFrom(_history.first['content'] ?? ''),
          agentSlug: _agentSlug,
          messages: const [],
          createdAt: now,
          updatedAt: now,
        ))
        .copyWith(
          messages: [for (final m in _history) ConversationMessage(role: m['role']!, content: m['content']!)],
          updatedAt: now,
        );
    _conversation = conv;
    await _conversationStore.save(conv);
  }

  void _sendMessage() {
    final text = _controller.text.trim();
    if (text.isEmpty || _isLoading) return;
    _controller.clear();
    setState(() {
      _messages.add(_ChatMessage(sender: 'user', text: text));
    });
    final history = List<Map<String, String>>.from(_history);
    _history.add({'role': 'user', 'content': text});
    _scrollDown();
    _run(prompt: text, history: history);
  }

  /// Esegue (o riprende) una run mostrando testo, tool e richieste di connessione.
  Future<void> _run({
    required String prompt,
    required List<Map<String, String>> history,
    String? approvalToken,
  }) async {
    final epoch = ++_runEpoch;
    setState(() {
      _isLoading = true;
      _stopping = false;
      _pending = null;
      _activity = null;
      _pendingProvider = null;
      _streamingText = '';
    });
    try {
      final res = await _client.runAgent(
        agentSlug: _agentSlug,
        prompt: prompt,
        history: history,
        approvalToken: approvalToken,
        onEvent: _onEvent,
      );
      // Stop dell'utente: la run abbandonata è tentata, non tocca lo stato.
      if (epoch != _runEpoch) return;

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
          _streamingText = '';
        });
        _history.add({'role': 'assistant', 'content': res.output});
      } else if (res.pendingApproval == null) {
        setState(() {
          _messages.add(const _ChatMessage(sender: 'agent', text: 'Azione completata.'));
          _streamingText = '';
        });
        _history.add({'role': 'assistant', 'content': 'Azione completata.'});
      }
      await _persistConversation();
    } catch (e) {
      if (epoch != _runEpoch) return;
      setState(() {
        _messages.add(_ChatMessage(
          sender: 'agent',
          text: 'Errore durante l\'esecuzione: $e',
        ));
        _streamingText = '';
      });
    } finally {
      // L'aggiornamento "run finita" va solo se questa Future è ancora la
      // run attiva (uno stop la forza a false da subito, senza aspettare).
      if (mounted && epoch == _runEpoch) {
        setState(() {
          _isLoading = false;
          _activity = null;
        });
        _scrollDown();
      }
    }
  }

  /// Interrompe la generazione in corso (come il bottone web "Interrompi").
  /// Non c'è un abort forzato del body SSE nel package `http`: qui si
  /// finalizza subito ciò che è arrivato (partial text promosso a messaggio)
  /// e la run abbandonata, quando chiude, scopre cambia l'epoca e non tocca
  /// più lo stato.
  void _stop() {
    if (!_isLoading) return;
    // Le Future della run abbandonata vedranno l'epoca cambiata e si
    // auto-disattiveranno (cfr. _run).
    _runEpoch++;
    final partial = _streamingText;
    setState(() {
      _stopping = true;
      _isLoading = false;
      _activity = null;
      if (partial.trim().isNotEmpty) {
        final parsed = parseChatFiles(stripConnectMarkers(partial));
        _messages.add(_ChatMessage(
          sender: 'agent',
          text: '${parsed.text}\n\n*generazione interrotta.*',
          files: parsed.files,
        ));
        _history.add({'role': 'assistant', 'content': partial});
        _streamingText = '';
      } else {
        _messages.add(const _ChatMessage(sender: 'agent', text: 'Generazione interrotta.'));
        _history.add({'role': 'assistant', 'content': 'Generazione interrotta.'});
      }
    });
    _persistConversation();
    _scrollDown();
  }

  /// Eventi operativi dello stream: testo in arrivo, tool in esecuzione e
  /// richieste di connessione. Dopo uno stop i chunk ancora in arrivo
  /// vengono ignorati: la bolla finale è già stata promossa.
  void _onEvent(Map<String, dynamic> event) {
    if (_stopping) return;
    final type = event['type'];
    if (type == 'text' && event['content'] is String) {
      // Streaming-like: accodo il chunk in una bolla viva.
      setState(() {
        _streamingText += event['content'] as String;
      });
      _scrollDown();
    } else if (type == 'tool_start') {
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
        title: _conversation?.title ?? 'Chat ${_agentNameOrSlug()}',
        messages: [
          for (final m in _messages)
            {
              'role': m.sender == 'user' ? 'user' : 'assistant',
              'content': m.text,
              if (m.sender != 'user') 'agentSlug': _agentSlug,
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
        title: Text(_conversation?.title ?? 'Chat: ${_agentNameOrSlug()}'),
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
            child: _messages.isEmpty && _streamingText.isEmpty
                ? const Center(
                    child: Text(
                      'Inizia una conversazione con l\'agente...',
                      style: TextStyle(color: AgentCloudTheme.textMuted),
                    ),
                  )
                : ListView.builder(
                    controller: _scroll,
                    padding: const EdgeInsets.all(16),
                    itemCount: _messages.length + 1,
                    itemBuilder: (context, index) {
                      // Bolla viva di streaming: mentre la run è in corso
                      // mostriamo i chunk già arrivati (eventi `text`); alla
                      // chiusura viene sostituita dal messaggio definitivo.
                      if (index == _messages.length) {
                        if (_streamingText.trim().isEmpty) {
                          return const SizedBox.shrink();
                        }
                        return Align(
                          alignment: Alignment.centerLeft,
                          child: ConstrainedBox(
                            constraints: BoxConstraints(
                              maxWidth: MediaQuery.of(context).size.width * 0.85,
                            ),
                            child: Container(
                              margin: const EdgeInsets.only(bottom: 4),
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                              decoration: BoxDecoration(
                                color: AgentCloudTheme.surfaceCard,
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(color: AgentCloudTheme.surfaceBorder),
                              ),
                              child: MarkdownBody(
                                data: _streamingText,
                                selectable: false,
                                styleSheet: MarkdownStyleSheet(
                                  p: const TextStyle(color: AgentCloudTheme.textPrimary, fontSize: 14, height: 1.5),
                                  listBullet: const TextStyle(color: AgentCloudTheme.textPrimary),
                                  code: const TextStyle(color: Color(0xFF6EE7B7), fontSize: 12),
                                  a: const TextStyle(color: AgentCloudTheme.primaryLight),
                                ),
                              ),
                            ),
                          ),
                        );
                      }
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
            padding: EdgeInsets.fromLTRB(
              16,
              8,
              16,
              8 + MediaQuery.of(context).padding.bottom,
            ),
            decoration: const BoxDecoration(
              color: AgentCloudTheme.surface,
              border: Border(top: BorderSide(color: AgentCloudTheme.surfaceBorder)),
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _controller,
                    minLines: 1,
                    maxLines: 6,
                    textCapitalization: TextCapitalization.sentences,
                    style: const TextStyle(color: AgentCloudTheme.textPrimary, fontSize: 15),
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
                if (_isLoading)
                  Tooltip(
                    message: 'Interrompi',
                    child: IconButton(
                      icon: const Icon(Icons.stop_circle_outlined, color: Color(0xFFF97316)),
                      onPressed: _stop,
                    ),
                  )
                else
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
  /// Titolo mostrato in AppBar: nome dell'agente (senza prefisso) o slug.
  String _agentNameOrSlug() {
    if (_agentSlug == 'general') return 'Chat generica';
    return _agentSlug;
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
