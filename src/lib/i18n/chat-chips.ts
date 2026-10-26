/**
 * Chip di suggerimento della chat (/chat) vuota: etichetta corta nel pannello,
 * frase estesa e specifica nell'input al click. Diversi dai chip dell'hero
 * (dict.hero.chips + hero-chips.ts): la hero parla del prodotto, la chat
 * parte da richieste operative concrete che l'utente può chiedere da subito.
 */
export type ChatChip = { label: string; prompt: string };

const CHAT_CHIPS: Record<string, ChatChip[]> = {
  it: [
    {
      label: "Riassunto riunione",
      prompt:
        "Ti incollo nel prossimo messaggio gli appunti di una riunione: riassumili in un testo breve con decisioni prese, assegnatari e scadenze.",
    },
    {
      label: "Email di preventivo",
      prompt:
        "Scrivi un'email professionale per inviare un preventivo a un nuovo cliente: evidenzia i vantaggi, proponi una call di 20 minuti e resta sotto le 150 parole.",
    },
    {
      label: "Piano marketing 30 giorni",
      prompt:
        "Crea un piano marketing di 30 giorni per il lancio di una nuova collezione di un brand di abbigliamento, con canali, obiettivi settimanali e budget indicativo.",
    },
    {
      label: "Risposta a reclamo",
      prompt:
        "Scrivi la risposta a un cliente insoddisfatto per un ritardo di consegna: si scusi senza giri di parole, spieghi la causa e proponga un risarcimento concreto.",
    },
    {
      label: "Report vendite settimanale",
      prompt:
        "Imposta il template di un report settimanale per il team vendite: KPI principali, confronto con la settimana precedente dove metto i miei dati, e note operative finali.",
    },
  ],
  en: [
    {
      label: "Meeting summary",
      prompt:
        "I'll paste my meeting notes in the next message: turn them into a short summary with decisions made, owners and deadlines.",
    },
    {
      label: "Quote email",
      prompt:
        "Write a professional email to send a quote to a new customer: highlight the benefits, propose a 20-minute call and keep it under 150 words.",
    },
    {
      label: "30-day marketing plan",
      prompt:
        "Create a 30-day marketing plan for launching a new clothing collection, with channels, weekly goals and an indicative budget.",
    },
    {
      label: "Complaint reply",
      prompt:
        "Write the reply to a customer unhappy about a delivery delay: apologize without beating around the bush, explain the cause and offer a concrete remedy.",
    },
    {
      label: "Weekly sales report",
      prompt:
        "Set up the template of a weekly report for the sales team: main KPIs, week-over-week comparison where I'll paste my data, and closing action notes.",
    },
  ],
  es: [
    {
      label: "Resumen de reunión",
      prompt:
        "Te pego en el siguiente mensaje las notas de una reunión: resúmelas en un texto breve con decisiones, responsables y plazos.",
    },
    {
      label: "Email de presupuesto",
      prompt:
        "Escribe un email profesional para enviar un presupuesto a un cliente nuevo: destaca las ventajas, propone una llamada de 20 minutos y no supera las 150 palabras.",
    },
    {
      label: "Plan de marketing 30 días",
      prompt:
        "Crea un plan de marketing de 30 días para el lanzamiento de una nueva colección de ropa, con canales, objetivos semanales y presupuesto orientativo.",
    },
    {
      label: "Respuesta a reclamo",
      prompt:
        "Escribe la respuesta a un cliente insatisfecho por un retraso de entrega: discúlpese sin rodeos, explique la causa y ofrezca una solución concreta.",
    },
    {
      label: "Informe de ventas semanal",
      prompt:
        "Prepara la plantilla de un informe semanal para el equipo de ventas: KPI principales, comparación con la semana anterior donde pondré mis datos, y notas finales de acción.",
    },
  ],
  de: [
    {
      label: "Meeting-Zusammenfassung",
      prompt:
        "Ich füge im nächsten Beitrag meine Meeting-Notizen ein: fasse sie in einem kurzen Text mit Entscheidungen, Verantwortlichen und Deadlines zusammen.",
    },
    {
      label: "Angebots-E-Mail",
      prompt:
        "Schreibe eine professionelle E-Mail, um einem Neukunden ein Angebot zu senden: hebe die Vorteile hervor, schlage ein 20-minütiges Gespräch vor und bleibe unter 150 Wörtern.",
    },
    {
      label: "30-Tage-Marketingplan",
      prompt:
        "Erstelle einen 30-Tage-Marketingplan für den Launch einer neuen Modekollektion, mit Kanälen, Wochenzielen und einem Richtwert-Budget.",
    },
    {
      label: "Antwort auf Reklamation",
      prompt:
        "Schreibe die Antwort an einen Kunden, der wegen einer Lieferverzögerung unzufrieden ist: entschuldige dich ohne Umwege, erkläre die Ursache und biete eine konkrete Lösung an.",
    },
    {
      label: "Wöchentlicher Vertriebsbericht",
      prompt:
        "Erstelle die Vorlage eines Wochenberichts für das Vertriebsteam: wichtigste KPIs, Vergleich mit der Vorwoche (meine Zahlen reiche ich nach) und konkrete Maßnahmen zum Schluss.",
    },
  ],
  fr: [
    {
      label: "Résumé de réunion",
      prompt:
        "Je te colle au prochain message mes notes de réunion : résume-les en un texte court avec les décisions, les responsables et les échéances.",
    },
    {
      label: "Email de devis",
      prompt:
        "Rédige un email professionnel pour envoyer un devis à un nouveau client : mets en avant les avantages, propose un appel de 20 minutes et reste sous les 150 mots.",
    },
    {
      label: "Plan marketing 30 jours",
      prompt:
        "Crée un plan marketing de 30 jours pour le lancement d'une nouvelle collection de vêtements, avec les canaux, des objectifs hebdomadaires et un budget indicatif.",
    },
    {
      label: "Réponse à une réclamation",
      prompt:
        "Rédige la réponse à un client mécontent d'un retard de livraison : excuse-toi sans détour, explique la cause et propose une compensation concrète.",
    },
    {
      label: "Rapport de ventes hebdomadaire",
      prompt:
        "Prépare le modèle d'un rapport hebdomadaire pour l'équipe commerciale : KPI principaux, comparaison avec la semaine précédente (j'ajouterai mes données) et actions à la fin.",
    },
  ],
};

export function chatChipsFor(locale: string): ChatChip[] {
  return CHAT_CHIPS[locale] ?? CHAT_CHIPS.en;
}
