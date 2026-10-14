import 'package:flutter_test/flutter_test.dart';
import 'package:agentcloud_mobile/src/chat/chat_files.dart';

void main() {
  test('testo senza blocchi resta intatto', () {
    final r = parseChatFiles('Ciao **mondo**');
    expect(r.text, 'Ciao **mondo**');
    expect(r.files, isEmpty);
  });

  test('blocco completo: testo pulito + card', () {
    final r = parseChatFiles(
      'Ecco il quiz:\n<agentcloud_file id="quiz-capitali" name="quiz-capitali.html" type="html" title="Quiz Capitali"><p>domande</p></agentcloud_file>\nFine.',
    );
    expect(r.text, 'Ecco il quiz:\n\nFine.');
    expect(r.files.length, 1);
    expect(r.files.first.id, 'quiz-capitali');
    expect(r.files.first.name, 'quiz-capitali.html');
    expect(r.files.first.type, 'html');
    expect(r.files.first.title, 'Quiz Capitali');
    expect(r.files.first.content, '<p>domande</p>');
    expect(r.files.first.complete, isTrue);
  });

  test('blocco senza chiusura mostrato comunque', () {
    final r = parseChatFiles('Inizio <agentcloud_file id="x" name="a.md" type="markdown">testo');
    expect(r.files.length, 1);
    expect(r.files.first.complete, isFalse);
    expect(r.files.first.content, 'testo');
  });

  test('tipo corretto dall\u2019estensione', () {
    final r = parseChatFiles('<agentcloud_file id="a" name="report.md" type="code">x</agentcloud_file>');
    expect(r.files.first.type, 'markdown');
    final r2 = parseChatFiles('<agentcloud_file id="b" name="sconosciuto.xyz">x</agentcloud_file>');
    expect(r2.files.first.type, 'text');
  });

  test('marker di connessione: strip separato dal parsing', () {
    expect(stripConnectMarkers('Collega [[CONNECT:gmail]] ora'), 'Collega  ora');
    // parseChatFiles conserva i marker: la UI applica stripConnectMarkers prima.
    final r = parseChatFiles(stripConnectMarkers('testo [[CONNECT:docs]]'));
    expect(r.text, 'testo');
  });

  test('slug stabile', () {
    final r = parseChatFiles('<agentcloud_file name="Report SEO 2026!.md">x</agentcloud_file>');
    expect(r.files.first.id, 'report-seo-2026-md');
  });
}
