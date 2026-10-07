import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../config/app_config.dart';

/// Conferma umana in attesa: il server ha messo in pausa la run con
/// `tool_confirm` perché un tool modifica contenuto esistente. Il token è
/// firmato lato server: il client può solo approvare o annullare.
class PendingApproval {
  final String token;
  final String toolName;
  const PendingApproval({required this.token, required this.toolName});
}

/// Esito di una run: testo accumulato e, se presente, la conferma in attesa.
class AgentRunResult {
  final String output;
  final PendingApproval? pendingApproval;
  const AgentRunResult({required this.output, this.pendingApproval});
}

/// Client API allineato ai contratti web:
/// - POST /api/agent/run { agentId, messages: [{role, content}] } -> SSE
/// - POST /api/chat { messages: [{role, content}] } -> SSE
/// L'autenticazione viaggia via Bearer (il proxy web la accetta per CLI/mobile).
///
/// Contratto SSE (fonte di verità: `src/app/api/agent/run/route.ts`):
/// `text`, `tool_start`, `tool_done`, `file`, `connection`, `tool_confirm`,
/// `awaiting_confirmation`, `done`, `error`. Per riprendere una run in pausa si
/// rimanda lo stesso body con `approval: { token }`.
class AgentCloudClient {
  final String baseUrl;
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  AgentCloudClient({this.baseUrl = AppConfig.apiBaseUrl});

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

  /// Itera le righe SSE di una risposta e invoca `onEvent` per ogni evento JSON
  /// completo. Gli errori del server diventano eccezioni.
  static Future<void> _forEachEvent(
    http.StreamedResponse response,
    void Function(Map<String, dynamic> event) onEvent,
  ) async {
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
      onEvent(data);
    }
  }

  /// Esegue un agente specifico e restituisce testo finale + eventuale conferma
  /// in attesa. `approvalToken` riprende una run messa in pausa.
  ///
  /// `onEvent` (opzionale) riceve ogni evento SSE grezzo: la UI può mostrare
  /// tool in esecuzione e richieste di connessione, come la chat web.
  Future<AgentRunResult> runAgent({
    required String agentSlug,
    required String prompt,
    List<Map<String, String>>? history,
    String? approvalToken,
    void Function(Map<String, dynamic> event)? onEvent,
  }) async {
    final token = await getToken();
    final url = Uri.parse('$baseUrl/api/agent/run');

    final body = <String, dynamic>{
      'agentId': agentSlug,
      'messages': [
        if (history != null) ...history,
        {'role': 'user', 'content': prompt},
      ],
      if (approvalToken != null) 'approval': {'token': approvalToken},
    };

    final request = http.Request('POST', url)
      ..headers.addAll(_headers(token))
      ..body = jsonEncode(body);

    final streamed = await request.send();
    if (streamed.statusCode < 200 || streamed.statusCode >= 300) {
      throw Exception('Errore esecuzione agente (${streamed.statusCode})');
    }

    final buffer = StringBuffer();
    PendingApproval? pending;
    String? errorMessage;

    await _forEachEvent(streamed, (data) {
      onEvent?.call(data);
      final type = data['type'] as String?;
      if (type == 'text' && data['content'] is String) {
        buffer.write(data['content'] as String);
      } else if (type == 'tool_confirm') {
        final t = data['token'];
        if (t is String && t.isNotEmpty) {
          pending = PendingApproval(
            token: t,
            toolName: (data['toolName'] as String?) ?? 'tool',
          );
        }
      } else if (type == 'error') {
        errorMessage = (data['message'] ?? data['error'] ?? "Errore dell'agente").toString();
      }
    });

    if (errorMessage != null) throw Exception(errorMessage);
    return AgentRunResult(output: buffer.toString(), pendingApproval: pending);
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
