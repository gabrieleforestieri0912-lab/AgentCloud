/**
 * Overlay français du catalogue d'agents (slug → champs d'affichage localisés).
 *
 * Le contenu canonique vit dans `src/lib/agents.ts` en anglais ; ces données le
 * remplacent via `localizeAgent()` lorsque la langue active est le français.
 * Le badge n'est volontairement PAS ici : c'est une propriété canonique de
 * l'agent, traduite par `localizeBadge()` dans `./agentCatalog.ts`.
 */
import type { AgentLocalization } from "./agentCatalog";

export const AGENT_LOCALIZATIONS_FR: Record<string, AgentLocalization> = {
  "email-manager": {
    name: "Gestionnaire d'emails",
    shortName: "Emails",
    category: "Business et opérations",
    description:
      "Range ta boîte mail, ne rate jamais un engagement important et reçois un résumé quotidien.",
    longDescription:
      "L'agent Gestionnaire d'emails met de l'ordre dans ta boîte de réception et garde chaque engagement sous contrôle. Il trie les messages entrants, étiquette et archive ce qui compte, rédige des réponses claires à approuver et repère échéances, réunions et relances cachées dans les conversations, en les transformant en tâches suivies avec rappels. Il résume la journée dans un bref digest, signale ce qui demande une décision et suit chaque relance jusqu'à son terme. Connecté à Gmail, Google Agenda, Outlook et Slack, il te fait gagner des heures de gestion d'emails chaque semaine : réponds à ce qui compte et aucun rendez-vous important ne t'échappe.",
    industry: "Fondateurs, dirigeants et professionnels",
    tasks: [
      "Tri de la boîte mail",
      "Brouillons de réponse",
      "Suivi des engagements",
      "Résumé quotidien des emails",
    ],
    workflow: [
      "Analyse la boîte mail",
      "Trie et archive",
      "Suit les engagements",
      "Remet le résumé quotidien",
    ],
  },
  "business-manager": {
    name: "Business Manager",
    shortName: "Business",
    category: "Business et opérations",
    description:
      "Un COO dans le chat : rapports, planification et aide à la décision.",
    longDescription:
      "L'agent Business Manager agit comme un chef de cabinet pour entrepreneurs et fondateurs. Il lit tes données opérationnelles, rédige des rapports de direction, coordonne le travail entre équipes et soutient la planification et la décision. Connecté à Google Agenda, Gmail, Sheets et Slack, il transforme des feuilles dispersées et des mises à jour de statut en une vision claire de l'activité – pour que les dirigeants aient les chiffres et le récit nécessaires pour décider plus vite et faire grandir l'entreprise sans rien laisser de côté.",
    industry: "PME et fondateurs",
    tasks: [
      "Rapports de direction",
      "Analyse des données opérationnelles",
      "Coordination transversale",
      "Recommandations stratégiques",
    ],
    workflow: [
      "Synchronise Sheets + Agenda",
      "Analyse les KPI",
      "Crée le rapport de direction",
      "Propose des actions prioritaires",
    ],
  },
  "seo-agent": {
    name: "Agent Contenu SEO",
    shortName: "SEO",
    category: "Marketing et ventes",
    description:
      "Rédige des articles structurés et optimisés pour les mots-clés qui se positionnent vraiment.",
    longDescription:
      "L'agent Contenu SEO recherche les sujets, analyse sur quoi se positionnent les concurrents et produit des articles complets et optimisés pour les mots-clés. Il planifie l'architecture H1/H2, intègre les mots-clés cibles naturellement et ajoute automatiquement les méta-descriptions et liens internes. Connecté à Ahrefs, Google Search Console, WordPress et Notion, il aide l'équipe contenu à publier plus, se positionner plus vite et mieux convertir – chaque article étant ciblé sur une intention de recherche réelle.",
    industry: "Équipes de marketing de contenu",
    tasks: [
      "Recherche de mots-clés",
      "Analyse des concurrents",
      "Rédaction d'articles",
      "Optimisation des méta-données",
    ],
    workflow: [
      "Trouve les mots-clés",
      "Étudie les concurrents",
      "Rédige l'article",
      "Optimise les méta-données",
    ],
  },
  "personal-assistant": {
    name: "Assistant Personnel",
    shortName: "Assistant",
    category: "Business et opérations",
    description:
      "Planifie ta journée, vide ta liste de tâches et récupère des heures chaque semaine.",
    longDescription:
      "L'Assistant Personnel organise ta journée comme le ferait une excellente assistante. Il planifie le calendrier, gère les listes de tâches, résume notes et documents, bloque du temps pour le travail profond et suggère de manière proactive par où commencer. Connecté à Google Agenda, Gmail, Notion et Slack, il garde sur la bonne voie les professionnels et solopreneurs très occupés – en te faisant gagner plusieurs heures par semaine grâce à la gestion des petites logistiques du quotidien.",
    industry: "Professionnels et solopreneurs",
    tasks: [
      "Planification de la journée",
      "Gestion des tâches",
      "Recherche et synthèse",
      "Brouillons et documents",
    ],
    workflow: [
      "Écoute la demande",
      "Organise les tâches",
      "Exécute avec les outils",
      "Propose les prochaines étapes",
    ],
  },
  "calendar-booking": {
    name: "Agent de Réservation",
    shortName: "Réservation",
    category: "Business et opérations",
    description:
      "Trouve les créneaux libres, réserve les réunions et envoie les invitations automatiquement.",
    longDescription:
      "L'agent de Réservation gère la planification de bout en bout. Il cherche la disponibilité dans les agendas des participants, propose les meilleurs créneaux, réserve la réunion, confirme les présences et ajoute le lien de visioconférence. Connecté à Google Agenda, Outlook, Zoom et Slack, il met fin à l'éternel échange « quand es-tu dispo ? » – un vrai gain de temps pour la vente conseil, les services et toute équipe qui vit de rendez-vous.",
    industry: "Équipes de planification et réunions",
    tasks: [
      "Recherche de disponibilité",
      "Proposition de créneaux",
      "Réservation d'événements",
      "Liens vidéo automatiques",
    ],
    workflow: [
      "Vérifie la disponibilité",
      "Propose les créneaux",
      "Confirme les détails",
      "Réserve et confirme",
    ],
  },
  "lead-capture": {
    name: "Agent de Capture de Leads",
    shortName: "Lead Capture",
    category: "Marketing et ventes",
    description:
      "Capture chaque lead, enrichis-le et préviens les ventes en quelques secondes.",
    longDescription:
      "L'agent de Capture de Leads ne laisse jamais filer un prospect. Il collecte les coordonnées depuis formulaires, chat et site web, enrichit les contacts avec des données firmographiques et contextuelles et alerte l'équipe commerciale via Slack avec l'étape suivante recommandée. Connecté à Slack, HubSpot, Salesforce et Zapier, il transforme tes sources de leads en un pipeline toujours actif – pour que les ventes réagissent immédiatement et qu'aucune demande entrante ne reste sans réponse.",
    industry: "Ventes et génération de leads",
    tasks: [
      "Capture des leads",
      "Enrichissement des contacts",
      "Alerte de l'équipe commerciale",
      "Résumé du lead",
    ],
    workflow: [
      "Identifie le lead",
      "Valide les données",
      "Enrichit le contact",
      "Prévient les ventes",
    ],
  },
  "support-agent": {
    name: "Agent de Support",
    shortName: "Support",
    category: "Service client",
    description:
      "Répond à chaque ticket 24h/24 et ne fait remonter que ce qui exige un humain.",
    longDescription:
      "L'agent de Support résout les problèmes de tes clients 24 heures sur 24. Entraîné sur ta base de connaissances, il répond aux tickets en quelques secondes, rédige des réponses précises, classe chaque problème et ne fait remonter à ton équipe humaine que les cas qui le nécessitent vraiment. Connecté à Zendesk, Intercom, Help Scout et Slack, il réduit nettement le temps de première réponse et le backlog de tickets – un support rapide et constant sans augmenter les effectifs.",
    industry: "Équipes de service client",
    tasks: [
      "Réponses 24h/24",
      "Classification des tickets",
      "Brouillons de réponse",
      "Remontée des cas complexes",
    ],
    workflow: [
      "Lit le ticket",
      "Cherche dans la base de connaissances",
      "Rédige la réponse",
      "Fait remonter si nécessaire",
    ],
  },
  copywriter: {
    name: "Agent Rédacteur",
    shortName: "Rédaction",
    category: "Design et contenu",
    description:
      "Rédige des textes qui convertissent sur landing pages, annonces et emails.",
    longDescription:
      "L'agent Rédacteur écrit les mots qui transforment les visiteurs en clients. Il produit des textes adaptés à chaque plateforme pour les landing pages, annonces, emails et UI produit, avec plusieurs variantes prêtes pour les tests A/B. Intégré à Webflow, WordPress, Mailchimp et Notion, il supprime l'attente du freelance et des briefs : l'équipe marketing a des textes alignés sur la marque en quelques minutes et la variété de variantes nécessaire pour vraiment optimiser la conversion.",
    industry: "Équipes marketing et produit",
    tasks: [
      "Textes pour landing pages",
      "Textes pour annonces",
      "Textes pour emails",
      "Microcopie UI",
    ],
    workflow: [
      "Analyse la marque",
      "Définit le ton",
      "Rédige les variantes",
      "Remet pour les tests",
    ],
  },
  "finance-manager": {
    name: "Gestionnaire Financier",
    shortName: "Finances",
    category: "E-commerce et finance",
    description:
      "Garde un œil sur factures, dépenses et trésorerie – sans le chaos des feuilles de calcul.",
    longDescription:
      "L'agent Gestionnaire Financier garde les chiffres de ton entreprise en ordre. Il rapproche entrées et sorties, prépare des factures claires et des relances de paiement à approuver, et transforme des données éparses en un briefing de trésorerie en langage simple : ce qui est entré, ce qui est sorti, ce qui arrive à échéance et ce qu'il faut prioriser. Il signale les anomalies au lieu de les cacher, se connecte à Stripe, QuickBooks, Google Sheets et Slack, et n'invente jamais de chiffres – pour que fondateurs et petites équipes aient une vision financière fiable en quelques minutes plutôt que le chaos des feuilles de calcul.",
    industry: "PME et fondateurs",
    tasks: [
      "Factures et paiements",
      "Suivi des dépenses",
      "Rapport de trésorerie",
      "Relances de paiement",
    ],
    workflow: [
      "Rapproche les données",
      "Suit les dépenses",
      "Prépare les factures",
      "Rapporte la trésorerie",
    ],
  },
  "shopify-agent": {
    name: "Agent Shopify",
    shortName: "Shopify",
    category: "E-commerce et finance",
    description:
      "Recherche des produits, crée des liens de panier et consulte les commandes de ta boutique.",
    longDescription:
      "L'agent Shopify gère le commerce conversationnel de ta boutique. Il recherche dans le catalogue, génère des liens directs de panier pour des variantes précises, consulte le statut des commandes en toute sécurité avec numéro de commande et email, et indique la disponibilité en quelques secondes. Connecté à ta boutique Shopify, à Stripe, Slack et à l'email, il donne à l'acheteur la réponse et l'étape suivante instantanément – transformant une question produit en véritable lien d'achat plutôt qu'en conversation sans issue.",
    industry: "Boutiques Shopify",
    tasks: [
      "Recherche de produits",
      "Liens de panier",
      "Statut des commandes",
      "Sécurité des données",
    ],
    workflow: [
      "Analyse les meilleures ventes",
      "Suggère les produits",
      "Génère un checkout rapide",
      "Envoie la confirmation au client",
    ],
  },
  // ─── Nouveaux agents du catalogue étendu (10 disponibles + 5 bientôt) ───────
  "quote-agent": {
    name: "Agent de Devis",
    shortName: "Devis",
    category: "E-commerce et finance",
    description:
      "Recueille les besoins en chat, calcule sous-total, TVA et remises et envoie des devis formels par email.",
    longDescription:
      "L'agent de Devis guide les clients potentiels dans la définition des prestations demandées, génère instantanément une estimation transparente avec calcul des taxes et, à la demande de l'utilisateur, envoie une proposition formelle par email avec un récapitulatif en pièce jointe.",
    industry: "PME, artisans, ateliers et agences",
    tasks: [
      "Collecte des spécifications du projet",
      "Calcul détaillé du sous-total et de la TVA",
      "Application de remises personnalisées",
      "Envoi du devis formel par email",
    ],
    workflow: [
      "Collecte les lignes de dépenses",
      "Calcule le total et les taxes",
      "Montre l'aperçu au client",
      "Envoie la proposition par email",
    ],
  },
  "reviews-agent": {
    name: "Agent d'Avis",
    shortName: "Avis",
    category: "Service client",
    description:
      "Surveille les avis Google Business, détecte le sentiment et répond avec des messages personnalisés et empathiques.",
    longDescription:
      "L'agent d'Avis protège et valorise la réputation de ton établissement ou de ton activité sur Google Business Profile. Il analyse les retours clients, repère les critiques récurrentes et propose des brouillons de réponse aimables et précis, prêts à publier avec ton approbation.",
    industry: "Restaurants, hôtels, commerces et commerces locaux",
    tasks: [
      "Surveillance des avis Google Business",
      "Analyse du sentiment client",
      "Brouillons de réponse personnalisés",
      "Traitement rapide des critiques",
    ],
    workflow: [
      "Récupère les nouveaux avis",
      "Analyse le ton et la note",
      "Rédige une réponse professionnelle",
      "Publie après approbation",
    ],
  },
  "hr-recruiter": {
    name: "Agent RH & Recrutement",
    shortName: "RH",
    category: "Business et opérations",
    description:
      "Automatise le recrutement : screening des CV, préqualification des candidats et planification des entretiens.",
    longDescription:
      "L'agent RH & Recrutement accélère le processus d'embauche de ton entreprise. Il analyse les CV reçus en les comparant aux exigences du poste, formule des questions de préqualification et planifie les premiers entretiens dans l'Agenda.",
    industry: "PME en croissance, agences et services RH",
    tasks: [
      "Screening automatique des CV",
      "Comparaison compétences / fiche de poste",
      "Communication et retours aux candidats",
      "Planification des entretiens",
    ],
    workflow: [
      "Reçoit les candidatures",
      "Extrait les compétences clés",
      "Évalue l'adéquation",
      "Planifie le premier entretien",
    ],
  },
  "social-media-agent": {
    name: "Agent Réseaux Sociaux",
    shortName: "Social Media",
    category: "Design et contenu",
    description:
      "Planifie le calendrier éditorial, crée des légendes engageantes, suggère des hashtags et analyse les tendances.",
    longDescription:
      "L'agent Réseaux Sociaux est ton rédacteur et planner dédié pour Instagram, LinkedIn, TikTok et Facebook. Il propose des idées de posts basées sur les tendances du moment, écrit des textes engageants avec des hashtags ciblés et organise le plan éditorial hebdomadaire.",
    industry: "Marques, boutiques, agences et créateurs de contenu",
    tasks: [
      "Plans éditoriaux hebdomadaires",
      "Textes pour posts Instagram et LinkedIn",
      "Recherche de hashtags et tendances du secteur",
      "Adaptation des formats par canal",
    ],
    workflow: [
      "Repère les sujets tendance",
      "Rédige des textes avec appel à l'action",
      "Sélectionne les meilleurs hashtags",
      "Planifie dans le calendrier social",
    ],
  },
  "inventory-logistics": {
    name: "Agent Stocks & Logistique",
    shortName: "Logistique",
    category: "E-commerce et finance",
    description:
      "Surveille les stocks en entrepôt, alerte sur les produits en rupture imminente et suit les expéditions fournisseurs.",
    longDescription:
      "L'agent Stocks & Logistique évite les ruptures de stock et les retards de livraison. Il vérifie les niveaux d'entrepôt en temps réel, calcule le meilleur moment de réapprovisionnement et suit les expéditions en transit, en signalant les problèmes à l'avance.",
    industry: "E-commerce, revendeurs et entrepôts physiques",
    tasks: [
      "Contrôle des niveaux de stock",
      "Alertes automatiques de stock bas",
      "Prévision des volumes de réapprovisionnement",
      "Suivi du statut des expéditions",
    ],
    workflow: [
      "Vérifie le stock actuel",
      "Calcule la vitesse de vente",
      "Alerte sur les articles critiques",
      "Rédige la commande fournisseur",
    ],
  },
};