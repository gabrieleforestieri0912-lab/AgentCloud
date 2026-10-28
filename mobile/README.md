# AgentCloud Mobile (Flutter)

App mobile ufficiale di **AgentCloud** per iOS e Android.

## Funzionalità
- **Dashboard agenti**: panoramica in tempo reale degli agenti attivi nel tuo workspace, con badge "Tuo" sugli agenti realmente abbonati (da `/api/user/owned`).
- **Chat e Task execution**: interazione via chat e trigger di esecuzioni agentiche con le API di AgentCloud. La risposta arriva in **streaming real-time** (eventi `text` SSE mostrati in bolla viva) e si può **interrompere** a metà generazione (l'arrivo parziale resta in chat).
- **Conversazioni persistite**: la cronologia vive in locale (SharedPreferences) come la sidebar della chat web vive in localStorage; la lista "Recenti" riprende le chat con titolo, messaggi e agente.
- **Conferma umana**: quando un tool modifica contenuto esistente, la chat mostra Approva/Annulla e riprende la run con il token firmato (stesso flusso della chat web).
- **Reset password**: link "Password dimenticata?" col medesimo redirectTo della pagina web `/reset-password`.
- **Notifiche push**: avvisi istantanei su task completati (in arrivo con Firebase/APNs).

## Allineamento alla piattaforma web

Contratti e cataloghi seguono la fonte di verità web (`src/`):

- contratti SSE e conferma umana → `src/app/api/agent/run/route.ts`, client in `lib/src/api/agentcloud_client.dart`;
- catalogo agenti → `src/lib/agents.ts`, modello in `lib/src/models/agent.dart`;
- catalogo integrazioni → `src/lib/integrations.ts`, modello in `lib/src/models/integration.dart`.

Non esiste un test automatico di allineamento: dopo ogni modifica al catalogo
web (`src/lib/agents.ts`, `src/lib/i18n/agentCatalog.it.ts`, `src/lib/integrations.ts`)
aggiorna i rispettivi modelli Dart tenendo identici slug, ordine, prezzi e stato `active`/`available`.

## Requisiti
- Flutter SDK `>=3.10.0`
- Dart SDK `>=3.0.0 <4.0.0`
- Android Studio / Xcode per la compilazione mobile

## Setup e Avvio

1. Installa le dipendenze:
   ```bash
   flutter pub get
   ```
2. Esegui in modalità sviluppo:
   ```bash
   flutter run
   ```
3. Build per produzione:
   ```bash
   # Android APK / App Bundle
   flutter build apk --release
   flutter build appbundle --release

   # iOS (su macOS con Xcode)
   flutter build ipa --release
   ```
