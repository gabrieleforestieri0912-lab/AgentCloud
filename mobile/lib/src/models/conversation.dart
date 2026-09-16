class ChatMessage {
  final String id;
  final String role; // user | assistant
  final String content;
  final DateTime createdAt;
  final bool isStreaming;

  ChatMessage({
    required this.id,
    required this.role,
    required this.content,
    required this.createdAt,
    this.isStreaming = false,
  });

  bool get isUser => role == 'user';
  bool get isAssistant => role == 'assistant';
}

class Conversation {
  final String id;
  final String title;
  final String? agentSlug;
  final List<ChatMessage> messages;
  final DateTime createdAt;
  final DateTime updatedAt;

  Conversation({
    required this.id,
    required this.title,
    this.agentSlug,
    this.messages = const [],
    required this.createdAt,
    required this.updatedAt,
  });
}
