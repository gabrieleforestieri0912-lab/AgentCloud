/// Parsing dei blocchi `<agentcloud_file>` nelle risposte degli agenti.
///
/// Port Dart di `src/lib/chat-files.ts` (versione display-only): il mobile
/// riceve il testo finale della run, quindi basta estrarre i blocchi completi
/// (un blocco senza chiusura viene comunque mostrato, marcato `complete:
/// false`). Il testo della bolla non contiene mai i blocchi; le card file si
/// aprono nella schermata di anteprima.
class ChatFileBlock {
  final String id;
  final String name;
  final String type;
  final String? title;
  final String content;
  final bool complete;

  const ChatFileBlock({
    required this.id,
    required this.name,
    required this.type,
    this.title,
    required this.content,
    required this.complete,
  });
}

class ParsedChatMessage {
  final String text;
  final List<ChatFileBlock> files;

  const ParsedChatMessage({required this.text, required this.files});
}

final RegExp _openTagRe = RegExp(r'<agentcloud_file\b([^>]*)>', caseSensitive: false);
final RegExp _attrRe = RegExp(r'''(\w+)\s*=\s*(?:"([^"]*)"|'([^']*)')''');
const String _closeTag = '</agentcloud_file>';

String _slugify(String raw, [String fallback = 'file']) {
  final slug = raw
      .toLowerCase()
      .replaceAll(RegExp(r'[^a-z0-9]+'), '-')
      .replaceAll(RegExp(r'^-+|-+$'), '');
  final truncated = slug.length > 64 ? slug.substring(0, 64) : slug;
  return truncated.isEmpty ? fallback : truncated;
}

String _fileExtension(String name) {
  final dot = name.lastIndexOf('.');
  return dot > 0 ? name.substring(dot + 1).toLowerCase() : '';
}

const Map<String, String> _typeByExt = {
  'md': 'markdown',
  'markdown': 'markdown',
  'html': 'html',
  'htm': 'html',
  'svg': 'svg',
  'csv': 'csv',
  'txt': 'text',
};

/// Tipo effettivo: il dichiarato, corretto con l'estensione (`type="code"` +
/// `report.md` -> markdown). Sconosciuto -> text.
String resolveFileType(String? declared, String name) {
  const valid = {'markdown', 'html', 'code', 'csv', 'svg', 'text'};
  final d = (declared ?? '').trim().toLowerCase();
  final fromExt = _typeByExt[_fileExtension(name)];
  if (valid.contains(d)) {
    if (d == 'text' || d == 'code') return fromExt ?? d;
    return d;
  }
  // Estensioni codice comuni quando il modello dichiara type="code".
  if (RegExp(r'^(js|ts|py|dart|java|json|css|xml|yaml|yml|sh|sql)$').hasMatch(_fileExtension(name))) {
    return 'code';
  }
  return fromExt ?? 'text';
}

String _normalizeFileName(String raw) {
  final t = raw.trim();
  if (t.isEmpty) return 'file.txt';
  if (!_fileExtension(t).isNotEmpty) return '$t.txt';
  return t;
}

Map<String, String> _readAttributes(String raw) {
  final attrs = <String, String>{};
  for (final m in _attrRe.allMatches(raw)) {
    attrs[m.group(1)!.toLowerCase()] = (m.group(2) ?? m.group(3) ?? '').trim();
  }
  return attrs;
}

/// Rimuove i marker di connessione `[[CONNECT:x]]` (la card è separata).
String stripConnectMarkers(String text) {
  return text.replaceAll(RegExp(r'\[\[CONNECT:[a-zA-Z0-9_\-]+\]\]'), '').trim();
}

/// Rimuove i marker `[[CONNECT:x]]` e i blocchi file: resta il testo da mostrare.
ParsedChatMessage parseChatFiles(String raw) {
  final text = raw;
  final files = <ChatFileBlock>[];
  final plain = StringBuffer();
  var cursor = 0;

  while (true) {
    final rest = text.substring(cursor);
    final open = _openTagRe.firstMatch(rest);
    if (open == null) {
      final partial = rest.indexOf('<agentcloud_file');
      plain.write(partial == -1 ? rest : rest.substring(0, partial));
      break;
    }
    final openIndex = cursor + open.start;
    final partial = rest.indexOf('<agentcloud_file');
    if (partial != -1 && partial < open.start) {
      plain.write(rest.substring(0, partial));
      break;
    }
    plain.write(rest.substring(0, open.start));
    final afterOpen = openIndex + open.group(0)!.length;
    final closeIndex = text.indexOf(_closeTag, afterOpen);
    final complete = closeIndex != -1;
    final body = complete ? text.substring(afterOpen, closeIndex) : text.substring(afterOpen);
    final attrs = _readAttributes(open.group(1) ?? '');
    final name = _normalizeFileName(attrs['name'] ?? attrs['title'] ?? '');
    var content = body.replaceFirst(RegExp(r'^\n'), '').trim();
    // Chiusura escapata dentro il contenuto (documentazione sul formato).
    content = content
        .replaceAll(RegExp(r'&lt;/agentcloud_file&gt;', caseSensitive: false), '</agentcloud_file>')
        .replaceAll(RegExp(r'&lt;agentcloud_file\b', caseSensitive: false), '<agentcloud_file');
    files.add(ChatFileBlock(
      id: _slugify(attrs['id'] ?? name),
      name: name,
      type: resolveFileType(attrs['type'], name),
      title: (attrs['title'] ?? '').isEmpty ? null : attrs['title'],
      content: content,
      complete: complete,
    ));
    if (!complete) break;
    cursor = closeIndex + _closeTag.length;
  }

  return ParsedChatMessage(text: plain.toString().trim(), files: files);
}
