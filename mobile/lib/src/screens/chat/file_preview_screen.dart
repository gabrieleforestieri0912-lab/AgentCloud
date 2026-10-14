import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../../theme/theme.dart';
import '../../chat/chat_files.dart';

/// Anteprima di un file generato dall'agente (come il pannello laterale web):
/// HTML/SVG in WebView (quiz e flashcard interattivi funzionano), gli altri
/// formati come testo. Sola visualizzazione: niente modifiche.
class FilePreviewScreen extends StatefulWidget {
  final ChatFileBlock file;

  const FilePreviewScreen({super.key, required this.file});

  @override
  State<FilePreviewScreen> createState() => _FilePreviewScreenState();
}

class _FilePreviewScreenState extends State<FilePreviewScreen> {
  WebViewController? _webController;
  bool _copied = false;

  bool get _isWeb => widget.file.type == 'html' || widget.file.type == 'svg';

  @override
  void initState() {
    super.initState();
    if (_isWeb) {
      final controller = WebViewController()
        ..setJavaScriptMode(JavaScriptMode.unrestricted)
        ..setBackgroundColor(const Color(0xFFFFFFFF));
      if (widget.file.type == 'html') {
        controller.loadHtmlString(_withViewport(widget.file.content));
      } else {
        controller.loadHtmlString(
          '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>'
          '<body style="margin:0;display:flex;justify-content:center">${widget.file.content}</body></html>',
        );
      }
      _webController = controller;
    }
  }

  /// Il contenuto generato non ha sempre il viewport: senza, la pagina esce
  /// dallo schermo sui telefoni.
  String _withViewport(String html) {
    if (html.toLowerCase().contains('name="viewport"')) return html;
    if (RegExp(r'<head[^>]*>', caseSensitive: false).hasMatch(html)) {
      return html.replaceFirstMapped(
        RegExp(r'<head[^>]*>', caseSensitive: false),
        (m) => '${m.group(0)}<meta name="viewport" content="width=device-width,initial-scale=1">',
      );
    }
    return '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>$html</body></html>';
  }

  Future<void> _copy() async {
    await Clipboard.setData(ClipboardData(text: widget.file.content));
    if (!mounted) return;
    setState(() => _copied = true);
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) setState(() => _copied = false);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
          widget.file.title ?? widget.file.name,
          overflow: TextOverflow.ellipsis,
        ),
        actions: [
          IconButton(
            icon: Icon(_copied ? Icons.check : Icons.copy, size: 20),
            tooltip: 'Copia contenuto',
            onPressed: _copy,
          ),
        ],
      ),
      body: _isWeb && _webController != null
          ? WebViewWidget(controller: _webController!)
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: SelectableText(
                widget.file.content,
                style: const TextStyle(
                  color: AgentCloudTheme.textPrimary,
                  fontSize: 13,
                  height: 1.5,
                ),
              ),
            ),
    );
  }
}
