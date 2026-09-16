import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/app_config.dart';

class WaitlistService {
  final String baseUrl;
  WaitlistService({this.baseUrl = AppConfig.apiBaseUrl});

  Future<Map<String, dynamic>> getStatus() async {
    final res = await http.get(Uri.parse('$baseUrl/api/waitlist'));
    if (res.statusCode >= 200 && res.statusCode < 300) return jsonDecode(res.body) as Map<String, dynamic>;
    throw Exception('waitlist status ${res.statusCode}');
  }

  Future<Map<String, dynamic>> join({required String email, String? ref}) async {
    final res = await http.post(
      Uri.parse('$baseUrl/api/waitlist'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, if (ref != null) 'ref': ref}),
    );
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    if (res.statusCode >= 200 && res.statusCode < 300) return data;
    if (res.statusCode == 409) return data; // already on list, still usable
    throw Exception(data['error'] ?? 'join failed');
  }

  Future<Map<String, dynamic>?> getRanking() async {
    final res = await http.get(Uri.parse('$baseUrl/api/waitlist/ranking'));
    if (res.statusCode == 200) return jsonDecode(res.body) as Map<String, dynamic>;
    return null;
  }

  Future<Map<String, dynamic>> saveName({required String name, String? email}) async {
    final res = await http.post(
      Uri.parse('$baseUrl/api/waitlist/name'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'name': name, if (email != null) 'email': email}),
    );
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    if (res.statusCode >= 200 && res.statusCode < 300) return data;
    throw Exception(data['error'] ?? 'save name failed');
  }

  Future<Map<String, dynamic>?> getName() async {
    final res = await http.get(Uri.parse('$baseUrl/api/waitlist/name'));
    if (res.statusCode == 200) return jsonDecode(res.body) as Map<String, dynamic>;
    return null;
  }
}
