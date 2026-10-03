import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Client API allineato ai contratti web:
/// - POST /api/agent/run { agentId, messages: [{role, content}] } -> SSE
/// - POST /api/chat { messages: [{role, content}] } -> SSE
/// L'autenticazione viaggia via Bearer (il proxy web la accetta per CLI/mobile).
class AgentCloudClient {
  final String baseUrl;
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  AgentCloudClient({this.baseUrl = 'https://agentcloud.agency'});

  Future<String?> getToken() async {
    return await _storage.read(key: 'agentcloud_token');
  }

  Future<void> setToken(String token) async {
    await _storage.write(key: 'agentcloud_token', value: token);
  }

  Future<void> logout() async {
    await _storage.delete(key: 'agentcloud_token');
  }

  Map<String, String> _headers(String? token) {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  /// Accumula i chunk `text` di uno stream SSE nell'unica risposta finale.
  /// Gli eventi operativi (tool_start/tool_done/connection/done) guidano solo
  /// il flusso e vengono ignorati nel testo; `error` diventa eccezione.
  static Future<String> collectSseText(http.StreamedResponse response) async {
    final buffer = StringBuffer();
    await for (final line in response.stream
        .transform(utf8.decoder)
        .transform(const LineSplitter())) {
      if (!line.startsWith('data: ')) continue;
      Map<String, dynamic> data;
      try {
        data = jsonDecode(line.substring(6)) as Map<String, dynamic>;
      } catch (_) {
        continue;
      }
      final type = data['type'] as String?;
      if (type == 'text' && data['content'] is String) {
        buffer.write(data['content'] as String);
      } else if (type == 'error') {
        throw Exception(data['message'] ?? data['error'] ?? "Errore dell'agente");
      }
    }
    return buffer.toString();
  }

  /// Esegue un agente specifico e restituisce il testo finale completo.
  Future<Map<String, dynamic>> runAgent({
    required String agentSlug,
    required String prompt,
    List<Map<String, String>>? history,
  }) async {
    final token = await getToken();
    final url = Uri.parse('$baseUrl/api/agent/run');

    final request = http.Request('POST', url)
      ..headers.addAll(_headers(token))
      ..body = jsonEncode({
        'agentId': agentSlug,
        'messages': [
          if (history != null) ...history,
          {'role': 'user', 'content': prompt},
        ],
      });

    final streamed = await request.send();
    if (streamed.statusCode < 200 || streamed.statusCode >= 300) {
      throw Exception('Errore esecuzione agente (${streamed.statusCode})');
    }
    final output = await collectSseText(streamed);
    return {'output': output};
  }

  /// Invia un messaggio alla chat generica in streaming (chunk di testo).
  Stream<String> sendChatMessage({
    required String message,
    String? agentSlug,
  }) async* {
    final token = await getToken();
    final url = Uri.parse('$baseUrl/api/chat');

    final request = http.Request('POST', url)
      ..headers.addAll(_headers(token))
      ..body = jsonEncode({
        'messages': [
          {'role': 'user', 'content': message},
        ],
        if (agentSlug != null) 'agentId': agentSlug,
      });

    final response = await request.send();

    if (response.statusCode >= 200 && response.statusCode < 300) {
      await for (final line in response.stream
          .transform(utf8.decoder)
          .transform(const LineSplitter())) {
        if (!line.startsWith('data: ')) continue;
        Map<String, dynamic> data;
        try {
          data = jsonDecode(line.substring(6)) as Map<String, dynamic>;
        } catch (_) {
          continue;
        }
        if (data['type'] == 'text' && data['content'] is String) {
          yield data['content'] as String;
        } else if (data['type'] == 'error') {
          throw Exception(data['message'] ?? data['error'] ?? 'Errore chat');
        }
      }
    } else {
      throw Exception('Errore connessione chat (${response.statusCode})');
    }
  }
}
