import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

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

  /// Esegue un agente specifico passando prompt o parametri
  Future<Map<String, dynamic>> runAgent({
    required String agentSlug,
    required String prompt,
    Map<String, dynamic>? context,
  }) async {
    final token = await getToken();
    final url = Uri.parse('$baseUrl/api/agent/run');

    final response = await http.post(
      url,
      headers: _headers(token),
      body: jsonEncode({
        'agent': agentSlug,
        'prompt': prompt,
        if (context != null) 'context': context,
      }),
    );

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return jsonDecode(response.body) as Map<String, dynamic>;
    } else {
      throw Exception(
        'Errore esecuzione agente (${response.statusCode}): ${response.body}',
      );
    }
  }

  /// Invia un messaggio alla chat streaming o standard
  Stream<String> sendChatMessage({
    required String message,
    String? agentSlug,
  }) async* {
    final token = await getToken();
    final url = Uri.parse('$baseUrl/api/chat');

    final request = http.Request('POST', url)
      ..headers.addAll(_headers(token))
      ..body = jsonEncode({
        'message': message,
        if (agentSlug != null) 'agent': agentSlug,
      });

    final response = await request.send();

    if (response.statusCode >= 200 && response.statusCode < 300) {
      yield* response.stream
          .transform(utf8.decoder)
          .transform(const LineSplitter());
    } else {
      throw Exception('Errore connessione chat (${response.statusCode})');
    }
  }
}
