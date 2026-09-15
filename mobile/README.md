# AgentCloud Mobile (Flutter)

App mobile ufficiale di **AgentCloud** per iOS e Android.

## Funzionalità
- **Dashboard agenti**: panoramica in tempo reale degli agenti attivi nel tuo workspace.
- **Chat e Task execution**: interazione via chat e trigger di esecuzioni agentiche con le API di AgentCloud.
- **Notifiche push**: avvisi istantanei su task completati (in arrivo con Firebase/APNs).

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
