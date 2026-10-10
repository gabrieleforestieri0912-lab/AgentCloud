/**
 * Stringhe delle pagine Competenze (`/skills` e `/skills/[plugin]`).
 *
 * Perché un modulo dedicato e non `dictionaries.ts`: i testi di queste pagine
 * sono specifici della pagina (come per `agentDetail.ts`) e il dizionario
 * principale è già molto grande. IT/EN/ES/DE/FR con default `en`, in linea
 * con il resto del sito.
 */

import type { Locale } from "./constants";

export type SkillsDictionary = {
  label: string;
  heroTitle: string;
  heroSubtitle: string;
  heroNote: string;
  metaTitle: string;
  metaDescription: string;
  browseAgents: string;
  allCategories: string;
  category: string;
  agent: string;
  integration: string;
  onlyAvailable: string;
  searchPlaceholder: string;
  searchLabel: string;
  clearFilters: string;
  resultsCount: string;
  skillsCount: string;
  pluginsCount: string;
  noResults: string;
  noResultsHint: string;
  includedSkills: string;
  primaryAgents: string;
  integrations: string;
  required: string;
  optional: string;
  arriving: string;
  download: string;
  downloadAria: string;
  install: string;
  detail: string;
  viewDetail: string;
  chatExamples: string;
  chatExamplesIntro: string;
  permissions: string;
  riskLevel: string;
  riskLow: string;
  riskMedium: string;
  riskHigh: string;
  riskHighHint: string;
  version: string;
  recommendedAgents: string;
  recommendedIntegrations: string;
  whySkill: string;
  backToCatalog: string;
  pluginNotFound: string;
  notFoundTitle: string;
  notFoundBody: string;
  liveOnly: string;
  allIntegrationsLabel: string;
  progressiveDisclosure: string;
  progressiveDisclosureBody: string;
  downloadAllNote: string;
  /** Label del livello di fit dell'agente. */
  fitPrimary: string;
  fitSecondary: string;
  related: string;
  // --- Dashboard e scheda agente ---
  dashboardTitle: string;
  dashboardUses: string;
  dashboardEmptyTitle: string;
  dashboardEmptyBody: string;
  dashboardSuccess: string;
  lastUse: string;
  neverUsed: string;
  tokens: string;
  enable: string;
  disable: string;
  toggleError: string;
  ownerUser: string;
  on: string;
  // --- Scheda Competenze della pagina agente ---
  agentTab: string;
  agentTabTitle: string;
  agentTabBody: string;
  agentTabPrimary: string;
  agentTabSecondary: string;
  installAll: string;
  installAllDone: string;
  installing: string;
  installedBadge: string;
  missingIntegrations: string;
  missingIntegrationsBody: string;
  connectInTwoMinutes: string;
  notifyMe: string;
  notifyMeDone: string;
  degradedMode: string;
  degradedModeBody: string;
  enabledSkills: string;
  noRecommended: string;
  noRecommendedBody: string;
  installSkill: string;
  removeSkill: string;
  /** Ricerca nella scheda Competenze della pagina agente (non nel catalogo). */
  agentTabSearch: string;
  agentTabSearchLabel: string;
  agentTabNoResults: string;
  // --- Upload ---
  uploadTitle: string;
  uploadBody: string;
  uploadDropzone: string;
  uploadChoose: string;
  uploadValidating: string;
  uploadSuccess: string;
  uploadError: string;
  uploadPrivateNote: string;
  uploadWarnings: string;
  uploadFiles: string;
  uploadPreview: string;
  uploadClear: string;
  uploadRequiresLogin: string;
  templateDownload: string;
  browseSkills: string;
  // --- Changelog plugin ---
  changelogTitle: string;
  // --- Politica prezzi ---
  pricingTitle: string;
  pricingIncluded: string;
  pricingIncludedBody: string;
  pricingAddon: string;
  pricingAddonBody: string;
  pricingNote: string;
  // --- Guida /docs/skills ---
  docsTitle: string;
  docsIntro: string;
  docsStep1: string;
  docsStep1Body: string;
  docsStep2: string;
  docsStep2Body: string;
  docsStep3: string;
  docsStep3Body: string;
  docsStep4: string;
  docsStep4Body: string;
  docsStep5: string;
  docsStep5Body: string;
  docsRulesTitle: string;
  docsRuleFrontmatter: string;
  docsRuleLength: string;
  docsRuleSecrets: string;
  docsRuleScripts: string;
  docsRulePermissions: string;
  docsRuleRisk: string;
  docsSafetyTitle: string;
  docsSafetyBody: string;
  docsTemplateTitle: string;
};

const EN: SkillsDictionary = {
  label: "Skills",
  heroTitle: "Teach your agents the way your business works",
  heroSubtitle:
    "Competenze are reusable playbooks for your AI agents: procedures, rules, templates and examples. The agent loads a skill only when the request matches it.",
  heroNote:
    "Every skill is downloadable as a .zip and installable on your agent in one click.",
  metaTitle: "Skills & Plugins - AgentCloud",
  metaDescription:
    "Competenze for AgentCloud agents: ready-to-use playbooks for e-commerce, leads, support, bookings, finance, SEO, HR and more. Download the .zip or install with one click.",
  browseAgents: "Browse agents",
  allCategories: "All",
  category: "Category",
  agent: "Agent",
  integration: "Integration",
  onlyAvailable: "Available now only",
  searchPlaceholder: "Search a plugin",
  searchLabel: "Search plugins",
  clearFilters: "Clear filters",
  resultsCount: "{count} plugins",
  skillsCount: "{count} skills",
  pluginsCount: "{count} plugins",
  noResults: "No plugin matches these filters",
  noResultsHint: "Try removing a filter or searching for something else.",
  includedSkills: "Included skills",
  primaryAgents: "Recommended agents",
  integrations: "Recommended integrations",
  required: "Required",
  optional: "Optional",
  arriving: "Coming soon",
  download: "Download .zip",
  downloadAria: "Download the plugin {name} as a zip file",
  install: "Install on my agent",
  detail: "See details",
  viewDetail: "Open plugin",
  chatExamples: "Example requests",
  chatExamplesIntro: "Try these in the chat: the agent picks the right skill on its own.",
  permissions: "Required permissions",
  riskLevel: "Risk level",
  riskLow: "Low",
  riskMedium: "Medium",
  riskHigh: "High",
  riskHighHint:
    "High-risk actions (emails to customers, publishing, payments, cancellations) require your explicit approval.",
  version: "Version",
  recommendedAgents: "Agents this plugin is built for",
  recommendedIntegrations: "Integrations and why",
  whySkill: "What it does",
  backToCatalog: "Back to all skills",
  pluginNotFound: "Plugin not found",
  notFoundTitle: "This plugin does not exist",
  notFoundBody: "It may have been renamed. Browse the catalog to find what you need.",
  liveOnly: "Live",
  allIntegrationsLabel: "Integrations",
  progressiveDisclosure: "How it works in chat",
  progressiveDisclosureBody:
    "The agent sees only the name and description of each enabled skill. The full instructions are loaded only when the request matches, so your context stays clean.",
  downloadAllNote: "Download includes every SKILL.md in Italian, ready to install manually.",
  fitPrimary: "Primary",
  fitSecondary: "Secondary",
  related: "You may also like",
  browseSkills: "Browse skills",
  dashboardTitle: "Installed skills",
  dashboardUses: "activations",
  dashboardEmptyTitle: "No skill installed",
  dashboardEmptyBody: "Install a plugin from the catalog: the agent picks the right skill on its own when the request matches.",
  dashboardSuccess: "Success",
  lastUse: "Last used",
  neverUsed: "Not used yet",
  tokens: "Tokens",
  enable: "Enable",
  disable: "Disable",
  toggleError: "Could not update the skill. Try again.",
  ownerUser: "Personal",
  on: "On",
  agentTab: "Skills",
  agentTabTitle: "Recommended skills for this agent",
  agentTabBody: "Skills are procedures the agent loads only when the request matches. Every skill still stays within the permissions of the connected integrations.",
  agentTabPrimary: "Recommended",
  agentTabSecondary: "Compatible",
  installAll: "Install all",
  installAllDone: "Skills installed",
  installing: "Installing…",
  installedBadge: "Installed",
  missingIntegrations: "Missing integrations",
  missingIntegrationsBody: "Connect these apps to get the most out of the skill. The skill stays installed and keeps working in reduced mode.",
  connectInTwoMinutes: "Connect in 2 minutes",
  notifyMe: "Notify me",
  notifyMeDone: "We'll let you know",
  degradedMode: "Manual mode",
  degradedModeBody: "The integration is not available yet: the agent still prepares the work and exports it, without writing to the app.",
  enabledSkills: "Active skills",
  noRecommended: "No recommended skill",
  noRecommendedBody: "There are no plugins in the catalog for this agent yet.",
  installSkill: "Install",
    agentTabSearch: "Search skills or plugins",
    agentTabSearchLabel: "Search skills in this agent",
    agentTabNoResults: "No skill matches your search",
  removeSkill: "Remove",
  uploadTitle: "Upload your skill",
  uploadBody: "Drop your skill .zip here (a folder with SKILL.md). We validate frontmatter, size and content on the server.",
  uploadDropzone: "Drop the .zip here, or",
  uploadChoose: "choose the file",
  uploadValidating: "Validating…",
  uploadSuccess: "Skill uploaded",
  uploadError: "Upload failed",
  uploadPrivateNote: "The skill stays private: only you can see it.",
  uploadWarnings: "Warnings",
  uploadFiles: "Files in the package",
  uploadPreview: "Preview",
  uploadClear: "Clear",
  uploadRequiresLogin: "Sign in to upload a personal skill.",
  templateDownload: "Download the template",
  changelogTitle: "What's new",
  pricingTitle: "What it costs",
  pricingIncluded: "Official skills included",
  pricingIncludedBody: "All official skills of a plugin are included in the agent price. Install, remove and download freely: no extra fee.",
  pricingAddon: "Premium skills (add-on)",
  pricingAddonBody: "A premium plugin is a separate add-on, enabled on a single agent. It's a one-off fee per installation and the skills it contains stay active while the add-on is active.",
  pricingNote: "The skills you create and upload are always free and private to your account, even with a premium plugin active.",
  docsTitle: "Create your skill in 10 minutes",
  docsIntro: "A skill is a folder of instructions that teaches an agent how to do a type of work well. There is only one file that matters: SKILL.md. Start from the template, write when the skill should trigger, upload it: the agent uses it on its own when the request matches.",
  docsStep1: "Download the template",
  docsStep1Body: "Start from SKILL.md already wired: frontmatter, sections and notes are in place. Rename the folder with your skill slug.",
  docsStep2: "Write the description (the part that matters)",
  docsStep2Body: "The agent only sees name and description until it knows the skill is relevant. Write what it does AND when to use it, with concrete triggers: \"use when the customer asks for an order status\".",
  docsStep3: "Fill in procedure, rules and output",
  docsStep3Body: "The procedure is the step-by-step the agent follows. Rules are the constraints (tone, tax, limits, GDPR). Expected output is the exact format: without it every answer differs.",
  docsStep4: "Zip it and upload",
  docsStep4Body: "Zip the folder (SKILL.md required; references/, templates/, examples/ optional) and drop it in the \"Upload your skill\" section on /skills. Validation runs server-side and tells you what to fix.",
  docsStep5: "Install it on the agent",
  docsStep5Body: "From the agent page open the Skills tab and install yours. From then on the skill enters the agent context, within the permissions of the connected integrations.",
  docsRulesTitle: "What the validator checks",
  docsRuleFrontmatter: "SKILL.md must open and close the frontmatter with ---, with name, description, version, risk_level.",
  docsRuleLength: "The body cannot exceed 500 lines: long references go in references/.",
  docsRuleSecrets: "No API keys, tokens or Authorization headers: the file ends up in the agent context.",
  docsRuleScripts: "Scripts may only do local computation: no external links, remote shell or environment access.",
  docsRulePermissions: "Declare the permissions you use; the agent applies them only if the integration is connected, otherwise the skill works in reduced mode.",
  docsRuleRisk: "With risk_level: high every action with an external effect asks for your explicit approval.",
  docsSafetyTitle: "Security and privacy",
  docsSafetyBody: "The skills you upload are private to your account: they do not appear in the public catalog and other users cannot see them. Every skill still stays within the agent permissions: if an integration is not connected, the skill cannot write to it.",
  docsTemplateTitle: "The full template",
};

const IT: SkillsDictionary = {
  label: "Competenze",
  heroTitle: "Insegna ai tuoi agenti il tuo modo di lavorare",
  heroSubtitle:
    "Le Competenze sono procedure riutilizzabili per i tuoi agenti AI: come si fa, con quali regole, con quali template. L'agente carica una competenza solo quando la richiesta è pertinente.",
  heroNote:
    "Ogni competenza è scaricabile come .zip e installabile sul tuo agente con un click.",
  metaTitle: "Competenze e Plugin - AgentCloud",
  metaDescription:
    "Competenze per gli agenti AgentCloud: procedure pronte per e-commerce, lead, assistenza, prenotazioni, finanza, SEO, selezione e altro. Scarica il .zip o installa con un click.",
  browseAgents: "Vedi gli agenti",
  allCategories: "Tutte",
  category: "Categoria",
  agent: "Agente",
  integration: "Integrazione",
  onlyAvailable: "Solo disponibili ora",
  searchPlaceholder: "Cerca un plugin",
  searchLabel: "Cerca un plugin",
  clearFilters: "Azzera i filtri",
  resultsCount: "{count} plugin",
  skillsCount: "{count} competenze",
  pluginsCount: "{count} plugin",
  noResults: "Nessun plugin corrisponde ai filtri",
  noResultsHint: "Prova a togliere un filtro o cerca altro.",
  includedSkills: "Competenze incluse",
  primaryAgents: "Agenti consigliati",
  integrations: "Integrazioni consigliate",
  required: "Necessaria",
  optional: "Opzionale",
  arriving: "In arrivo",
  download: "Scarica .zip",
  downloadAria: "Scarica il plugin {name} come file zip",
  install: "Installa sul mio agente",
  detail: "Vedi dettagli",
  viewDetail: "Apri il plugin",
  chatExamples: "Esempi di richieste",
  chatExamplesIntro:
    "Prova queste in chat: l'agente sceglie da solo la competenza giusta.",
  permissions: "Permessi richiesti",
  riskLevel: "Livello di rischio",
  riskLow: "Basso",
  riskMedium: "Medio",
  riskHigh: "Alto",
  riskHighHint:
    "Le azioni ad alto rischio (email a clienti, pubblicazioni, pagamenti, cancellazioni) chiedono la tua approvazione esplicita.",
  version: "Versione",
  recommendedAgents: "Agenti per cui è pensato",
  recommendedIntegrations: "Integrazioni e perché",
  whySkill: "Cosa fa",
  backToCatalog: "Torna a tutte le competenze",
  pluginNotFound: "Plugin non trovato",
  notFoundTitle: "Questo plugin non esiste",
  notFoundBody: "Potrebbe essere stato rinominato. Sfoglia il catalogo per trovare quello che cerchi.",
  liveOnly: "Disponibile",
  allIntegrationsLabel: "Integrazioni",
  progressiveDisclosure: "Come funziona in chat",
  progressiveDisclosureBody:
    "L'agente vede solo nome e descrizione di ogni competenza abilitata. Le istruzioni complete vengono caricate solo quando la richiesta è pertinente, così il contesto resta pulito.",
  downloadAllNote:
    "Il download include tutti i SKILL.md in italiano, pronti per l'installazione manuale.",
  fitPrimary: "Primario",
  fitSecondary: "Secondario",
  related: "Potrebbero interessarti",
  browseSkills: "Sfoglia le competenze",
  // --- Dashboard e scheda agente ---
  dashboardTitle: "Competenze installate",
  dashboardUses: "attivazioni",
  dashboardEmptyTitle: "Nessuna competenza installata",
  dashboardEmptyBody:
    "Installa un plugin dal catalogo: l'agente userà la competenza giusta da solo quando la richiesta è pertinente.",
  dashboardSuccess: "Successo",
  lastUse: "Ultimo uso",
  neverUsed: "Non ancora usata",
  tokens: "Token",
  enable: "Attiva",
  disable: "Disattiva",
  toggleError: "Non sono riuscito ad aggiornare la competenza. Riprova.",
  ownerUser: "Personale",
  on: "Su",
  // --- Scheda Competenze della pagina agente ---
  agentTab: "Competenze",
  agentTabTitle: "Competenze consigliate per questo agente",
  agentTabBody:
    "Le competenze sono procedure che l'agente carica solo quando la richiesta è pertinente. Ogni competenza resta comunque dentro i permessi delle integrazioni collegate.",
  agentTabPrimary: "Consigliato",
  agentTabSecondary: "Compatibile",
  installAll: "Installa tutto",
  installAllDone: "Competenze installate",
  installing: "Installazione in corso…",
  installedBadge: "Installata",
  missingIntegrations: "Integrazioni mancanti",
  missingIntegrationsBody:
    "Collega queste app per usare la competenza al massimo. La competenza resta installata e funziona anche in modalità ridotta.",
  connectInTwoMinutes: "Connetti in 2 minuti",
  notifyMe: "Avvisami quando arriva",
  notifyMeDone: "Ti avviseremo",
  degradedMode: "Modalità manuale",
  degradedModeBody:
    "L'integrazione non è ancora disponibile: l'agente prepara comunque il lavoro e lo esporta, senza scrivere sull'app.",
  enabledSkills: "Competenze attive",
    agentTabSearch: "Cerca competenze o plugin",
    agentTabSearchLabel: "Cerca competenze in questo agente",
    agentTabNoResults: "Nessuna competenza corrisponde alla ricerca",
  noRecommended: "Nessuna competenza consigliata",
  noRecommendedBody: "Per questo agente non ci sono ancora plugin nel catalogo.",
  installSkill: "Installa",
  removeSkill: "Rimuovi",
  // --- Upload ---
  uploadTitle: "Carica la tua competenza",
  uploadBody:
    "Trascina qui lo .zip della tua competenza (cartella con SKILL.md). Validiamo frontmatter, dimensioni e contenuto lato server.",
  uploadDropzone: "Trascina lo .zip qui, oppure",
  uploadChoose: "scegli il file",
  uploadValidating: "Validazione in corso…",
  uploadSuccess: "Competenza caricata",
  uploadError: "Caricamento non riuscito",
  uploadPrivateNote: "La competenza resta privata: visibile solo a te.",
  uploadWarnings: "Avvisi",
  uploadFiles: "File nel pacchetto",
  uploadPreview: "Anteprima",
  uploadClear: "Rimuovi",
  uploadRequiresLogin: "Accedi per caricare una competenza personale.",
  templateDownload: "Scarica il template",
  changelogTitle: "Novità",
  pricingTitle: "Cosa costa",
  pricingIncluded: "Competenze ufficiali incluse",
  pricingIncludedBody: "Tutte le competenze ufficiali di un plugin sono incluse nel prezzo dell'agente. Installi, disinstalli e scarichi liberamente: nessun canone aggiuntivo.",
  pricingAddon: "Competenze premium (add-on)",
  pricingAddonBody: "Un plugin premium è un add-on a parte, attivabile sul singolo agente. Costa una tantum per installazione e le competenze che contiene restano attive finché l'addon è attivo.",
  pricingNote: "Le competenze che crei e carichi tu sono sempre gratis e private del tuo account, anche con un plugin premium attivo.",
  docsTitle: "Crea la tua competenza in 10 minuti",
  docsIntro: "Una competenza è una cartella di istruzioni che insegna a un agente come svolgere bene un tipo di lavoro. Il file che conta è uno solo: SKILL.md. Comincia dal template, scrivi quando la competenza deve attivarsi, caricala: l'agente la userà da solo quando la richiesta corrisponde.",
  docsStep1: "Scarica il template",
  docsStep1Body: "Parti da SKILL.md già impiantato: frontmatter, sezioni e commenti sono già al loro posto. Rinomina la cartella con lo slug della tua competenza.",
  docsStep2: "Scrivi la description (è la parte che conta)",
  docsStep2Body: "L'agente vede solo nome e descrizione finché non sa se la competenza è pertinente. Scrivi cosa fa E quando usarla, con i trigger concreti: «usare quando il cliente chiede lo stato di un ordine».",
  docsStep3: "Compila procedura, regole e output",
  docsStep3Body: "La procedura è il passo-passo che l'agente segue. Le regole sono i vincoli (tono, fiscalità, limiti, GDPR). L'output atteso è il formato esatto: senza, ogni risposta sarà diversa.",
  docsStep4: "Raccogli in un .zip e caricala",
  docsStep4Body: "Zippa la cartella (SKILL.md obbligatorio; references/, templates/, examples/ opzionali) e trascinala nella sezione «Carica la tua competenza» in /skills. La validazione è server-side e ti dice cosa correggere.",
  docsStep5: "Installala sull'agente",
  docsStep5Body: "Dalla pagina dell'agente apri la tab Competenze e installa la tua. Da quel momento la competenza entra nel contesto dell'agente, entro i permessi delle integrazioni collegate.",
  docsRulesTitle: "Cosa il validatore controlla",
  docsRuleFrontmatter: "SKILL.md deve iniziare e chiudere il frontmatter con ---, con name, description, version, risk_level.",
  docsRuleLength: "Il corpo non può superare 500 righe: i riferimenti lunghi vanno in references/.",
  docsRuleSecrets: "Nessuna chiave API, token o Authorization header: il file finisce nel contesto dell'agente.",
  docsRuleScripts: "Gli script possono solo fare calcoli locali: niente link esterni, shell remota o accesso all'ambiente.",
  docsRulePermissions: "Dichiari i permessi che usi; l'agente li applica solo se l'integrazione è collegata, altrimenti la competenza lavora in modalità ridotta.",
  docsRuleRisk: "Con risk_level: high ogni azione con effetto esterno chiede la tua approvazione esplicita.",
  docsSafetyTitle: "Sicurezza e privacy",
  docsSafetyBody: "Le competenze che carichi sono private del tuo account: non compaiono nel catalogo pubblico e non sono visibili agli altri utenti. Ogni competenza resta comunque dentro i permessi dell'agente: se un'integrazione non è collegata, la competenza non può scriverci sopra.",
  docsTemplateTitle: "Il template, per intero",
};

const ES: SkillsDictionary = {
  label: "Competencias",
  heroTitle: "Enseña a tus agentes tu forma de trabajar",
  heroSubtitle:
    "Las Competencias son procedimientos reutilizables para tus agentes de IA: cómo se hace, con qué reglas y qué plantillas. El agente carga una competencia solo cuando la petición es relevante.",
  heroNote:
    "Cada competencia se descarga como .zip y se instala en tu agente con un clic.",
  metaTitle: "Competencias y plugins - AgentCloud",
  metaDescription:
    "Competencias para los agentes de AgentCloud: procedimientos listos para e-commerce, leads, soporte, reservas, finanzas, SEO, selección y más. Descarga el .zip o instala con un clic.",
  browseAgents: "Ver agentes",
  allCategories: "Todas",
  category: "Categoría",
  agent: "Agente",
  integration: "Integración",
  onlyAvailable: "Solo disponibles ahora",
  searchPlaceholder: "Buscar un plugin",
  searchLabel: "Buscar plugins",
  clearFilters: "Quitar filtros",
  resultsCount: "{count} plugins",
  skillsCount: "{count} competencias",
  pluginsCount: "{count} plugins",
  noResults: "Ningún plugin coincide con los filtros",
  noResultsHint: "Prueba a quitar un filtro o busca otra cosa.",
  includedSkills: "Competencias incluidas",
  primaryAgents: "Agentes recomendados",
  integrations: "Integraciones recomendadas",
  required: "Necesaria",
  optional: "Opcional",
  arriving: "Próximamente",
  download: "Descargar .zip",
  downloadAria: "Descargar el plugin {name} como archivo zip",
  install: "Instalar en mi agente",
  detail: "Ver detalles",
  viewDetail: "Abrir plugin",
  chatExamples: "Ejemplos de peticiones",
  chatExamplesIntro:
    "Prueba esto en el chat: el agente elige solo la competencia adecuada.",
  permissions: "Permisos necesarios",
  riskLevel: "Nivel de riesgo",
  riskLow: "Bajo",
  riskMedium: "Medio",
  riskHigh: "Alto",
  riskHighHint:
    "Las acciones de alto riesgo (correos a clientes, publicaciones, pagos, cancelaciones) requieren tu aprobación explícita.",
  version: "Versión",
  recommendedAgents: "Agentes para los que está pensado",
  recommendedIntegrations: "Integraciones y por qué",
  whySkill: "Qué hace",
  backToCatalog: "Volver a todas las competencias",
  pluginNotFound: "Plugin no encontrado",
  notFoundTitle: "Este plugin no existe",
  notFoundBody: "Puede que haya cambiado de nombre. Explora el catálogo para encontrar lo que buscas.",
  liveOnly: "Disponible",
  allIntegrationsLabel: "Integraciones",
  progressiveDisclosure: "Cómo funciona en el chat",
  progressiveDisclosureBody:
    "El agente solo ve el nombre y la descripción de cada competencia activa. Las instrucciones completas se cargan cuando la petición coincide, para que el contexto quede limpio.",
  downloadAllNote:
    "La descarga incluye todos los SKILL.md en italiano, listos para instalar manualmente.",
  fitPrimary: "Principal",
  fitSecondary: "Secundario",
  related: "Tambien te puede interesar",
  browseSkills: "Ver las competencias",
  dashboardTitle: "Competencias instaladas",
  dashboardUses: "activaciones",
  dashboardEmptyTitle: "Ninguna competencia instalada",
  dashboardEmptyBody: "Instala un plugin del catálogo: el agente elegirá solo la competencia adecuada cuando la petición sea relevante.",
  dashboardSuccess: "Éxito",
  lastUse: "Último uso",
  neverUsed: "Todavía sin usar",
  tokens: "Tokens",
  enable: "Activar",
  disable: "Desactivar",
  toggleError: "No se pudo actualizar la competencia. Inténtalo de nuevo.",
  ownerUser: "Personal",
  on: "En",
  agentTab: "Competencias",
  agentTabTitle: "Competencias recomendadas para este agente",
  agentTabBody: "Las competencias son procedimientos que el agente carga solo cuando la petición es relevante. Cada competencia sigue dentro de los permisos de las integraciones conectadas.",
  agentTabPrimary: "Recomendado",
  agentTabSecondary: "Compatible",
  installAll: "Instalar todo",
  installAllDone: "Competencias instaladas",
  installing: "Instalando…",
  installedBadge: "Instalada",
  missingIntegrations: "Integraciones que faltan",
  missingIntegrationsBody: "Conecta estas apps para aprovechar la competencia al máximo. La competencia sigue instalada y funciona en modo reducido.",
  connectInTwoMinutes: "Conectar en 2 minutos",
  notifyMe: "Avísame cuando llegue",
  notifyMeDone: "Te avisaremos",
    agentTabSearch: "Buscar competencias o plugins",
    agentTabSearchLabel: "Buscar competencias en este agente",
    agentTabNoResults: "Ninguna competencia coincide con la búsqueda",
  degradedMode: "Modo manual",
  degradedModeBody: "La integración aún no está disponible: el agente prepara el trabajo y lo exporta, sin escribir en la app.",
  enabledSkills: "Competencias activas",
  noRecommended: "Ninguna competencia recomendada",
  noRecommendedBody: "Todavía no hay plugins en el catálogo para este agente.",
  installSkill: "Instalar",
  removeSkill: "Quitar",
  uploadTitle: "Sube tu competencia",
  uploadBody: "Arrastra aquí el .zip de tu competencia (carpeta con SKILL.md). Validamos frontmatter, tamaño y contenido en el servidor.",
  uploadDropzone: "Arrastra el .zip aquí, o",
  uploadChoose: "elige el archivo",
  uploadValidating: "Validando…",
  uploadSuccess: "Competencia subida",
  uploadError: "No se pudo subir",
  uploadPrivateNote: "La competencia queda privada: solo tú la ves.",
  uploadWarnings: "Avisos",
  uploadFiles: "Archivos del paquete",
  uploadPreview: "Vista previa",
  uploadClear: "Quitar",
  uploadRequiresLogin: "Inicia sesión para subir una competencia personal.",
  templateDownload: "Descargar la plantilla",
  changelogTitle: "Novedades",
  pricingTitle: "Qué cuesta",
  pricingIncluded: "Competencias oficiales incluidas",
  pricingIncludedBody: "Todas las competencias oficiales de un plugin están incluidas en el precio del agente. Instala, quita y descarga libremente: sin coste extra.",
  pricingAddon: "Competencias premium (complemento)",
  pricingAddonBody: "Un plugin premium es un complemento aparte, activable en un solo agente. Es un pago único por instalación y las competencias que contiene siguen activas mientras el complemento esté activo.",
  pricingNote: "Las competencias que creas y subes son siempre gratis y privadas de tu cuenta, incluso con un plugin premium activo.",
  docsTitle: "Crea tu competencia en 10 minutos",
  docsIntro: "Una competencia es una carpeta de instrucciones que enseña a un agente a hacer bien un tipo de trabajo. Solo importa un archivo: SKILL.md. Parte de la plantilla, escribe cuándo debe activarse, súbela: el agente la usará solo cuando la petición corresponda.",
  docsStep1: "Descarga la plantilla",
  docsStep1Body: "Empieza por SKILL.md ya montado: frontmatter, secciones y notas en su sitio. Renombra la carpeta con el slug de tu competencia.",
  docsStep2: "Escribe la description (lo que más importa)",
  docsStep2Body: "El agente solo ve nombre y descripción hasta saber si la competencia es relevante. Escribe qué hace Y cuándo usarla, con disparadores concretos: «usar cuando el cliente pide el estado de un pedido».",
  docsStep3: "Completa procedimiento, reglas y output",
  docsStep3Body: "El procedimiento es el paso a paso que sigue el agente. Las reglas son los límites (tono, fiscalidad, GDPR). El output esperado es el formato exacto: sin él cada respuesta cambia.",
  docsStep4: "Comprímelo y súbelo",
  docsStep4Body: "Comprime la carpeta (SKILL.md obligatorio; references/, templates/, examples/ opcionales) y arrástrala en «Sube tu competencia» en /skills. La validación es del servidor y te dice qué corregir.",
  docsStep5: "Instálala en el agente",
  docsStep5Body: "Desde la página del agente abre la pestaña Competencias e instala la tuya. Desde entonces entra en el contexto del agente, dentro de los permisos de las integraciones conectadas.",
  docsRulesTitle: "Qué comprueba el validador",
  docsRuleFrontmatter: "SKILL.md debe abrir y cerrar el frontmatter con ---, con name, description, version, risk_level.",
  docsRuleLength: "El cuerpo no puede pasar de 500 líneas: lo largo va a references/.",
  docsRuleSecrets: "Ninguna API key, token o Authorization header: el archivo acaba en el contexto del agente.",
  docsRuleScripts: "Los scripts solo pueden calcular localmente: sin links externos, shell remota ni acceso al entorno.",
  docsRulePermissions: "Declara los permisos que usas; el agente los aplica solo si la integración está conectada, si no la competencia trabaja en modo reducido.",
  docsRuleRisk: "Con risk_level: high cada acción con efecto externo pide tu aprobación explícita.",
  docsSafetyTitle: "Seguridad y privacidad",
  docsSafetyBody: "Las competencias que subes son privadas de tu cuenta: no aparecen en el catálogo público y otros usuarios no las ven. Cada competencia sigue dentro de los permisos del agente: si una integración no está conectada, no puede escribir en ella.",
  docsTemplateTitle: "La plantilla completa",
};

const DE: SkillsDictionary = {
  label: "Kompetenzen",
  heroTitle: "Bring deinen Agenten bei, wie du arbeitest",
  heroSubtitle:
    "Kompetenzen sind wiederverwendbare Abläufe für deine KI-Agenten: wie man etwas macht, mit welchen Regeln und Vorlagen. Der Agent lädt eine Kompetenz nur, wenn die Anfrage passt.",
  heroNote:
    "Jede Kompetenz lässt sich als .zip herunterladen und mit einem Klick auf dem Agenten installieren.",
  metaTitle: "Kompetenzen und Plugins - AgentCloud",
  metaDescription:
    "Kompetenzen für AgentCloud-Agenten: fertige Abläufe für E-Commerce, Leads, Support, Termine, Finanzen, SEO, Recruiting und mehr. .zip herunterladen oder mit einem Klick installieren.",
  browseAgents: "Agenten ansehen",
  allCategories: "Alle",
  category: "Kategorie",
  agent: "Agent",
  integration: "Integration",
  onlyAvailable: "Nur verfügbare",
  searchPlaceholder: "Plugin suchen",
  searchLabel: "Plugins suchen",
  clearFilters: "Filter zurücksetzen",
  resultsCount: "{count} Plugins",
  skillsCount: "{count} Kompetenzen",
  pluginsCount: "{count} Plugins",
  noResults: "Kein Plugin passt zu den Filtern",
  noResultsHint: "Entferne einen Filter oder suche nach etwas anderem.",
  includedSkills: "Enthaltene Kompetenzen",
  primaryAgents: "Empfohlene Agenten",
  integrations: "Empfohlene Integrationen",
  required: "Erforderlich",
  optional: "Optional",
  arriving: "Demnächst",
  download: ".zip herunterladen",
  downloadAria: "Plugin {name} als ZIP-Datei herunterladen",
  install: "Auf meinem Agenten installieren",
  detail: "Details ansehen",
  viewDetail: "Plugin öffnen",
  chatExamples: "Beispielanfragen",
  chatExamplesIntro:
    "Probiere das im Chat: der Agent wählt die passende Kompetenz selbst.",
  permissions: "Erforderliche Berechtigungen",
  riskLevel: "Risikostufe",
  riskLow: "Niedrig",
  riskMedium: "Mittel",
  riskHigh: "Hoch",
  riskHighHint:
    "Hochriskante Aktionen (E-Mails an Kunden, Veröffentlichungen, Zahlungen, Stornos) brauchen deine ausdrückliche Freigabe.",
  version: "Version",
  recommendedAgents: "Agenten, für die das gedacht ist",
  recommendedIntegrations: "Integrationen und warum",
  whySkill: "Was es tut",
  backToCatalog: "Zurück zu allen Kompetenzen",
  pluginNotFound: "Plugin nicht gefunden",
  notFoundTitle: "Dieses Plugin gibt es nicht",
  notFoundBody: "Es wurde vielleicht umbenannt. Im Katalog findest du, was du brauchst.",
  liveOnly: "Verfügbar",
  allIntegrationsLabel: "Integrationen",
  progressiveDisclosure: "So funktioniert es im Chat",
  progressiveDisclosureBody:
    "Der Agent sieht nur Name und Beschreibung der aktiven Kompetenzen. Die vollständigen Anweisungen werden erst geladen, wenn die Anfrage passt.",
  downloadAllNote:
    "Der Download enthält alle SKILL.md auf Italienisch, bereit zur manuellen Installation.",
  fitPrimary: "Primär",
  fitSecondary: "Sekundär",
  related: "Das könnte dich auch interessieren",
  browseSkills: "Kompetenzen ansehen",
  dashboardTitle: "Installierte Kompetenzen",
  dashboardUses: "Aktivierungen",
  dashboardEmptyTitle: "Keine Kompetenz installiert",
  dashboardEmptyBody: "Installiere ein Plugin aus dem Katalog: der Agent wählt die passende Kompetenz selbst, wenn die Anfrage dazu passt.",
  dashboardSuccess: "Erfolg",
  lastUse: "Zuletzt genutzt",
  neverUsed: "Noch nie genutzt",
  tokens: "Tokens",
  enable: "Aktivieren",
  disable: "Deaktivieren",
  toggleError: "Die Kompetenz konnte nicht aktualisiert werden. Versuch es erneut.",
  ownerUser: "Persönlich",
  on: "Auf",
  agentTab: "Kompetenzen",
  agentTabTitle: "Empfohlene Kompetenzen für diesen Agenten",
  agentTabBody: "Kompetenzen sind Abläufe, die der Agent nur bei passender Anfrage lädt. Jede Kompetenz bleibt innerhalb der Berechtigungen der verbundenen Integrationen.",
  agentTabPrimary: "Empfohlen",
  agentTabSecondary: "Kompatibel",
  installAll: "Alle installieren",
  installAllDone: "Kompetenzen installiert",
  installing: "Wird installiert…",
  installedBadge: "Installiert",
  missingIntegrations: "Fehlende Integrationen",
  missingIntegrationsBody: "Verbinde diese Apps, um die Kompetenz voll zu nutzen. Die Kompetenz bleibt installiert und funktioniert reduziert weiter.",
    agentTabSearch: "Skills oder Plugins suchen",
    agentTabSearchLabel: "Skills in diesem Agenten suchen",
    agentTabNoResults: "Keine Skill passt zur Suche",
  connectInTwoMinutes: "In 2 Minuten verbinden",
  notifyMe: "Benachrichtige mich",
  notifyMeDone: "Wir melden uns",
  degradedMode: "Manueller Modus",
  degradedModeBody: "Die Integration ist noch nicht verfügbar: der Agent bereitet die Arbeit vor und exportiert sie, ohne in die App zu schreiben.",
  enabledSkills: "Aktive Kompetenzen",
  noRecommended: "Keine empfohlene Kompetenz",
  noRecommendedBody: "Für diesen Agenten gibt es noch keine Plugins im Katalog.",
  installSkill: "Installieren",
  removeSkill: "Entfernen",
  uploadTitle: "Lade deine Kompetenz hoch",
  uploadBody: "Ziehe hier die .zip deiner Kompetenz hin (Ordner mit SKILL.md). Frontmatter, Größe und Inhalt werden serverseitig geprüft.",
  uploadDropzone: "Ziehe die .zip hierher oder",
  uploadChoose: "Datei auswählen",
  uploadValidating: "Wird geprüft…",
  uploadSuccess: "Kompetenz hochgeladen",
  uploadError: "Hochladen fehlgeschlagen",
  uploadPrivateNote: "Die Kompetenz bleibt privat: nur du siehst sie.",
  uploadWarnings: "Hinweise",
  uploadFiles: "Dateien im Paket",
  uploadPreview: "Vorschau",
  uploadClear: "Entfernen",
  uploadRequiresLogin: "Melde dich an, um eine persönliche Kompetenz hochzuladen.",
  templateDownload: "Vorlage herunterladen",
  changelogTitle: "Neuigkeiten",
  pricingTitle: "Was es kostet",
  pricingIncluded: "Offizielle Kompetenzen inklusive",
  pricingIncludedBody: "Alle offiziellen Kompetenzen eines Plugins sind im Agenten-Preis enthalten. Installieren, entfernen und herunterladen ist kostenlos: keine Zusatzgebühr.",
  pricingAddon: "Premium-Kompetenzen (Add-on)",
  pricingAddonBody: "Ein Premium-Plugin ist ein separates Add-on für einen einzelnen Agenten. Einmalige Gebühr pro Installation; die enthaltenen Kompetenzen bleiben aktiv, solange das Add-on aktiv ist.",
  pricingNote: "Kompetenzen, die du selbst erstellst und hochlädst, sind immer gratis und privat in deinem Konto — auch mit aktivem Premium-Plugin.",
  docsTitle: "Erstelle deine Kompetenz in 10 Minuten",
  docsIntro: "Eine Kompetenz ist ein Ordner mit Anweisungen, die einem Agenten beibringen, eine Art Arbeit gut zu erledigen. Wichtig ist nur eine Datei: SKILL.md. Starte mit der Vorlage, beschreibe, wann die Kompetenz greifen soll, lade sie hoch: Der Agent nutzt sie von selbst, wenn die Anfrage passt.",
  docsStep1: "Vorlage herunterladen",
  docsStep1Body: "Beginne mit der fertigen SKILL.md: Frontmatter, Abschnitte und Hinweise sind schon da. Benenne den Ordner nach dem Slug deiner Kompetenz.",
  docsStep2: "Beschreibung schreiben (der wichtige Teil)",
  docsStep2Body: "Der Agent sieht nur Name und Beschreibung, bis klar ist, dass die Kompetenz passt. Schreibe, was sie tut UND wann sie verwendet wird, mit konkreten Auslösern: „verwenden, wenn der Kunde den Bestellstatus fragt“.",
  docsStep3: "Ablauf, Regeln und Output ausfüllen",
  docsStep3Body: "Der Ablauf ist die Schrittfolge, der der Agent folgt. Die Regeln sind die Grenzen (Ton, Steuern, Limits, DSGVO). Der erwartete Output ist das exakte Format: ohne ihn ist jede Antwort anders.",
  docsStep4: "Zip erstellen und hochladen",
  docsStep4Body: "Pack den Ordner als .zip (SKILL.md Pflicht; references/, templates/, examples/ optional) und zieh ihn bei /skills in „Lade deine Kompetenz hoch“. Die Prüfung läuft serverseitig und sagt dir, was zu korrigieren ist.",
  docsStep5: "Auf dem Agenten installieren",
  docsStep5Body: "Öffne auf der Agentenseite den Tab Kompetenzen und installiere deine. Ab da ist sie im Kontext des Agenten, innerhalb der Berechtigungen der verbundenen Integrationen.",
  docsRulesTitle: "Was der Validator prüft",
  docsRuleFrontmatter: "SKILL.md muss das Frontmatter mit --- öffnen und schließen, mit name, description, version, risk_level.",
  docsRuleLength: "Der Text darf höchstens 500 Zeilen haben: Längeres gehört nach references/.",
  docsRuleSecrets: "Keine API-Keys, Tokens oder Authorization-Header: die Datei landet im Kontext des Agenten.",
  docsRuleScripts: "Skripte dürfen nur lokal rechnen: keine externen Links, keine Remote-Shell, kein Zugriff auf die Umgebung.",
  docsRulePermissions: "Deklariere die Berechtigungen; der Agent wendet sie nur an, wenn die Integration verbunden ist, sonst läuft die Kompetenz reduziert.",
  docsRuleRisk: "Mit risk_level: high fragt jede Aktion mit externer Wirkung deine ausdrückliche Freigabe.",
  docsSafetyTitle: "Sicherheit und Datenschutz",
  docsSafetyBody: "Deine hochgeladenen Kompetenzen sind privat für dein Konto: sie erscheinen nicht im öffentlichen Katalog und andere sehen sie nicht. Jede Kompetenz bleibt trotzdem in den Berechtigungen des Agenten: ist eine Integration nicht verbunden, kann die Kompetenz dort nicht schreiben.",
  docsTemplateTitle: "Die vollständige Vorlage",
};

const FR: SkillsDictionary = {
  label: "Compétences",
  heroTitle: "Apprenez à vos agents votre façon de travailler",
  heroSubtitle:
    "Les Compétences sont des procédures réutilisables pour vos agents IA : comment faire, avec quelles règles et quels modèles. L'agent ne charge une compétence que si la demande correspond.",
  heroNote:
    "Chaque compétence se télécharge en .zip et s'installe sur votre agent en un clic.",
  metaTitle: "Compétences et plugins - AgentCloud",
  metaDescription:
    "Des compétences pour les agents AgentCloud : procédures prêtes pour l'e-commerce, les leads, le support, la réservation, la finance, le SEO, le recrutement et plus encore. Téléchargez le .zip ou installez en un clic.",
  browseAgents: "Voir les agents",
  allCategories: "Toutes",
  category: "Catégorie",
  agent: "Agent",
  integration: "Intégration",
  onlyAvailable: "Disponibles uniquement",
  searchPlaceholder: "Rechercher un plugin",
  searchLabel: "Rechercher des plugins",
  clearFilters: "Effacer les filtres",
  resultsCount: "{count} plugins",
  skillsCount: "{count} compétences",
  pluginsCount: "{count} plugins",
  noResults: "Aucun plugin ne correspond aux filtres",
  noResultsHint: "Essayez de retirer un filtre ou de chercher autre chose.",
  includedSkills: "Compétences incluses",
  primaryAgents: "Agents recommandés",
  integrations: "Intégrations recommandées",
  required: "Requise",
  optional: "Optionnelle",
  arriving: "Bientôt",
  download: "Télécharger .zip",
  downloadAria: "Télécharger le plugin {name} en fichier zip",
  install: "Installer sur mon agent",
  detail: "Voir les détails",
  viewDetail: "Ouvrir le plugin",
  chatExamples: "Exemples de demandes",
  chatExamplesIntro:
    "Essayez ceci dans le chat : l'agent choisit lui-même la bonne compétence.",
  permissions: "Permissions requises",
  riskLevel: "Niveau de risque",
  riskLow: "Faible",
  riskMedium: "Moyen",
  riskHigh: "Élevé",
  riskHighHint:
    "Les actions à haut risque (e-mails clients, publications, paiements, annulations) exigent votre approbation explicite.",
  version: "Version",
  recommendedAgents: "Agents pour lesquels ce plugin est conçu",
  recommendedIntegrations: "Intégrations et pourquoi",
  whySkill: "Ce qu'il fait",
  backToCatalog: "Retour à toutes les compétences",
  pluginNotFound: "Plugin introuvable",
  notFoundTitle: "Ce plugin n'existe pas",
  notFoundBody: "Il a peut-être été renommé. Parcourez le catalogue pour trouver ce qu'il vous faut.",
  liveOnly: "Disponible",
  allIntegrationsLabel: "Intégrations",
  progressiveDisclosure: "Comment ça marche dans le chat",
  progressiveDisclosureBody:
    "L'agent ne voit que le nom et la description de chaque compétence activée. Les instructions complètes ne sont chargées que si la demande correspond.",
  downloadAllNote:
    "Le téléchargement contient tous les SKILL.md en italien, prêts à être installés manuellement.",
  fitPrimary: "Principal",
  fitSecondary: "Secondaire",
  related: "Vous aimerez aussi",
  browseSkills: "Voir les compétences",
  dashboardTitle: "Compétences installées",
  dashboardUses: "activations",
  dashboardEmptyTitle: "Aucune compétence installée",
  dashboardEmptyBody: "Installez un plugin du catalogue : l'agent choisira lui-même la bonne compétence quand la demande correspond.",
  dashboardSuccess: "Réussite",
  lastUse: "Dernière utilisation",
  neverUsed: "Pas encore utilisée",
  tokens: "Tokens",
  enable: "Activer",
  disable: "Désactiver",
  toggleError: "Impossible de mettre à jour la compétence. Réessayez.",
  ownerUser: "Personnelle",
  on: "Sur",
  agentTab: "Compétences",
  agentTabTitle: "Compétences recommandées pour cet agent",
  agentTabBody: "Les compétences sont des procédures que l'agent ne charge que si la demande correspond. Chaque compétence reste dans les permissions des intégrations connectées.",
  agentTabPrimary: "Recommandé",
  agentTabSecondary: "Compatible",
  installAll: "Tout installer",
  installAllDone: "Compétences installées",
  installing: "Installation…",
    agentTabSearch: "Rechercher des compétences ou plugins",
    agentTabSearchLabel: "Rechercher des compétences dans cet agent",
    agentTabNoResults: "Aucune compétence ne correspond à la recherche",
  installedBadge: "Installée",
  missingIntegrations: "Intégrations manquantes",
  missingIntegrationsBody: "Connectez ces apps pour profiter pleinement de la compétence. Elle reste installée et fonctionne en mode réduit.",
  connectInTwoMinutes: "Connecter en 2 minutes",
  notifyMe: "Prévenez-moi",
  notifyMeDone: "Nous vous informerons",
  degradedMode: "Mode manuel",
  degradedModeBody: "L'intégration n'est pas encore disponible : l'agent prépare quand même le travail et l'exporte, sans écrire dans l'app.",
  enabledSkills: "Compétences actives",
  noRecommended: "Aucune compétence recommandée",
  noRecommendedBody: "Il n'y a pas encore de plugin dans le catalogue pour cet agent.",
  installSkill: "Installer",
  removeSkill: "Retirer",
  uploadTitle: "Chargez votre compétence",
  uploadBody: "Déposez ici le .zip de votre compétence (dossier avec SKILL.md). Le frontmatter, la taille et le contenu sont vérifiés côté serveur.",
  uploadDropzone: "Déposez le .zip ici, ou",
  uploadChoose: "choisissez le fichier",
  uploadValidating: "Vérification…",
  uploadSuccess: "Compétence chargée",
  uploadError: "Échec du chargement",
  uploadPrivateNote: "La compétence reste privée : vous seul la voyez.",
  uploadWarnings: "Avertissements",
  uploadFiles: "Fichiers du paquet",
  uploadPreview: "Aperçu",
  uploadClear: "Retirer",
  uploadRequiresLogin: "Connectez-vous pour charger une compétence personnelle.",
  templateDownload: "Télécharger le modèle",
  changelogTitle: "Nouveautés",
  pricingTitle: "Ce que ça coûte",
  pricingIncluded: "Compétences officielles incluses",
  pricingIncludedBody: "Toutes les compétences officielles d'un plugin sont incluses dans le prix de l'agent. Installez, retirez, téléchargez librement : aucun supplément.",
  pricingAddon: "Compétences premium (add-on)",
  pricingAddonBody: "Un plugin premium est un add-on distinct, activable sur un seul agent. C'est un paiement unique par installation et les compétences qu'il contient restent actives tant que l'add-on est actif.",
  pricingNote: "Les compétences que vous créez et chargez sont toujours gratuites et privées pour votre compte, même avec un plugin premium actif.",
  docsTitle: "Créez votre compétence en 10 minutes",
  docsIntro: "Une compétence est un dossier d'instructions qui apprend à un agent à bien faire un type de travail. Un seul fichier compte : SKILL.md. Partez du modèle, indiquez quand la compétence doit se déclencher, téléchargez-la : l'agent l'utilisera seul quand la demande correspond.",
  docsStep1: "Télécharger le modèle",
  docsStep1Body: "Partez du SKILL.md déjà en place : frontmatter, sections et notes sont prêts. Renommez le dossier avec le slug de votre compétence.",
  docsStep2: "Rédiger la description (la partie qui compte)",
  docsStep2Body: "L'agent ne voit que le nom et la description tant qu'il ne sait pas si la compétence est pertinente. Écrivez ce qu'elle fait ET quand l'utiliser, avec des déclencheurs concrets : « à utiliser quand le client demande l'état d'une commande ».",
  docsStep3: "Remplir procédure, règles et sortie",
  docsStep3Body: "La procédure est le pas-à-pas que suit l'agent. Les règles sont les contraintes (ton, fiscalité, limites, RGPD). La sortie attendue est le format exact : sans elle chaque réponse diffère.",
  docsStep4: "Zipper et télécharger",
  docsStep4Body: "Zippez le dossier (SKILL.md obligatoire ; references/, templates/, examples/ optionnels) et déposez-le dans « Chargez votre compétence » sur /skills. La validation est côté serveur et indique quoi corriger.",
  docsStep5: "Installer sur l'agent",
  docsStep5Body: "Depuis la page de l'agent, ouvrez l'onglet Compétences et installez la vôtre. Elle entre alors dans le contexte de l'agent, dans les limites des permissions des intégrations connectées.",
  docsRulesTitle: "Ce que le validateur vérifie",
  docsRuleFrontmatter: "SKILL.md doit ouvrir et fermer le frontmatter avec ---, avec name, description, version, risk_level.",
  docsRuleLength: "Le corps ne dépasse pas 500 lignes : le reste va dans references/.",
  docsRuleSecrets: "Aucune clé API, token ou en-tête Authorization : le fichier finit dans le contexte de l'agent.",
  docsRuleScripts: "Les scripts ne font que du calcul local : pas de liens externes, de shell distant ni d'accès à l'environnement.",
  docsRulePermissions: "Déclarez les permissions utilisées ; l'agent ne les applique que si l'intégration est connectée, sinon la compétence travaille en mode réduit.",
  docsRuleRisk: "Avec risk_level: high, toute action à effet externe demande votre approbation explicite.",
  docsSafetyTitle: "Sécurité et confidentialité",
  docsSafetyBody: "Les compétences que vous chargez sont privées pour votre compte : elles n'apparaissent pas dans le catalogue public et les autres utilisateurs ne les voient pas. Chaque compétence reste dans les permissions de l'agent : si une intégration n'est pas connectée, elle ne peut pas y écrire.",
  docsTemplateTitle: "Le modèle complet",
};

const BY_LOCALE: Record<Locale, SkillsDictionary> = {
  it: IT,
  en: EN,
  es: ES,
  de: DE,
  fr: FR,
};

/** Dizionario delle pagine Competenze per la lingua attiva. */
export function getSkillsDictionary(locale: Locale): SkillsDictionary {
  return BY_LOCALE[locale] ?? EN;
}
