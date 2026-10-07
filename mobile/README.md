# AgentCloud Mobile (Flutter)

App mobile ufficiale di **AgentCloud** per iOS e Android.

## Funzionalità
- **Dashboard agenti**: panoramica in tempo reale degli agenti attivi nel tuo workspace.
- **Chat e Task execution**: interazione via chat e trigger di esecuzioni agentiche con le API di AgentCloud.
- **Conferma umana**: quando un tool modifica contenuto esistente, la chat mostra Approva/Annulla e riprende la run con il token firmato (stesso flusso della chat web).
- **Notifiche push**: avvisi istantanei su task completati (in arrivo con Firebase/APNs).

## Allineamento alla piattaforma web

Contratti e cataloghi seguono la fonte di verità web (`src/`):

- contratti SSE e conferma umana → `src/app/api/agent/run/route.ts`, client in `lib/src/api/agentcloud_client.dart`;
- catalogo agenti → `src/lib/agents.ts`, modello in `lib/src/models/agent.dart`;
- catalogo integrazioni → `src/lib/integrations.ts`, modello in `lib/src/models/integration.dart`.

Il test `node scripts/test-clients-alignment.mjs` (dalla root del repo) fallisce se il mobile diverge.

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
