/**
 * Contenuti della pagina di dettaglio agente in tutte le lingue.
 *
 * I casi d'uso e le FAQ sono specifici della pagina (non dei dati canonici
 * in `src/lib/agents.ts`), quindi vivono qui, indicizzati per locale, con
 * `name` interpolato a runtime come nell'originale.
 */

import type { Locale } from "./constants";

/** Esempi di casi d'uso specifici per slug (i pochi agenti con contenuto ad hoc). */
const USE_CASE_EXAMPLES: Record<Locale, Record<string, string[]>> = {
  en: {
    "email-manager": [
      "Triage a week of unread email into priorities, folders, and drafts",
      "Extract every commitment and deadline hidden in my inbox threads",
      "Send a morning digest with what needs my decision today",
    ],
  },
  it: {
    "email-manager": [
      "Smista una settimana di email non lette in priorità, cartelle e bozze",
      "Estrai ogni impegno e scadenza nascosti nelle conversazioni della casella",
      "Invia un digest mattutino con ciò che richiede oggi la tua decisione",
    ],
  },
  es: {
    "email-manager": [
      "Clasifica una semana de correos sin leer en prioridades, carpetas y borradores",
      "Extrae cada compromiso y fecha límite ocultos en los hilos de tu bandeja de entrada",
      "Envía un resumen matutino con lo que necesita tu decisión hoy",
    ],
  },
  de: {
    "email-manager": [
      "Sortiere eine Woche ungelesener E-Mails nach Prioritäten, Ordnern und Entwürfen",
      "Extrahiere jede Zusage und Frist, die in deinen E-Mail-Verläufen versteckt ist",
      "Sende morgens eine Übersicht mit dem, was heute deine Entscheidung braucht",
    ],
  },
  fr: {
    "email-manager": [
      "Triez une semaine de courriels non lus en priorités, dossiers et brouillons",
      "Extrayez chaque engagement et échéance cachés dans les fils de votre boîte de réception",
      "Envoyez un résumé matinal avec ce qui nécessite votre décision aujourd'hui",
    ],
  },
};

/** Template generico di caso d'uso, per locale (usato quando non c'è contenuto ad hoc). */
function useCaseTemplate(
  locale: Locale,
  task: string,
  multiTool: boolean,
): string {
  const label = task.toLowerCase();
  switch (locale) {
    case "it":
      return `Automatizza "${label}" dall'inizio alla fine con ${multiTool ? "i tuoi strumenti connessi" : "workflow basati sull'AI"}`;
    case "es":
      return `Automatiza "${label}" de principio a fin con ${multiTool ? "tus herramientas conectadas" : "flujos de trabajo basados en IA"}`;
    case "de":
      return `Automatisiere "${label}" von Anfang bis Ende mit ${multiTool ? "deinen verbundenen Tools" : "KI-gestützten Workflows"}`;
    case "fr":
      return `Automatisez "${label}" de bout en bout avec ${multiTool ? "vos outils connectés" : "des flux de travail basés sur l'IA"}`;
    default:
      return `Automate "${label}" end-to-end with ${multiTool ? "your connected tools" : "AI-powered workflows"}`;
  }
}

/** Casi d'uso mostrati nella pagina di dettaglio, nella lingua attiva. */
export function getUseCases(
  slug: string,
  tasks: string[],
  locale: Locale,
): string[] {
  const examples = USE_CASE_EXAMPLES[locale][slug];
  if (examples) return examples;
  return tasks.map((task) => useCaseTemplate(locale, task, slug.includes("-")));
}

/** Keyword per rilevare l'agente "assistente" (setup in giornata) in ogni lingua. */
const ASSISTANT_HINT: Record<Locale, string> = {
  it: "Assistente",
  en: "Assistant",
  es: "Asistente",
  de: "Assistent",
  fr: "Assistant",
};

/** Le quattro FAQ della pagina di dettaglio, per locale, con `name` interpolato. */
export function getFAQs(
  _slug: string,
  name: string,
  locale: Locale,
): [string, string][] {
  const sameDay = name.includes(ASSISTANT_HINT[locale]);
  switch (locale) {
    case "it":
      return [
        [
          `Come si collega ${name} ai miei strumenti?`,
          `${name} si collega tramite integrazioni API sicure con OAuth 2.0. Approvi ogni connessione una sola volta e l'agente gestisce il resto.`,
        ],
        [
          `Posso personalizzare cosa automatizza ${name}?`,
          `Sì. Puoi configurare trigger, azioni e output per adattarli al tuo workflow esatto. L'agente impara dalle tue regolazioni nel tempo.`,
        ],
        [
          `Quanto tempo serve perché ${name} sia pienamente operativo?`,
          `Il setup richiede in genere ${sameDay ? "lo stesso giorno" : "1-2 giorni lavorativi"}, inclusa la configurazione delle integrazioni e il primo test del workflow.`,
        ],
        [
          `I miei dati sono al sicuro con ${name}?`,
          `Tutti i dati sono crittografati in transito e a riposo. L'agente opera in un ambiente conforme al GDPR con controlli SOC 2.`,
        ],
      ];
    case "es":
      return [
        [
          `¿Cómo se conecta ${name} a mis herramientas?`,
          `${name} se conecta mediante integraciones API seguras con OAuth 2.0. Apruebas cada conexión una sola vez y el agente se encarga del resto.`,
        ],
        [
          `¿Puedo personalizar lo que automatiza ${name}?`,
          `Sí. Puedes configurar disparadores, acciones y resultados para adaptarlos a tu flujo de trabajo exacto. El agente aprende de tus ajustes con el tiempo.`,
        ],
        [
          `¿Cuánto tiempo tarda ${name} en estar totalmente operativo?`,
          `La configuración suele tardar ${sameDay ? "el mismo día" : "1-2 días laborables"}, incluida la configuración de las integraciones y la primera prueba del flujo.`,
        ],
        [
          `¿Mis datos están seguros con ${name}?`,
          `Todos los datos se cifran en tránsito y en reposo. El agente opera en un entorno conforme al RGPD con controles SOC 2.`,
        ],
      ];
    case "de":
      return [
        [
          `Wie verbindet sich ${name} mit meinen Tools?`,
          `${name} verbindet sich über sichere API-Integrationen mit OAuth 2.0. Du genehmigst jede Verbindung einmal und der Agent übernimmt den Rest.`,
        ],
        [
          `Kann ich anpassen, was ${name} automatisiert?`,
          `Ja. Du kannst Trigger, Aktionen und Ausgaben so konfigurieren, dass sie zu deinem exakten Workflow passen. Der Agent lernt mit der Zeit aus deinen Anpassungen.`,
        ],
        [
          `Wie lange dauert es, bis ${name} voll einsatzbereit ist?`,
          `Die Einrichtung dauert in der Regel ${sameDay ? "am selben Tag" : "1-2 Werktage"}, einschließlich Konfiguration der Integrationen und des ersten Workflow-Tests.`,
        ],
        [
          `Sind meine Daten bei ${name} sicher?`,
          `Alle Daten werden während der Übertragung und im Ruhezustand verschlüsselt. Der Agent arbeitet in einer DSGVO-konformen Umgebung mit SOC-2-Kontrollen.`,
        ],
      ];
    case "fr":
      return [
        [
          `Comment ${name} se connecte-t-il à mes outils ?`,
          `${name} se connecte via des intégrations API sécurisées avec OAuth 2.0. Vous approuvez chaque connexion une seule fois et l'agent gère le reste.`,
        ],
        [
          `Puis-je personnaliser ce que ${name} automatise ?`,
          `Oui. Vous pouvez configurer déclencheurs, actions et sorties pour correspondre à votre flux de travail exact. L'agent apprend de vos ajustements au fil du temps.`,
        ],
        [
          `Combien de temps faut-il pour que ${name} soit pleinement opérationnel ?`,
          `La configuration prend généralement ${sameDay ? "le jour même" : "1 à 2 jours ouvrés"}, y compris la configuration des intégrations et le premier test du flux.`,
        ],
        [
          `Mes données sont-elles en sécurité avec ${name} ?`,
          `Toutes les données sont chiffrées en transit et au repos. L'agent opère dans un environnement conforme au RGPD avec des contrôles SOC 2.`,
        ],
      ];
    default:
      return [
        [
          `How does ${name} connect to my tools?`,
          `${name} connects via secure API integrations with OAuth 2.0. You approve each connection once and the agent handles the rest.`,
        ],
        [
          `Can I customize what ${name} automates?`,
          `Yes. You can configure triggers, actions, and outputs to match your exact workflow. The agent learns from your adjustments over time.`,
        ],
        [
          `How long until ${name} is fully operational?`,
          `Setup typically takes ${sameDay ? "same day" : "1-2 business days"}, including integration configuration and first workflow test.`,
        ],
        [
          `Is my data secure with ${name}?`,
          `All data is encrypted in transit and at rest. The agent operates in a GDPR-compliant environment with SOC 2 controls.`,
        ],
      ];
  }
}