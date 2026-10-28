import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

/// Sessione di chat persistita localmente.
/// Allineamento con il web: le conversazioni della chat vivono in
/// localStorage (stesso schema semantico id/title/agent/messages/date), il
/// mobile le tiene in SharedPreferences. Nessuna API server: il web non
/// espone un endpoint conversazioni e il catalogo resta locale.
class Conversation {
  final String id;
  final String title;
  final String agentSlug;
  final List<ConversationMessage> messages;
  final DateTime createdAt;
  final DateTime updatedAt;

  const Conversation({
    required this.id,
    required this.title,
    required this.agentSlug,
    required this.messages,
    required this.createdAt,
    required this.updatedAt,
  });

  Conversation copyWith({
    String? title,
    List<ConversationMessage>? messages,
    DateTime? updatedAt,
  }) {
    return Conversation(
      id: id,
      title: title ?? this.title,
      agentSlug: agentSlug,
      messages: messages ?? this.messages,
      createdAt: createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'agentSlug': agentSlug,
        'messages': messages.map((m) => m.toJson()).toList(),
        'createdAt': createdAt.toIso8601String(),
        'updatedAt': updatedAt.toIso8601String(),
      };

  static Conversation fromJson(Map<String, dynamic> json) {
    final raw = (json['messages'] as List?) ?? const [];
    return Conversation(
      id: json['id'] as String,
      title: (json['title'] as String?) ?? 'Conversazione',
      agentSlug: (json['agentSlug'] as String?) ?? 'general',
      messages: raw
          .whereType<Map>()
          .map((m) => ConversationMessage.fromJson(Map<String, dynamic>.from(m)))
          .toList(),
      createdAt: DateTime.tryParse((json['createdAt'] as String?) ?? '') ??
          DateTime.now(),
      updatedAt: DateTime.tryParse((json['updatedAt'] as String?) ?? '') ??
          DateTime.now(),
    );
  }
}

/// Turno completo (user/assistant) come il `history` inviato a /api/agent/run.
class ConversationMessage {
  final String role;
  final String content;

  const ConversationMessage({required this.role, required this.content});

  Map<String, dynamic> toJson() => {'role': role, 'content': content};

  static ConversationMessage fromJson(Map<String, dynamic> json) =>
      ConversationMessage(
        role: (json['role'] as String?) ?? 'user',
        content: (json['content'] as String?) ?? '',
      );
}

/// Archivio locale delle conversazioni (SharedPreferences, JSON).
class ConversationService {
  static const _key = 'agentcloud_conversations_v1';
  static const int _maxConversations = 50;

  /// Tutte le conversazioni salvate, la più recente per prima.
  Future<List<Conversation>> load() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_key);
    if (raw == null || raw.isEmpty) return const [];
    try {
      final decoded = jsonDecode(raw) as List;
      return decoded
          .whereType<Map>()
          .map((e) => Conversation.fromJson(Map<String, dynamic>.from(e)))
          .toList()
        ..sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
    } catch (_) {
      return const [];
    }
  }

  /// Inserisce o aggiorna una conversazione e la riordina (recente in testa).
  Future<void> save(Conversation conv) async {
    final prefs = await SharedPreferences.getInstance();
    final current = (await load()).where((c) => c.id != conv.id).toList();
    current.add(conv);
    current.sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
    final trimmed = current.take(_maxConversations).toList();
    await prefs.setString(
      _key,
      jsonEncode([for (final c in trimmed) c.toJson()]),
    );
  }

  /// Titolo breve derivato dal primo messaggio (come fa il web).
  static String titleFrom(String firstMessage) {
    final t = firstMessage.trim().replaceAll(RegExp(r'\s+'), ' ');
    if (t.isEmpty) return 'Nuova chat';
    return t.length <= 40 ? t : '${t.substring(0, 38)}…';
  }

  /// Elimina tutte le conversazioni salvate sul dispositivo.
  Future<void> clearAll() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_key);
  }
}
