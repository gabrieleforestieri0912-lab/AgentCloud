/**
 * Chip di suggerimento dell'hero: etichetta corta nel dizionario
 * (`dict.hero.chips`), frase estesa al click. Perché esiste: la chat completa
 * (/chat) mostra gli stessi chip della hero con lo stesso comportamento
 * (pillola → frase completa nell'input); avere la mappa qui evita di
 * duplicare le frasi in due componenti client.
 */
export const CHIP_EXPANDED: Record<string, string[]> = {
  it: [
    "Vorrei automatizzare il mio e-commerce: puoi mostrarmi come gestire prodotti, ordini e link al carrello con AgentCloud?",
    "Ho un negozio Shopify e vorrei collegarlo per cercare prodotti e creare link diretti al carrello in automatico. Come funziona?",
    "Voglio migliorare vendite e gestione lead: come posso catturare i contatti dal sito e avvisare il team su Slack?",
    "Mi interessa l'acquisizione lead automatica: puoi mostrarmi come raccogliere i dati dai moduli e arricchire i contatti?",
    "I miei clienti chiedono spesso lo stato degli ordini: potete verificarlo in tempo reale con numero ordine ed email?",
  ],
  en: [
    "I'd like to automate my e-commerce: can you show me how to manage products, orders and cart links with AgentCloud AI agents?",
    "I run a Shopify store and want to connect it to search products and create direct cart links automatically. How does it work?",
    "I want to improve sales and lead management: how can I capture contacts from my site and notify sales on Slack?",
    "I'm interested in automatic lead capture: can you show how to collect form data and enrich contacts?",
    "My customers often ask about order status: can you check it in real time with order number and email?",
  ],
  es: [
    "Me gustaría automatizar mi e-commerce: ¿puedes mostrarme cómo gestionar productos, pedidos y enlaces al carrito con AgentCloud?",
    "Tengo una tienda Shopify y quiero conectarla para buscar productos y crear enlaces directos al carrito automáticamente. ¿Cómo funciona?",
    "Quiero mejorar ventas y gestión de leads: ¿cómo puedo capturar contactos de mi sitio y notificar a ventas en Slack?",
    "Me interesa la captura automática de leads: ¿puedes mostrar cómo recolectar datos de formularios y enriquecer contactos?",
    "Mis clientes preguntan a menudo por el estado de sus pedidos: ¿pueden verificarlo en tiempo real con número de pedido y email?",
  ],
  de: [
    "Ich möchte meinen E-Commerce automatisieren: Kannst du zeigen, wie man Produkte, Bestellungen und Warenkorb-Links mit AgentCloud verwaltet?",
    "Ich betreibe einen Shopify-Shop und möchte ihn verbinden, um Produkte zu suchen und direkte Warenkorb-Links automatisch zu erstellen. Wie funktioniert das?",
    "Ich möchte Vertrieb und Lead-Management verbessern: Wie kann ich Kontakte von meiner Website erfassen und den Vertrieb via Slack benachrichtigen?",
    "Ich interessiere mich für automatische Lead-Erfassung: Kannst du zeigen, wie man Formulardaten sammelt und Kontakte anreichert?",
    "Meine Kunden fragen oft nach dem Bestellstatus: Könnt ihr ihn in Echtzeit mit Bestellnummer und E-Mail prüfen?",
  ],
  fr: [
    "J'aimerais automatiser mon e-commerce : pouvez-vous me montrer comment gérer produits, commandes et liens panier avec AgentCloud ?",
    "J'ai une boutique Shopify et je souhaite la connecter pour rechercher des produits et créer des liens panier directs automatiquement. Comment ça marche ?",
    "Je veux améliorer les ventes et la gestion des leads : comment capturer les contacts depuis mon site et notifier les ventes sur Slack ?",
    "Je suis intéressé par la capture automatique de leads : pouvez-vous montrer comment collecter les données de formulaire et enrichir les contacts ?",
    "Mes clients demandent souvent le statut de leur commande : pouvez-vous le vérifier en temps réel avec numéro de commande et e-mail ?",
  ],
};

/**
 * Frase estesa per un chip: la posizione del chip nell'array del dizionario
 * seleziona la frase della lingua corrente. Fuori indice (o chip non noto)
 * torna il template generico del dizionario (formulato con {chip}).
 */
export function expandedHeroChip(
  locale: string,
  chips: readonly string[],
  chip: string,
  fallbackTemplate: string,
): string {
  const prompts = CHIP_EXPANDED[locale] ?? CHIP_EXPANDED.en;
  const idx = chips.indexOf(chip);
  if (idx >= 0 && prompts[idx]) return prompts[idx];
  return fallbackTemplate.replace(/\{chip\}/g, chip);
}
