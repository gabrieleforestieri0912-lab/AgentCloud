/**
 * Catalogo skill: overlay di localizzazione (plugin slug → campi localizzati).
 *
 * Il contenuto canonico vive in `src/lib/skills/catalog.ts` in italiano
 * (lingua di default). I file `skillCatalog.{en,es,de,fr}.ts` forniscono la
 * versione localizzata dei campi mostrati nella UI e negli .zip scaricabili,
 * indicizzati per slug di plugin e di skill. `localizePlugin()` applica
 * l'overlay in base alla lingua attiva; per l'italiano i dati canonici
 * vengono usati così come sono.
 *
 * Stesso pattern di `agentCatalog.ts` (ma con canonico italiano): gli slug,
 * i permessi, i livelli di rischio, le versioni e le date restano quelli
 * canonici e non fanno parte dell'overlay.
 */
import type { SkillPlugin } from "../skills/catalog";
import type { Locale } from "./constants";
import { SKILL_LOCALIZATIONS_EN } from "./skillCatalog.en";
import { SKILL_LOCALIZATIONS_ES } from "./skillCatalog.es";
import { SKILL_LOCALIZATIONS_DE } from "./skillCatalog.de";
import { SKILL_LOCALIZATIONS_FR } from "./skillCatalog.fr";

export type SkillLocalization = {
  name: string;
  description: string;
  whenNot: string[];
  procedure: string[];
  rules: string[];
  output: string;
  example: string;
};

export type PluginLocalization = {
  name: string;
  tagline: string;
  description: string;
  /** Etichetta di visualizzazione della categoria (lo slug resta canonico). */
  category: string;
  /** Motivazioni degli agenti consigliati, per slug agente. */
  agents: Record<string, string>;
  /** Motivazioni delle integrazioni, per `brand` canonico del catalogo. */
  integrations: Record<string, string>;
  changelog: { version: string; date: string; changes: string[] }[];
  /** Competenze localizzate, per slug skill. */
  skills: Record<string, SkillLocalization>;
};

const SKILL_LOCALIZATIONS: Record<
  Exclude<Locale, "it">,
  Record<string, PluginLocalization>
> = {
  en: SKILL_LOCALIZATIONS_EN,
  es: SKILL_LOCALIZATIONS_ES,
  de: SKILL_LOCALIZATIONS_DE,
  fr: SKILL_LOCALIZATIONS_FR,
};

/** Overlay di localizzazione per uno slug di plugin, o null se assente. */
export function getSkillLocalization(
  pluginSlug: string,
  locale: Locale,
): PluginLocalization | null {
  if (locale === "it") return null;
  return SKILL_LOCALIZATIONS[locale][pluginSlug] ?? null;
}

/**
 * Restituisce una copia del plugin con i campi testuali localizzati.
 * I campi non coperti dall'overlay (o l'overlay mancante) restano in italiano:
 * meglio una stringa italiana che una card vuota.
 */
export function localizePlugin(plugin: SkillPlugin, locale: Locale): SkillPlugin {
  const overlay = getSkillLocalization(plugin.slug, locale);
  if (!overlay) return plugin;
  // Etichetta categoria: vale l'overlay, con fallback sulla tabella centrale
  // (stessa etichetta per tutti i plugin della categoria).
  const categoryLabel =
    overlay.category ||
    (locale !== "it" ? SKILL_CATEGORY_LABELS[locale][plugin.category] : undefined) ||
    plugin.category;
  return {
    ...plugin,
    name: overlay.name || plugin.name,
    tagline: overlay.tagline || plugin.tagline,
    description: overlay.description || plugin.description,
    category: categoryLabel,
    agents: plugin.agents.map((a) => ({
      ...a,
      rationale: overlay.agents[a.slug] || a.rationale,
    })),
    integrations: plugin.integrations.map((i) => ({
      ...i,
      rationale: overlay.integrations[i.brand] || i.rationale,
    })),
    changelog:
      overlay.changelog.length > 0 ? overlay.changelog : plugin.changelog,
    skills: plugin.skills.map((s) => {
      const localized = overlay.skills[s.slug];
      if (!localized) return s;
      return {
        ...s,
        name: localized.name || s.name,
        description: localized.description || s.description,
        whenNot: localized.whenNot.length > 0 ? localized.whenNot : s.whenNot,
        procedure:
          localized.procedure.length > 0 ? localized.procedure : s.procedure,
        rules: localized.rules.length > 0 ? localized.rules : s.rules,
        output: localized.output || s.output,
        example: localized.example || s.example,
      };
    }),
  };
}

/* ------------------------------------------------------------------ *
 * Etichette delle categorie (gli slug restano quelli canonici)
 * ------------------------------------------------------------------ */

/** Etichetta di visualizzazione di una categoria del catalogo skill. */

const SKILL_CATEGORY_LABELS: Record<Exclude<Locale, "it">, Record<string, string>> = {
  en: {
    ecommerce: "E-commerce",
    sales: "Sales",
    support: "Support",
    productivity: "Productivity",
    finance: "Finance",
    marketing: "Marketing",
    analytics: "Analytics",
    hr: "Human resources",
    research: "Research",
  },
  es: {
    ecommerce: "E-commerce",
    sales: "Ventas",
    support: "Soporte",
    productivity: "Productividad",
    finance: "Finanzas",
    marketing: "Marketing",
    analytics: "Analítica",
    hr: "Recursos humanos",
    research: "Investigación",
  },
  de: {
    ecommerce: "E-Commerce",
    sales: "Vertrieb",
    support: "Support",
    productivity: "Produktivität",
    finance: "Finanzen",
    marketing: "Marketing",
    analytics: "Analysen",
    hr: "Personal",
    research: "Recherche",
  },
  fr: {
    ecommerce: "E-commerce",
    sales: "Ventes",
    support: "Assistance",
    productivity: "Productivité",
    finance: "Finance",
    marketing: "Marketing",
    analytics: "Analytique",
    hr: "Ressources humaines",
    research: "Recherche",
  },
};

/* ------------------------------------------------------------------ *
 * Stringhe fisse dei pacchetti .zip (intestazioni SKILL.md e README)
 * ------------------------------------------------------------------ */

export type ZipStrings = {
  localeTag: string;
  whenToUse: string;
  whenToUseBullets: [string, string];
  activationExample: string;
  whenNotToUse: string;
  whenNotFallback: string;
  procedure: string;
  procedureFallback: string[];
  rules: string;
  rulesFallback: string[];
  highRiskNote: string[];
  integrationLimits: string[];
  expectedOutput: string;
  examples: string;
  exampleRequest: string;
  exampleRequestFallback: string;
  readmeContents: string;
  readmeRisk: string;
  readmeAgents: string;
  readmePrimary: string;
  readmeSecondary: string;
  readmeIntegrations: string;
  readmeComingSoon: string;
  readmeRequired: string;
  readmeOptional: string;
  readmeInstall: string;
  readmeInstallSteps: string[];
  readmeRules: string;
  readmeRulesBullets: string[];
};

const ZIP_STRINGS_IT: ZipStrings = {
  localeTag: "it",
  whenToUse: "Quando usarla",
  whenToUseBullets: [
    "La richiesta del cliente riguarda direttamente questo compito.",
    "I dati necessari sono disponibili nelle integrazioni collegate.",
  ],
  activationExample: "Esempio di attivazione",
  whenNotToUse: "Quando NON usarla",
  whenNotFallback: "Il compito esce dagli ambiti descritti sopra.",
  procedure: "Procedura passo-passo",
  procedureFallback: [
    "Raccogli gli input necessari dalla richiesta.",
    "Leggi i dati dalle integrazioni collegate.",
    "Applica le regole della sezione successiva.",
    "Restituisci l'output nel formato dichiarato.",
  ],
  rules: "Regole e vincoli",
  rulesFallback: [
    "Tono: professionale, diretto, orientato al risultato.",
    "Nessun dato inventato: se manca, si dichiara che manca.",
    "GDPR: solo i dati necessari, mai segreti nei documenti.",
  ],
  highRiskNote: [
    "> **Azione ad alto rischio**: le operazioni che comportano effetti",
    "> esterni (invio a terzi, pagamenti, pubblicazioni, cancellazioni)",
    "> richiedono l'approvazione esplicita dell'utente prima di procedere.",
  ],
  integrationLimits: [
    "- La skill non può usare integrazioni diverse da quelle collegate all'agente.",
    "- Le integrazioni «in arrivo» non sono mai un prerequisito: in attesa si lavora",
    "  in modalità manuale e si esporta il risultato.",
  ],
  expectedOutput: "Output atteso",
  examples: "Esempi",
  exampleRequest: "Richiesta",
  exampleRequestFallback: "descrivi il compito come lo farebbe un utente.",
  readmeContents: "Cosa contiene",
  readmeRisk: "rischio",
  readmeAgents: "Agenti consigliati",
  readmePrimary: "primario",
  readmeSecondary: "secondario",
  readmeIntegrations: "Integrazioni consigliate",
  readmeComingSoon: "in arrivo",
  readmeRequired: "necessaria",
  readmeOptional: "opzionale",
  readmeInstall: "Installazione",
  readmeInstallSteps: [
    "Scarica questo pacchetto e decomprimilo.",
    "In AgentCloud apri `/plugins` e installa il plugin sull'agente scelto.",
    "Oppure carica la singola cartella come skill personalizzata da `/skills`.",
  ],
  readmeRules: "Regole",
  readmeRulesBullets: [
    "Le skill ad alto rischio richiedono approvazione esplicita.",
    "Nessuna integrazione «in arrivo» è un prerequisito.",
    "Le skill non possono accedere a dati fuori dal tuo account.",
  ],
};

const ZIP_STRINGS: Record<Locale, ZipStrings> = {
  it: ZIP_STRINGS_IT,
  en: {
    localeTag: "en",
    whenToUse: "When to use it",
    whenToUseBullets: [
      "The customer request is directly about this task.",
      "The required data is available in the connected integrations.",
    ],
    activationExample: "Trigger example",
    whenNotToUse: "When NOT to use it",
    whenNotFallback: "The task falls outside the scope described above.",
    procedure: "Step-by-step procedure",
    procedureFallback: [
      "Collect the required inputs from the request.",
      "Read the data from the connected integrations.",
      "Apply the rules in the next section.",
      "Return the output in the declared format.",
    ],
    rules: "Rules and constraints",
    rulesFallback: [
      "Tone: professional, direct, result-oriented.",
      "Never invent data: if it is missing, say so.",
      "GDPR: only the necessary data, never secrets in documents.",
    ],
    highRiskNote: [
      "> **High-risk action**: operations with external effects",
      "> (sending to third parties, payments, publishing, cancellations)",
      "> require the user's explicit approval before proceeding.",
    ],
    integrationLimits: [
      "- The skill cannot use integrations other than those connected to the agent.",
      "- “Coming soon” integrations are never a prerequisite: while waiting, work",
      "  in manual mode and export the result.",
    ],
    expectedOutput: "Expected output",
    examples: "Examples",
    exampleRequest: "Request",
    exampleRequestFallback: "describe the task as a user would.",
    readmeContents: "What's inside",
    readmeRisk: "risk",
    readmeAgents: "Recommended agents",
    readmePrimary: "primary",
    readmeSecondary: "secondary",
    readmeIntegrations: "Recommended integrations",
    readmeComingSoon: "coming soon",
    readmeRequired: "required",
    readmeOptional: "optional",
    readmeInstall: "Installation",
    readmeInstallSteps: [
      "Download this package and unzip it.",
      "In AgentCloud open `/plugins` and install the plugin on your chosen agent.",
      "Or upload a single folder as a custom skill from `/skills`.",
    ],
    readmeRules: "Rules",
    readmeRulesBullets: [
      "High-risk skills require explicit approval.",
      "No “coming soon” integration is a prerequisite.",
      "Skills cannot access data outside your account.",
    ],
  },
  es: {
    localeTag: "es",
    whenToUse: "Cuándo usarla",
    whenToUseBullets: [
      "La petición del cliente trata directamente de esta tarea.",
      "Los datos necesarios están disponibles en las integraciones conectadas.",
    ],
    activationExample: "Ejemplo de activación",
    whenNotToUse: "Cuándo NO usarla",
    whenNotFallback: "La tarea queda fuera del ámbito descrito arriba.",
    procedure: "Procedimiento paso a paso",
    procedureFallback: [
      "Recoge los datos necesarios de la petición.",
      "Lee los datos de las integraciones conectadas.",
      "Aplica las reglas de la sección siguiente.",
      "Devuelve el resultado en el formato declarado.",
    ],
    rules: "Reglas y límites",
    rulesFallback: [
      "Tono: profesional, directo, orientado al resultado.",
      "Nunca inventes datos: si faltan, dilo.",
      "GDPR: solo los datos necesarios, nunca secretos en los documentos.",
    ],
    highRiskNote: [
      "> **Acción de alto riesgo**: las operaciones con efectos externos",
      "> (envíos a terceros, pagos, publicaciones, cancelaciones)",
      "> requieren la aprobación explícita del usuario antes de continuar.",
    ],
    integrationLimits: [
      "- La competencia no puede usar integraciones distintas de las conectadas al agente.",
      "- Las integraciones «próximamente» nunca son un requisito: mientras tanto se trabaja",
      "  en modo manual y se exporta el resultado.",
    ],
    expectedOutput: "Resultado esperado",
    examples: "Ejemplos",
    exampleRequest: "Petición",
    exampleRequestFallback: "describe la tarea como lo haría un usuario.",
    readmeContents: "Contenido",
    readmeRisk: "riesgo",
    readmeAgents: "Agentes recomendados",
    readmePrimary: "principal",
    readmeSecondary: "secundario",
    readmeIntegrations: "Integraciones recomendadas",
    readmeComingSoon: "próximamente",
    readmeRequired: "necesaria",
    readmeOptional: "opcional",
    readmeInstall: "Instalación",
    readmeInstallSteps: [
      "Descarga este paquete y descomprímelo.",
      "En AgentCloud abre `/plugins` e instala el plugin en el agente elegido.",
      "O sube una sola carpeta como competencia personalizada desde `/skills`.",
    ],
    readmeRules: "Reglas",
    readmeRulesBullets: [
      "Las competencias de alto riesgo requieren aprobación explícita.",
      "Ninguna integración «próximamente» es un requisito.",
      "Las competencias no pueden acceder a datos fuera de tu cuenta.",
    ],
  },
  de: {
    localeTag: "de",
    whenToUse: "Wann sie zu verwenden ist",
    whenToUseBullets: [
      "Die Kundenanfrage betrifft direkt diese Aufgabe.",
      "Die benötigten Daten sind in den verbundenen Integrationen verfügbar.",
    ],
    activationExample: "Auslösebeispiel",
    whenNotToUse: "Wann sie NICHT zu verwenden ist",
    whenNotFallback: "Die Aufgabe liegt außerhalb des oben beschriebenen Rahmens.",
    procedure: "Schritt-für-Schritt-Ablauf",
    procedureFallback: [
      "Die nötigen Eingaben aus der Anfrage sammeln.",
      "Die Daten aus den verbundenen Integrationen lesen.",
      "Die Regeln im nächsten Abschnitt anwenden.",
      "Das Ergebnis im erklärten Format zurückgeben.",
    ],
    rules: "Regeln und Grenzen",
    rulesFallback: [
      "Ton: professionell, direkt, ergebnisorientiert.",
      "Keine Daten erfinden: Fehlendes wird als fehlend benannt.",
      "DSGVO: nur die nötigen Daten, niemals Geheimnisse in Dokumenten.",
    ],
    highRiskNote: [
      "> **Hochrisiko-Aktion**: Vorgänge mit externer Wirkung",
      "> (Versand an Dritte, Zahlungen, Veröffentlichungen, Stornierungen)",
      "> brauchen vorab die ausdrückliche Freigabe des Nutzers.",
    ],
    integrationLimits: [
      "- Die Kompetenz darf nur die mit dem Agenten verbundenen Integrationen nutzen.",
      "- „Demnächst“-Integrationen sind nie Voraussetzung: Bis dahin wird manuell",
      "  gearbeitet und das Ergebnis exportiert.",
    ],
    expectedOutput: "Erwartetes Ergebnis",
    examples: "Beispiele",
    exampleRequest: "Anfrage",
    exampleRequestFallback: "beschreibe die Aufgabe so, wie ein Nutzer es tun würde.",
    readmeContents: "Inhalt",
    readmeRisk: "Risiko",
    readmeAgents: "Empfohlene Agenten",
    readmePrimary: "primär",
    readmeSecondary: "sekundär",
    readmeIntegrations: "Empfohlene Integrationen",
    readmeComingSoon: "demnächst",
    readmeRequired: "erforderlich",
    readmeOptional: "optional",
    readmeInstall: "Installation",
    readmeInstallSteps: [
      "Dieses Paket herunterladen und entpacken.",
      "In AgentCloud `/plugins` öffnen und das Plugin auf dem gewählten Agenten installieren.",
      "Oder einen einzelnen Ordner als eigene Kompetenz über `/skills` hochladen.",
    ],
    readmeRules: "Regeln",
    readmeRulesBullets: [
      "Kompetenzen mit hohem Risiko brauchen eine ausdrückliche Freigabe.",
      "Keine „Demnächst“-Integration ist Voraussetzung.",
      "Kompetenzen haben keinen Zugriff auf Daten außerhalb deines Kontos.",
    ],
  },
  fr: {
    localeTag: "fr",
    whenToUse: "Quand l'utiliser",
    whenToUseBullets: [
      "La demande du client porte directement sur cette tâche.",
      "Les données nécessaires sont disponibles dans les intégrations connectées.",
    ],
    activationExample: "Exemple de déclenchement",
    whenNotToUse: "Quand NE PAS l'utiliser",
    whenNotFallback: "La tâche sort du cadre décrit ci-dessus.",
    procedure: "Procédure pas à pas",
    procedureFallback: [
      "Recueillir les éléments nécessaires depuis la demande.",
      "Lire les données dans les intégrations connectées.",
      "Appliquer les règles de la section suivante.",
      "Renvoyer le résultat au format déclaré.",
    ],
    rules: "Règles et limites",
    rulesFallback: [
      "Ton : professionnel, direct, orienté résultat.",
      "Ne jamais inventer de données : si elles manquent, le dire.",
      "RGPD : uniquement les données nécessaires, jamais de secrets dans les documents.",
    ],
    highRiskNote: [
      "> **Action à haut risque** : les opérations à effet externe",
      "> (envois à des tiers, paiements, publications, annulations)",
      "> exigent l'approbation explicite de l'utilisateur avant de continuer.",
    ],
    integrationLimits: [
      "- La compétence ne peut utiliser que les intégrations connectées à l'agent.",
      "- Les intégrations « bientôt » ne sont jamais un prérequis : en attendant,",
      "  on travaille en mode manuel et on exporte le résultat.",
    ],
    expectedOutput: "Résultat attendu",
    examples: "Exemples",
    exampleRequest: "Demande",
    exampleRequestFallback: "décris la tâche comme le ferait un utilisateur.",
    readmeContents: "Contenu",
    readmeRisk: "risque",
    readmeAgents: "Agents recommandés",
    readmePrimary: "principal",
    readmeSecondary: "secondaire",
    readmeIntegrations: "Intégrations recommandées",
    readmeComingSoon: "bientôt",
    readmeRequired: "requise",
    readmeOptional: "optionnelle",
    readmeInstall: "Installation",
    readmeInstallSteps: [
      "Télécharge ce paquet et décompresse-le.",
      "Dans AgentCloud, ouvre `/plugins` et installe le plugin sur l'agent choisi.",
      "Ou charge un seul dossier comme compétence personnelle depuis `/skills`.",
    ],
    readmeRules: "Règles",
    readmeRulesBullets: [
      "Les compétences à haut risque exigent une approbation explicite.",
      "Aucune intégration « bientôt » n'est un prérequis.",
      "Les compétences n'accèdent pas aux données hors de ton compte.",
    ],
  },
};

/** Stringhe fisse del pacchetto .zip per la lingua attiva. */
export function getZipStrings(locale: Locale): ZipStrings {
  return ZIP_STRINGS[locale] ?? ZIP_STRINGS_IT;
}

/**
 * Nome e descrizione localizzati di una singola skill per slug.
 *
 * Serve dove il nome arriva dal DB (dashboard) e non dal catalogo già
 * localizzato: cerca lo slug in tutti i plugin. `null` quando non c'è
 * overlay (skill utente o lingua italiana).
 */
export function getLocalizedSkillInfo(
  skillSlug: string,
  locale: Locale,
): { name: string; description: string } | null {
  if (locale === "it") return null;
  const table = SKILL_LOCALIZATIONS[locale];
  for (const pluginSlug of Object.keys(table)) {
    const skill = table[pluginSlug]?.skills[skillSlug];
    if (skill) return { name: skill.name, description: skill.description };
  }
  return null;
}
