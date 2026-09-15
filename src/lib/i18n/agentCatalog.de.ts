/**
 * Deutsches Overlay des Agenten-Katalogs (Slug → lokalisierte Anzeigefelder).
 *
 * Der kanonische Inhalt lebt in `src/lib/agents.ts` auf Englisch; diese Daten
 * überschreiben ihn über `localizeAgent()`, wenn die aktive Sprache Deutsch
 * ist. Das Badge steht hier bewusst NICHT: Es ist eine kanonische
 * Agenten-Eigenschaft und wird von `localizeBadge()` in `./agentCatalog.ts`
 * übersetzt.
 */
import type { AgentLocalization } from "./agentCatalog";

export const AGENT_LOCALIZATIONS_DE: Record<string, AgentLocalization> = {
  "email-manager": {
    name: "E-Mail-Manager",
    shortName: "E-Mail",
    category: "Business & Betrieb",
    description:
      "Bring Ordnung ins Postfach, verpasse nie eine wichtige Verpflichtung und erhalte eine tägliche Zusammenfassung.",
    longDescription:
      "Der E-Mail-Manager-Agent bringt Ordnung in dein Postfach und behält jede Verpflichtung im Blick. Er sortiert eingehende Nachrichten, kennzeichnet und archiviert, was zählt, schreibt klare Antwortentwürfe zum Freigeben und erspürt Fristen, Besprechungen und Follow-ups in den Konversationen – und macht daraus nachverfolgbare Aufgaben mit Erinnerungen. Er fasst den Tag in einem kurzen Digest zusammen, weist auf Entscheidungen hin und verfolgt jedes Follow-up bis zum Abschluss. Verbunden mit Gmail, Google Kalender, Outlook und Slack spart er dir jede Woche Stunden an E-Mail-Verwaltung: Antworte auf das, was zählt – und kein wichtiger Termin entgeht dir.",
    industry: "Gründer, Führungskräfte und Fachleute",
    tasks: [
      "Postfach-Sortierung",
      "Antwortentwürfe",
      "Verpflichtungs-Tracking",
      "Tägliche E-Mail-Zusammenfassung",
    ],
    workflow: [
      "Analysiert das Postfach",
      "Sortiert und archiviert",
      "Verfolgt Verpflichtungen",
      "Liefert die Zusammenfassung",
    ],
  },
  "business-manager": {
    name: "Business-Manager",
    shortName: "Business",
    category: "Business & Betrieb",
    description:
      "Ein COO im Chat: Berichte, Planung und Entscheidungsunterstützung.",
    longDescription:
      "Der Business-Manager-Agent fungiert als Stabschef für Unternehmer und Gründer. Er liest deine operativen Daten, erstellt Führungsberichte, koordiniert die Arbeit zwischen Teams und unterstützt Planung und Entscheidungen. Verbunden mit Google Kalender, Gmail, Sheets und Slack verwandelt er verstreute Tabellen und Status-Updates in ein klares Bild deines Geschäfts – damit Führungskräfte Zahlen und Erzählung haben, um schneller zu entscheiden und das Unternehmen wachsen zu lassen, ohne etwas auf der Strecke zu lassen.",
    industry: "KMU und Gründer",
    tasks: [
      "Führungsberichte",
      "Analyse operativer Daten",
      "Abteilungsübergreifende Koordination",
      "Strategische Empfehlungen",
    ],
    workflow: [
      "Synchronisiert Sheets + Kalender",
      "Analysiert KPIs",
      "Erstellt den Führungsbericht",
      "Schlägt Prioritäten vor",
    ],
  },
  "seo-agent": {
    name: "SEO-Content-Agent",
    shortName: "SEO",
    category: "Marketing & Vertrieb",
    description:
      "Schreibt strukturierte, keyword-optimierte Artikel, die wirklich ranken.",
    longDescription:
      "Der SEO-Content-Agent recherchiert Themen, analysiert, wofür sich Wettbewerber positionieren, und produziert vollständige, für Keywords optimierte Artikel. Er plant die H1/H2-Struktur, bindet Ziel-Keywords natürlich ein und ergänzt automatisch Meta-Beschreibungen und interne Links. Verbunden mit Ahrefs, Google Search Console, WordPress und Notion hilft er dem Content-Team, mehr zu veröffentlichen, schneller zu ranken und besser zu konvertieren – mit jedem Beitrag, der auf eine echte Suchabsicht ausgerichtet ist.",
    industry: "Content-Marketing-Teams",
    tasks: [
      "Keyword-Recherche",
      "Wettbewerbsanalyse",
      "Artikel erstellen",
      "Meta-Optimierung",
    ],
    workflow: [
      "Findet die Keywords",
      "Untersucht die Konkurrenz",
      "Schreibt den Artikel",
      "Optimiert die Metadaten",
    ],
  },
  "personal-assistant": {
    name: "Persönlicher Assistent",
    shortName: "Assistent",
    category: "Business & Betrieb",
    description:
      "Plant deinen Tag, räumt deine To-do-Liste ab und holt dir jede Woche Stunden zurück.",
    longDescription:
      "Der Persönliche Assistent organisiert deinen Tag wie eine großartige Assistenz. Er plant den Kalender, verwaltet To-do-Listen, fasst Notizen und Dokumente zusammen, blockt Zeit für Tiefenarbeit und schlägt proaktiv vor, womit du zuerst beginnen solltest. Verbunden mit Google Kalender, Gmail, Notion und Slack hält er vielbeschäftigte Profis und Solopreneure auf Kurs – und holt dir mehrere Stunden pro Woche zurück, indem er dir die kleinen organisatorischen Abläufe des Alltags abnimmt.",
    industry: "Fachleute und Solopreneure",
    tasks: [
      "Tagesplanung",
      "Aufgabenverwaltung",
      "Recherche und Zusammenfassung",
      "Entwürfe und Dokumente",
    ],
    workflow: [
      "Hört die Anfrage",
      "Organisiert die Aufgaben",
      "Führt mit den Tools aus",
      "Schlägt nächste Schritte vor",
    ],
  },
  "calendar-booking": {
    name: "Terminbuchungs-Agent",
    shortName: "Termine",
    category: "Business & Betrieb",
    description:
      "Findet freie Zeiten, bucht Meetings und versendet die Einladungen automatisch.",
    longDescription:
      "Der Terminbuchungs-Agent übernimmt die Planung von Anfang bis Ende. Er sucht die Verfügbarkeit in den Kalendern der Teilnehmer, schlägt die besten Zeitfenster vor, bucht das Meeting, bestätigt die Teilnehmer und fügt den Video-Link hinzu. Verbunden mit Google Kalender, Outlook, Zoom und Slack beendet er das endlose Hin und Her um „Wann passt es dir?“ – eine echte Zeitersparnis für beratenden Vertrieb, Dienstleistungen und jedes Team, das von gebuchten Calls lebt.",
    industry: "Planungs- und Meeting-Teams",
    tasks: [
      "Verfügbarkeit prüfen",
      "Zeitfenster vorschlagen",
      "Termine buchen",
      "Automatische Video-Links",
    ],
    workflow: [
      "Prüft die Verfügbarkeit",
      "Schlägt Zeitfenster vor",
      "Bestätigt die Details",
      "Bucht und bestätigt",
    ],
  },
  "lead-capture": {
    name: "Lead-Capture-Agent",
    shortName: "Lead Capture",
    category: "Marketing & Vertrieb",
    description:
      "Fängt jeden Lead ein, reichert ihn an und benachrichtigt den Vertrieb in Sekunden.",
    longDescription:
      "Der Lead-Capture-Agent lässt keinen Interessenten entkommen. Er sammelt Daten aus Formularen, Chat und Website, reichert Kontakte mit Firmen- und Kontextinformationen an und alarmiert das Vertriebsteam per Slack mit dem empfohlenen nächsten Schritt. Verbunden mit Slack, HubSpot, Salesforce und Zapier macht er deine Lead-Quellen zu einer immer aktiven Pipeline – so reagiert der Vertrieb sofort und keine eingehende Anfrage bleibt unbeantwortet.",
    industry: "Vertrieb und Lead-Generierung",
    tasks: [
      "Lead-Erfassung",
      "Kontakt-Anreicherung",
      "Benachrichtigung des Vertriebs",
      "Lead-Zusammenfassung",
    ],
    workflow: [
      "Identifiziert den Lead",
      "Validiert die Daten",
      "Reichert den Kontakt an",
      "Benachrichtigt den Vertrieb",
    ],
  },
  "support-agent": {
    name: "Support-Agent",
    shortName: "Support",
    category: "Kundenservice",
    description:
      "Beantwortet jeden Ticket rund um die Uhr und eskaliert nur, was einen Menschen braucht.",
    longDescription:
      "Der Support-Agent löst Kundenanfragen rund um die Uhr. Auf deiner Wissensdatenbank trainiert, beantwortet er Tickets in Sekunden, schreibt präzise Antworten, klassifiziert jedes Problem und eskaliert nur dann an dein Team, wenn der Fall wirklich eine Person braucht. Verbunden mit Zendesk, Intercom, Help Scout und Slack senkt er die Erstantwortzeit und den Ticket-Backlog deutlich – schneller, konstanter Support ohne mehr Personal.",
    industry: "Kundendienst-Teams",
    tasks: [
      "24/7-Antworten",
      "Ticket-Klassifizierung",
      "Antwortentwürfe",
      "Eskalation komplexer Fälle",
    ],
    workflow: [
      "Liest das Ticket",
      "Durchsucht die Wissensdatenbank",
      "Schreibt die Antwort",
      "Eskaliert bei Bedarf",
    ],
  },
  copywriter: {
    name: "Copywriter",
    shortName: "Copywriter",
    category: "Design & Inhalte",
    description:
      "Schreibt Texte, die auf Landingpages, Anzeigen und in E-Mails konvertieren.",
    longDescription:
      "Der Copywriter-Agent schreibt die Worte, die Besucher in Kunden verwandeln. Er produziert plattformgerechte Texte für Landingpages, Anzeigen, E-Mails und Produkt-UI – mit mehreren Varianten, bereit für A/B-Tests. Integriert mit Webflow, WordPress, Mailchimp und Notion entfällt das Warten auf Freelancer und Briefings: Das Marketing-Team hat markenkonforme Texte in Minuten und die Vielfalt an Varianten, die nötig ist, um die Conversion wirklich zu optimieren.",
    industry: "Marketing- und Produktteams",
    tasks: [
      "Landingpage-Texte",
      "Anzeigentexte",
      "E-Mail-Texte",
      "UI-Microcopy",
    ],
    workflow: [
      "Analysiert die Marke",
      "Definiert den Ton",
      "Schreibt die Varianten",
      "Übergibt für die Tests",
    ],
  },
  "finance-manager": {
    name: "Finance-Manager",
    shortName: "Finanzen",
    category: "E-Commerce & Finanzen",
    description:
      "Behalte Rechnungen, Ausgaben und Cashflow im Griff – ohne das Tabellen-Chaos.",
    longDescription:
      "Der Finance-Manager-Agent hält die Zahlen deines Unternehmens in Ordnung. Er gleicht Einnahmen und Ausgaben ab, erstellt klare Rechnungen und Zahlungserinnerungen zum Freigeben und verwandelt verstreute Daten in einen Cashflow-Briefing in einfacher Sprache: was eingegangen ist, was ausgegangen ist, was fällig wird und was du priorisieren solltest. Er meldet Auffälligkeiten, statt sie zu verstecken, verbindet sich mit Stripe, QuickBooks, Google Sheets und Slack und erfindet nie Zahlen – so haben Gründer und kleine Teams in Minuten einen verlässlichen Finanzüberblick statt Tabellen-Chaos.",
    industry: "KMU und Gründer",
    tasks: [
      "Rechnungen und Zahlungen",
      "Ausgaben-Tracking",
      "Cashflow-Bericht",
      "Zahlungserinnerungen",
    ],
    workflow: [
      "Gleicht die Daten ab",
      "Verfolgt die Ausgaben",
      "Erstellt die Rechnungen",
      "Berichtet den Cashflow",
    ],
  },
  "shopify-agent": {
    name: "Shopify-Agent",
    shortName: "Shopify",
    category: "E-Commerce & Finanzen",
    description:
      "Durchsucht Produkte, erstellt Warenkorb-Links und prüft die Bestellungen deines Shops.",
    longDescription:
      "Der Shopify-Agent übernimmt den Conversational Commerce deines Shops. Er durchsucht den Katalog, erstellt direkte Warenkorb-Links für bestimmte Varianten, prüft den Bestellstatus sicher per Bestellnummer und E-Mail und meldet die Verfügbarkeit in Sekunden. Verbunden mit deinem Shopify-Shop, Stripe, Slack und E-Mail gibt er dem Käufer Antwort und nächsten Schritt sofort – und macht aus einer Produktfrage einen echten Kauf-Link statt einer Sackgassen-Konversation.",
    industry: "Shopify-Shops",
    tasks: [
      "Produktsuche",
      "Warenkorb-Links",
      "Bestellstatus",
      "Datensicherheit",
    ],
    workflow: [
      "Analysiert die Bestseller",
      "Schlägt Produkte vor",
      "Erzeugt schnellen Checkout",
      "Sendet die Bestätigung an den Kunden",
    ],
  },
  // ─── Neue Agenten des erweiterten Katalogs (10 verfügbar + 5 in Kürze) ─────
  "quote-agent": {
    name: "Angebots-Agent",
    shortName: "Angebote",
    category: "E-Commerce & Finanzen",
    description:
      "Sammelt Anforderungen im Chat, berechnet Zwischensumme, MwSt. und Rabatte und sendet formelle Angebote per E-Mail.",
    longDescription:
      "Der Angebots-Agent führt Interessenten durch die Definition der gewünschten Leistungen, erstellt sofort einen transparenten Kostenvoranschlag mit Steuerberechnung und sendet auf Wunsch ein formelles Angebot per E-Mail mit Zusammenfassung als Anhang.",
    industry: "KMU, Handwerker, Werkstätten und Agenturen",
    tasks: [
      "Erfassung der Projektanforderungen",
      "Detaillierte Berechnung von Zwischensumme und MwSt.",
      "Anwendung individueller Rabatte",
      "Versand des formellen Angebots per E-Mail",
    ],
    workflow: [
      "Sammelt die Positionen",
      "Berechnet Summe und Steuern",
      "Zeigt dem Kunden die Vorschau",
      "Sendet das Angebot per E-Mail",
    ],
  },
  "reviews-agent": {
    name: "Bewertungs-Agent",
    shortName: "Bewertungen",
    category: "Kundenservice",
    description:
      "Überwacht Google-Business-Bewertungen, erkennt die Stimmung und antwortet mit persönlichen, einfühlsamen Nachrichten.",
    longDescription:
      "Der Bewertungs-Agent schützt und stärkt den Ruf deines Unternehmens im Google Business Profile. Er analysiert Kundenfeedback, erkennt wiederkehrende Kritikpunkte und entwirft freundliche, präzise Antworten, die nach deiner Freigabe veröffentlicht werden können.",
    industry: "Restaurants, Hotels, Geschäfte und lokale Betriebe",
    tasks: [
      "Überwachung der Google-Business-Bewertungen",
      "Analyse der Kundenstimmung",
      "Personalisierte Antwortentwürfe",
      "Schnelle Bearbeitung kritischer Rückmeldungen",
    ],
    workflow: [
      "Ruft neue Bewertungen ab",
      "Analysiert Ton und Bewertung",
      "Verfasst eine professionelle Antwort",
      "Veröffentlicht nach Freigabe",
    ],
  },
  "hr-recruiter": {
    name: "HR-Recruiting-Agent",
    shortName: "HR",
    category: "Business & Betrieb",
    description:
      "Automatisiert die Personalauswahl: Lebenslauf-Screening, Vorqualifizierung von Kandidaten und Interview-Terminplanung.",
    longDescription:
      "Der HR-Recruiting-Agent beschleunigt den Einstellungsprozess deines Unternehmens. Er prüft eingegangene Lebensläufe gegen die Anforderungen der Stelle, stellt Vorqualifizierungsfragen und plant die ersten Interviews im Kalender.",
    industry: "Wachsende KMU, Agenturen und Personalabteilungen",
    tasks: [
      "Automatisches CV-Screening",
      "Abgleich von Kompetenzen und Stellenbeschreibung",
      "Kommunikation und Feedback mit Kandidaten",
      "Terminplanung von Interviews",
    ],
    workflow: [
      "Erhält die Bewerbungen",
      "Extrahiert die Kernkompetenzen",
      "Bewertet die Passung",
      "Plant das erste Interview",
    ],
  },
  "social-media-agent": {
    name: "Social-Media-Agent",
    shortName: "Social Media",
    category: "Design & Inhalte",
    description:
      "Plant den Redaktionskalender, schreibt ansprechende Captions, schlägt Hashtags vor und analysiert Trends.",
    longDescription:
      "Der Social-Media-Agent ist dein dedizierter Copywriter und Planner für Instagram, LinkedIn, TikTok und Facebook. Er schlägt Post-Ideen auf Basis aktueller Trends vor, schreibt ansprechende Texte mit gezielten Hashtags und organisiert den wöchentlichen Redaktionsplan.",
    industry: "Marken, Shops, Agenturen und Content-Ersteller",
    tasks: [
      "Wöchentliche Redaktionspläne",
      "Texte für Instagram- und LinkedIn-Posts",
      "Recherche von Hashtags und Branchentrends",
      "Format-Anpassung pro Kanal",
    ],
    workflow: [
      "Erkennt Trendthemen",
      "Schreibt Texte mit Call-to-Action",
      "Wählt die besten Hashtags",
      "Plant im Social-Kalender",
    ],
  },
  "inventory-logistics": {
    name: "Lager- & Logistik-Agent",
    shortName: "Logistik",
    category: "E-Commerce & Finanzen",
    description:
      "Überwacht den Lagerbestand, warnt bei niedrigen Beständen und verfolgt Lieferantensendungen.",
    longDescription:
      "Der Lager- & Logistik-Agent verhindert Fehlbestände und Lieferverzögerungen. Er prüft die Lagerbestände in Echtzeit, berechnet den optimalen Nachbestellzeitpunkt und verfolgt Sendungen unterwegs, wobei er Probleme frühzeitig meldet.",
    industry: "E-Commerce, Händler und physische Lager",
    tasks: [
      "Kontrolle der Lagerbestände",
      "Automatische Warnungen bei Mindestbestand",
      "Prognose der Nachbestellmengen",
      "Verfolgung des Sendungsstatus",
    ],
    workflow: [
      "Prüft den aktuellen Bestand",
      "Berechnet die Verkaufsgeschwindigkeit",
      "Warnt bei kritischen Artikeln",
      "Entwirft die Bestellung an den Lieferanten",
    ],
  },
};