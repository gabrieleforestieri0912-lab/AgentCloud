import type { PluginLocalization } from "./skillCatalog";

/** French overlay of the skills catalog (canonical language: Italian). */
export const SKILL_LOCALIZATIONS_FR: Record<string, PluginLocalization> = {
  "ecommerce-operations": {
    name: "Opérations E-commerce",
    tagline: "Gérez catalogue, commandes et stock",
    description:
      "Suite complète pour gérer les opérations e-commerce : recherche produits avec lien panier, statut de commande et suivi, gestion des remises, alertes de stock avec prévision de réassort et synthèse des ventes.",
    category: "E-commerce",
    agents: {
      "shopify-agent": "Shopify Agent gère nativement catalogue et commandes",
      "inventory-logistics": "Inventory & Logistics gère entrepôt et stocks",
      "finance-manager": "Finance Manager analyse les métriques de ventes",
      "reviews-agent": "Reviews & Reputation utilise les données de commandes pour les avis",
    },
    integrations: {
      woocommerce: "WooCommerce fournit catalogue et commandes",
      shopify: "Shopify gère catalogue et commandes natifs",
      googlesheets: "Sheets sert d'entrepôt léger",
      airtable: "Airtable gère l'inventaire",
      slack: "Slack notifie les stocks critiques",
      gmail: "Gmail envoie les mises à jour de commande",
      paypal: "PayPal traite les paiements",
    },
    changelog: [
      {
        version: "1.0.0",
        date: "2026-01-15",
        changes: [
          "Première version du plugin : 5 compétences opérationnelles (catalogue, suivi de commande, remises, stocks, synthèse des ventes).",
          "WooCommerce et Google Sheets déjà disponibles ; Shopify et PayPal indiqués comme bientôt disponibles, jamais requis.",
        ],
      },
    ],
    skills: {
      "catalog-search": {
        name: "Recherche Catalogue",
        description:
          "Cherche des produits dans le catalogue et génère un lien panier. À utiliser quand le client demande des infos sur produits, disponibilité ou prix.",
        whenNot: [
          "Le client demande des infos sur une commande déjà expédiée (utiliser Suivi Commande)",
          "Le catalogue connecté n'est pas disponible : ne pas inventer de prix, proposer le lien vers la boutique",
        ],
        procedure: [
          "Demander ou déduire du contexte : nom du produit, variante, quantité, budget",
          "Chercher dans le catalogue connecté avec les termes exacts du client",
          "S'il y a des variantes, en proposer 3 maximum avec une différence de prix claire",
          "Renseigner le résultat : nom, SKU, prix, disponibilité, lien panier",
          "Toujours ajouter l'avertissement : prix et disponibilité à vérifier au paiement",
        ],
        rules: [
          "Ne jamais inventer prix, SKU ou disponibilité : si la donnée manque, le dire",
          "Ne pas appliquer de remises : la gestion des remises est une compétence séparée avec approbation",
          "Ton : professionnel et direct, phrases courtes",
        ],
        output:
          "Tableau produit (nom, SKU, prix, disponibilité) + lien panier + note de vérification au paiement",
        example: "Il me faut un cadeau pour l'anniversaire de Marta, budget 60 euros",
      },
      "order-tracking": {
        name: "Suivi Commande",
        description:
          "Vérifie le statut d'une commande et fournit le suivi. À utiliser pour les demandes type « où est ma commande » ou les mises à jour de livraison.",
        whenNot: [
          "Aucune commande connectée : demander le numéro de commande ou l'email d'achat",
          "Le client demande un retour ou un remboursement (ce n'est pas du suivi : rediriger vers Support Agent)",
        ],
        procedure: [
          "Identifier la commande : numéro de commande, email ou nom + prénom",
          "Si l'identifiant manque, le demander et ne pas continuer",
          "Lire statut, date prévue, code de suivi et transporteur",
          "Indiquer la date de livraison prévue et le dernier événement de suivi",
          "Si la livraison est en retard, proposer le parcours de remboursement/réexpédition en option",
        ],
        rules: [
          "Ne jamais inventer de codes de suivi ni de dates de livraison",
          "Ne pas promettre de remboursements : proposition puis approbation humaine",
          "Données personnelles minimales dans la synthèse (nom, ville, pas d'adresse complète)",
        ],
        output:
          "Statut de commande en une ligne + tableau de suivi (événement, date) + date de livraison prévue",
        example: "Où est passée ma commande n°1042 ?",
      },
      "discount-management": {
        name: "Gestion Remises",
        description:
          "Gère codes de remise et promotions. À utiliser sur les demandes de remise ou de promotions ; exige une approbation pour les remises supérieures à 20 %.",
        whenNot: [
          "Remise demandée au-delà de 20 % : passer par une approbation humaine",
          "Promotion avec impact sur les prix catalogue : ne pas appliquer, signaler au responsable",
        ],
        procedure: [
          "Vérifier la remise demandée et son niveau en pourcentage",
          "Contrôler qu'aucune promotion active ne porte sur la même gamme de produits",
          "Si ≤ 20 % : l'appliquer et communiquer code et validité",
          "Si > 20 % : préparer le brouillon, expliquer l'impact et demander une approbation",
          "Toujours enregistrer la remise appliquée avec date et motif commercial",
        ],
        rules: [
          "Seuil d'approbation : 20 %. Au-delà, jamais sans confirmation explicite",
          "Ne pas inventer de codes promotionnels existants",
          "Ne pas combiner les codes si la boutique les exclut (vérifier les règles)",
        ],
        output:
          "Code de remise + pourcentage + validité + confirmation d'application, ou demande d'approbation",
        example: "Le client historique demande 25 % : on lui accorde ?",
      },
      "stock-alert": {
        name: "Alerte Stocks",
        description:
          "Surveille les niveaux de stock et génère des prévisions de réassort. À utiliser pour alerter quand un produit passe sous le seuil minimal.",
        whenNot: [
          "Aucun logiciel d'entrepôt connecté : utiliser Sheets/Airtable si disponibles",
          "Demande de réassort concret auprès d'un fournisseur : passer à Inventory & Logistics",
        ],
        procedure: [
          "Lire les niveaux de stock des produits vendus sur la dernière période",
          "Comparer avec le seuil minimal convenu",
          "Calculer la prévision de réassort : vente moyenne quotidienne × jours de couverture",
          "Signaler les produits sous le seuil avec la date estimée de rupture",
          "Notifier l'équipe (Slack) uniquement pour les stocks critiques",
        ],
        rules: [
          "Ne pas modifier les niveaux d'entrepôt : cette compétence lit et alerte seulement",
          "Estimation explicite : toujours indiquer la méthode (moyenne 30 jours)",
          "Seuil minimal : s'il n'est pas défini, demander avant de notifier",
        ],
        output:
          "Liste des produits sous le seuil : nom, stock, seuil, rupture estimée, quantité de réassort suggérée",
        example: "Qu'est-ce qui va bientôt manquer ? Fais-moi la liste pour le réassort",
      },
      "sales-summary": {
        name: "Synthèse Ventes",
        description:
          "Génère un rapport de ventes quotidien, hebdomadaire ou mensuel avec métriques clés et variation sur la période précédente.",
        whenNot: [
          "Demande d'analyse stratégique ou de décisions : utiliser Report & Décisions",
        ],
        procedure: [
          "Déterminer la période (aujourd'hui, 7 jours, 30 jours) et aligner la période de comparaison",
          "Calculer : commandes, chiffre d'affaires, panier moyen, taux de conversion si disponible",
          "Calculer la variation en pourcentage sur la période précédente",
          "Mettre en avant les 3 produits et les 3 catégories à la variation la plus marquée",
          "Terminer par 1 à 3 actions suggérées, pas par une liste de chiffres",
        ],
        rules: [
          "Toujours citer la période exacte et la source des données",
          "Aucun chiffre non calculé : si la donnée manque, écrire « non disponible »",
          "Ne pas faire de prévisions de chiffre d'affaires sans historique suffisant",
        ],
        output:
          "Tableau KPI (période actuelle vs précédente, variation) + 3 points forts + 3 actions",
        example: "Combien avons-nous vendu cette semaine par rapport à la semaine dernière ?",
      },
    },
  },
  "lead-sales": {
    name: "Leads & Ventes",
    tagline: "Capturez, qualifiez et convertissez les leads",
    description:
      "Système de gestion des leads : capture et validation des contacts, enrichissement du profil, score High/Medium/Low, notification à l'équipe, séquence de relance et mise à jour du pipeline.",
    category: "Ventes",
    agents: {
      "lead-capture": "Lead Capture est dédié à la capture et à la gestion des leads",
      "crm-agent": "CRM Agent gère pipeline et leads qualifiés",
      "whatsapp-agent": "WhatsApp Agent suit les leads via chat",
      "calendar-booking": "Calendar Booking conclut le lead avec un rendez-vous",
    },
    integrations: {
      hubspot: "HubSpot est la source de vérité des contacts",
      slack: "Slack alerte en temps réel sur les leads chauds",
      gmail: "Gmail envoie la relance par email",
      googlesheets: "Sheets suit le pipeline des leads",
      googlecalendar: "Calendar réserve les appels de relance",
      whatsapp: "WhatsApp suit le lead via chat",
      calendly: "Calendly réserve le rendez-vous",
      mailchimp: "Mailchimp gère les campagnes email",
    },
    changelog: [
      {
        version: "1.0.0",
        date: "2026-01-15",
        changes: [
          "Première version : capture, enrichissement, score, notification à l'équipe et séquence de relance.",
          "HubSpot, Slack, Gmail, Sheets et Calendar déjà disponibles ; WhatsApp, Calendly et Mailchimp bientôt.",
        ],
      },
    ],
    skills: {
      "lead-capture": {
        name: "Capture Leads",
        description:
          "Capture et valide les nouveaux leads de diverses sources. À utiliser quand arrive une demande de contact, une demande de devis ou un formulaire à remplir.",
        whenNot: [
          "Le contact est déjà dans le CRM : mettre à jour (Enrichissement Profil), ne pas dupliquer",
          "Demande qui relève en fait du service après-vente : passer à Support Agent",
        ],
        procedure: [
          "Extraire les données disponibles : nom, email, téléphone, entreprise, source",
          "Valider les données : email formellement valide, téléphone plausible, code postal/nom cohérents",
          "Ne demander que les champs manquants, en un seul message court",
          "Enregistrer le lead dans le CRM avec source et date",
          "Renvoyer la confirmation d'acquisition et la prochaine étape",
        ],
        rules: [
          "Consentement : toujours enregistrer l'origine de la donnée et la base du consentement",
          "Ne pas acheter ni enrichir de listes : uniquement les données fournies par le contact",
          "RGPD : vérifier rétention et bases légales pour les leads B2B avant l'export",
        ],
        output:
          "Fiche lead (nom, entreprise, email, téléphone, source, champs manquants) + confirmation CRM",
        example: "Je suis Marco Bianchi de Bianchi Srl, je voudrais un devis pour 300 chaises",
      },
      "lead-enrichment": {
        name: "Enrichissement Profil",
        description:
          "Enrichit le profil du lead avec des données d'entreprise et historise les interactions. À utiliser après la capture pour compléter la fiche.",
        whenNot: [
          "Données d'entreprise non disponibles dans les sources connectées : demander, ne pas deviner",
          "Demande de scraping massif : hors du principe de moindre privilège",
        ],
        procedure: [
          "Lire la fiche lead actuelle et repérer les champs vides",
          "Compléter uniquement avec les données des sources connectées (CRM, Sheets, Notes)",
          "Ajouter une note horodatée pour chaque interaction",
          "Signaler les champs encore inconnus, ne pas les remplir par suppositions",
          "Mettre à jour la fiche CRM",
        ],
        rules: [
          "Aucune donnée inventée : sources ou « non disponible »",
          "Ne pas utiliser de données personnelles au-delà du nécessaire (nom, rôle, entreprise)",
          "Chaque ajout doit avoir une date et une source",
        ],
        output: "Fiche lead mise à jour + liste des champs encore manquants + sources utilisées",
        example: "Complète la fiche de Marco Bianchi avec ce que tu sais",
      },
      "lead-scoring": {
        name: "Score Leads",
        description:
          "Attribue un score High/Medium/Low au lead selon engagement, budget et délais. À utiliser pour décider des priorités de relance.",
        whenNot: [
          "Aucune donnée historique d'interaction : attribuer « Low (données insuffisantes) »",
          "Décision commerciale définitive : le score est une aide, pas un verdict",
        ],
        procedure: [
          "Recueillir les signaux : visites, emails ouverts, demandes, rôle, taille d'entreprise",
          "Évaluer trois dimensions : engagement (activité), budget (taille/préférences), délai (urgence)",
          "Calculer le score 0-100 et la tranche : High 70+, Medium 40-69, Low <40",
          "Lister les 3 signaux qui ont le plus pesé, avec les motifs",
          "Proposer l'action suivante cohérente avec la tranche",
        ],
        rules: [
          "Le score est une estimation déclarée : toujours montrer les signaux qui le composent",
          "Aucune donnée protégée (santé, religion, orientation) n'entre dans le score",
          "Recalculer à chaque interaction : le score n'est pas une étiquette fixe",
        ],
        output: "Tranche + score + 3 signaux principaux + prochaine action recommandée",
        example: "Comment classons-nous Bianchi Srl ? Ils ont demandé trois devis",
      },
      "team-notification": {
        name: "Notification Équipe",
        description:
          "Notifie l'équipe commerciale sur un lead chaud avec synthèse et actions suggérées. À utiliser quand un lead dépasse le seuil High.",
        whenNot: [
          "Le lead n'est pas High : ne pas déranger l'équipe, cela se lit dans le CRM",
          "Canal Slack non connecté : proposer l'email ou reporter",
        ],
        procedure: [
          "Vérifier que le lead est High et que le canal est connecté",
          "Composer le message en 6 lignes maximum : qui, que demande-t-il, valeur, action, échéance",
          "Insérer un lien direct vers la fiche CRM",
          "Envoyer la notification et confirmer l'envoi",
          "Enregistrer la notification sur la fiche lead",
        ],
        rules: [
          "Aucune donnée personnelle sensible dans le message de notification",
          "Ne pas notifier deux fois le même lead sans événement nouveau",
          "Le message doit être autosuffisant : qui ne lit que Slack doit comprendre",
        ],
        output: "Message de notification envoyé (aperçu 6 lignes) + résultat",
        example: "Préviens l'équipe : Bianchi Srl est un lead chaud, devis de 12k",
      },
      "followup-sequence": {
        name: "Séquence de Relance",
        description:
          "Crée et gère des séquences de relance personnalisées selon le score du lead. À utiliser pour conclure les affaires en suspens.",
        whenNot: [
          "Le lead a répondu ou a dit « pas intéressé » : interrompre la séquence",
          "Séquence au-delà de 5 emails : exiger une approbation explicite",
        ],
        procedure: [
          "Vérifier l'état de l'affaire et le dernier contact",
          "Définir les étapes : canal, sujet, date, objectif pour chaque étape",
          "Rédiger chaque email court (120 mots max), ton de l'entreprise, un seul CTA",
          "Programmer la séquence et enregistrer la planification sur la fiche",
          "Chaque réponse du lead interrompt automatiquement les étapes suivantes",
        ],
        rules: [
          "5 emails maximum par séquence, intervalle minimal de 2 jours",
          "Désinscription toujours présente (« si tu ne souhaites plus recevoir, réponds STOP »)",
          "Aucune promesse commerciale non confirmée en interne",
        ],
        output:
          "Tableau de séquence (étape, date, canal, objet email, objectif) + textes en brouillon",
        example: "Prépare la relance pour Bianchi : sans réponse depuis 9 jours",
      },
    },
  },
  "support-reputation": {
    name: "Assistance & Réputation",
    tagline: "Support client et gestion des avis",
    description:
      "Suite pour le service client : réponse depuis la base de connaissances avec escalade, classification de l'urgence des tickets, brouillon de réponse aux avis avec analyse du sentiment, gestion des réclamations et ton de voix de la marque.",
    category: "Assistance",
    agents: {
      "support-agent": "Support Agent gère tickets et base de connaissances",
      "reviews-agent": "Reviews & Reputation gère avis et réputation",
      "whatsapp-agent": "WhatsApp Agent assiste les clients via chat",
      "email-manager": "Email Manager gère les tickets via email",
    },
    integrations: {
      slack: "Slack gère l'escalade humaine",
      notion: "Notion est la base de connaissances (RAG)",
      googledrive: "Drive héberge les documents de la base de connaissances",
      gmail: "Gmail gère les tickets via email",
      googlesheets: "Sheets suit tickets et SLA",
      zendesk: "Zendesk gère les tickets avancés",
      whatsapp: "WhatsApp assiste les clients en chat",
      googlechat: "Google Chat gère le support interne",
    },
    changelog: [
      {
        version: "1.0.0",
        date: "2026-01-15",
        changes: [
          "Première version : réponse depuis la base de connaissances, urgence des tickets, brouillon d'avis et gestion des réclamations.",
          "La gestion des réclamations est à haut risque : chaque solution proposée doit être approuvée avant envoi.",
        ],
      },
    ],
    skills: {
      "kb-response": {
        name: "Réponse Base de Connaissances",
        description:
          "Répond aux questions des clients à partir de la base de connaissances de l'entreprise. À utiliser quand la question a une réponse documentée ; escalader en cas de doute.",
        whenNot: [
          "La base de connaissances ne contient pas la réponse : escalader, ne pas improviser",
          "Demande juridique, médicale ou de sécurité : escalade immédiate vers un humain",
        ],
        procedure: [
          "Chercher dans la base de connaissances (Notion/Drive) les documents pertinents",
          "Vérifier que le document couvre vraiment le cas du client",
          "Répondre en langage simple, avec les étapes numérotées",
          "Citer la source du document utilisé",
          "Si la couverture est partielle, le dire et proposer l'escalade",
        ],
        rules: [
          "Ne jamais inventer de procédure : si elle n'est pas documentée, elle n'existe pas",
          "Ton : empathique et concret, 150 mots maximum",
          "Ne jamais partager de documents internes sensibles avec le client : uniquement la réponse",
        ],
        output:
          "Réponse au client (150 mots max) + document source + résultat de recherche (complète/partielle)",
        example: "Comment remplace-t-on un filtre de climatiseur ?",
      },
      "ticket-urgency": {
        name: "Classification Urgence",
        description:
          "Classe les tickets par urgence (critical, high, medium, low) selon SLA et impact client. À utiliser à chaque nouveau ticket.",
        whenNot: [
          "Le ticket concerne des données personnelles effacées ou des failles de sécurité : toujours critical",
          "On ne sait pas si le client est payant : demander avant de classer",
        ],
        procedure: [
          "Lire le ticket et identifier impact, client et SLA applicable",
          "Classer : critical (service arrêté/sécurité/SLA rompu), high (blocage opérationnel), medium (demande avec contournement), low (information)",
          "Attribuer la première réponse attendue selon le SLA",
          "Indiquer le motif en une ligne",
          "Pour critical et high, notifier aussitôt l'équipe",
        ],
        rules: [
          "Les SLA sont ceux de l'entreprise : s'ils ne sont pas définis, le déclarer et utiliser le défaut",
          "Ne jamais clore un ticket critical sans résolution vérifiée",
          "La classification n'est pas définitive : elle peut être revue avec le client",
        ],
        output: "Ticket + niveau d'urgence + SLA de première réponse + motif + notification (si haute)",
        example: "J'ai 12 tickets ouverts depuis hier, dis-moi lesquels traiter en premier",
      },
      "review-draft": {
        name: "Brouillon d'Avis",
        description:
          "Génère le brouillon de réponse à un avis en analysant le sentiment. À utiliser pour répondre aux avis positifs ou négatifs.",
        whenNot: [
          "Avis qui accuse sur des données personnelles ou de la fraude : escalade avant de répondre",
          "Demande de faux avis ou de suppression injustifiée : jamais",
        ],
        procedure: [
          "Analyser le sentiment : positif, neutre, négatif (et la gravité si négatif)",
          "Si positif : remercier nommément et inviter au réachat",
          "Si négatif : reconnaître le problème, s'excuser sans accuser, proposer le contact direct, ne pas débattre en public",
          "Garder le ton de voix de la marque et ne citer aucune donnée personnelle du client",
          "Préparer le brouillon : la publication reste une action qui exige une approbation",
        ],
        rules: [
          "Ne jamais répondre de façon défensive ou sarcastique",
          "100 mots maximum, sans promesses financières",
          "Aucune donnée personnelle au-delà du nom déjà publié",
        ],
        output: "Brouillon de réponse + sentiment détecté + éventuel signalement d'escalade",
        example: "Cet avis est négatif sur la livraison, on répond ?",
      },
      "complaint-handling": {
        name: "Gestion Réclamations",
        description:
          "Gère les réclamations avec procédure standard, vérifie la faisabilité de la solution et tient le registre. À utiliser sur les réclamations formelles.",
        whenNot: [
          "Réclamation exigeant remboursement ou pénalité : proposition et approbation humaine obligatoires",
          "Réclamation avec données personnelles : vérifier le RGPD avant de partager tout document",
        ],
        procedure: [
          "Recueillir les faits : que s'est-il passé, quand, quelle commande, quel impact",
          "Vérifier la faisabilité de la solution avec les données réelles (commandes, livraisons, politique)",
          "Proposer la solution : une seule, concrète, avec délais",
          "Enregistrer la réclamation avec résultat et date de clôture",
          "Si l'envoi de la réponse contient engagements ou remboursements, demander une approbation",
        ],
        rules: [
          "Action à haut risque : la réponse à la réclamation doit être approuvée avant envoi",
          "Reconnaître une erreur est une obligation de bonne foi : ne pas nier l'évidence",
          "Ne pas offrir de dédommagements non prévus par la politique de l'entreprise",
        ],
        output:
          "Registre de réclamation (faits, solution proposée, délais, résultat) + brouillon de réponse en attente d'approbation",
        example: "Réclamation client commande n°331 : arrivée cassée et sans réponse depuis 5 jours",
      },
    },
  },
  "bookings-calendar": {
    name: "Réservations & Agenda",
    tagline: "Gérez rendez-vous et calendrier",
    description:
      "Système de gestion de l'agenda : vérification de disponibilité et proposition de créneaux, réservation avec lien vidéo, rappels et gestion des no-shows, replanifications et annulations, planification de la journée et blocs de deep work.",
    category: "Productivité",
    agents: {
      "calendar-booking": "Calendar Booking gère rendez-vous et disponibilités",
      "personal-assistant": "Personal Assistant planifie agenda et tâches",
      "hr-recruiter": "HR & Recruiter planifie les entretiens",
      "whatsapp-agent": "WhatsApp Agent confirme les rendez-vous via chat",
    },
    integrations: {
      googlecalendar: "Calendar est indispensable pour les réservations",
      gmail: "Gmail envoie confirmations et rappels",
      notion: "Notion conserve notes de réunions et tâches",
      googlemeet: "Google Meet génère le lien vidéo",
      microsoftoutlook: "Outlook élargit la couverture du calendrier",
      calendly: "Calendly simplifie la réservation",
      googletasks: "Google Tasks synchronise les tâches",
    },
    changelog: [
      {
        version: "1.0.0",
        date: "2026-01-15",
        changes: [
          "Première version : disponibilité, réservation, rappels no-show, replanification et planification de journée.",
          "Google Calendar et Gmail déjà disponibles ; Google Meet, Outlook, Calendly et Tasks bientôt.",
        ],
      },
    ],
    skills: {
      "availability-check": {
        name: "Vérification Disponibilité",
        description:
          "Vérifie la disponibilité du calendrier et propose des créneaux optimaux selon les préférences. À utiliser au début de chaque demande de rendez-vous.",
        whenNot: [
          "Demande urgente pour aujourd'hui même : proposer quand même, en signalant les contraintes",
          "Le calendrier n'est pas connecté : proposer les horaires et demander une confirmation manuelle",
        ],
        procedure: [
          "Lire les engagements sur la période demandée",
          "Appliquer les contraintes : horaires de travail, durée minimale, pauses, fuseau horaire du client",
          "Proposer 3 créneaux maximum, avec date, heure et durée explicites",
          "Indiquer le fuseau horaire pour chaque créneau",
          "Demander lequel il préfère ; ne pas encore réserver",
        ],
        rules: [
          "Toujours afficher le fuseau horaire : les erreurs de fuseau sont la cause n°1 des no-shows",
          "3 propositions maximum, pas un menu infini",
          "Ne pas proposer de créneau hors horaires de travail sans le signaler",
        ],
        output: "Liste de 3 créneaux maximum (date, heure, durée, fuseau) + durée standard du service",
        example: "Je voudrais un appel jeudi, durée 45 minutes",
      },
      "booking-creation": {
        name: "Création Réservation",
        description:
          "Crée le rendez-vous dans le calendrier avec lien vidéo et envoie la confirmation. À utiliser après que le client a choisi le créneau.",
        whenNot: [
          "Créneau pas encore confirmé par le client : ne pas créer l'événement",
          "Demande de modification d'un rendez-vous existant : utiliser Replanification/Annulation",
        ],
        procedure: [
          "Vérifier que le créneau est encore libre avant de l'écrire",
          "Créer l'événement avec titre compréhensible, horaire, durée, participants",
          "Ajouter le lien vidéo si l'intégration est connectée, sinon l'indiquer comme à ajouter",
          "Envoyer la confirmation avec : date, heure, fuseau, lien, quoi apporter",
          "Enregistrer l'événement pour les rappels",
        ],
        rules: [
          "Titre d'événement lisible par le client, pas de codes internes",
          "Toujours confirmer dans les 2 minutes après la confirmation du client",
          "Ne pas partager les détails des autres participants",
        ],
        output:
          "Rendez-vous créé (date, heure, durée, lien vidéo) + confirmation envoyée + état du rappel",
        example: "Parfait, jeudi à 15h00 me convient",
      },
      "reminder-no-show": {
        name: "Rappels No-show",
        description:
          "Gère les rappels avant rendez-vous et le suivi en cas de no-show. À utiliser pour tous les rendez-vous confirmés.",
        whenNot: [
          "Rendez-vous pas encore confirmé : aucun rappel",
          "Rappel déjà envoyé : ne pas dupliquer",
        ],
        procedure: [
          "Préparer le rappel : date, heure, fuseau, lien, objectif en 2 lignes",
          "Envoyer 24h avant ; si la demande est dans les 24h, l'envoyer aussitôt",
          "Si le rendez-vous passe sans présence, envoyer un suivi aimable sous 2 heures",
          "Proposer une nouvelle date avec 2 créneaux alternatifs",
          "Enregistrer l'événement (rappel envoyé / no-show)",
        ],
        rules: [
          "Un seul rappel par rendez-vous, 24h avant",
          "Ton du suivi : aucun reproche, 2 lignes maximum",
          "Ne pas déduire d'absence définitive d'un retard de quelques minutes",
        ],
        output: "Rappel envoyé (horaire) ou suivi no-show (horaire) + 2 créneaux alternatifs",
        example: "Le client de 15h ne s'est pas connecté, que lui écrivons-nous ?",
      },
      "reschedule-cancel": {
        name: "Replanification/Annulation",
        description:
          "Gère les demandes de modification ou d'annulation en appliquant les politiques de l'entreprise. À utiliser quand un client demande à déplacer ou annuler.",
        whenNot: [
          "Annulation avec pénalité au-delà de la politique : proposition et approbation humaine",
          "Demande de tiers pour un rendez-vous d'autrui : vérifier qu'ils sont autorisés",
        ],
        procedure: [
          "Lire le rendez-vous et la politique de l'entreprise (ex. 24h de préavis)",
          "Vérifier si la demande respecte les conditions : pas de pénalité ou pénalité à appliquer",
          "Si c'est une modification, proposer 2 créneaux avec la même logique que Vérification Disponibilité",
          "Mettre à jour ou annuler l'événement",
          "Envoyer la confirmation avec la nouvelle date ou l'annulation et les éventuelles pénalités",
        ],
        rules: [
          "Les pénalités se citent depuis la politique écrite : jamais improvisées",
          "Annulation au-delà du seuil : toujours confirmation humaine",
          "Notifier les parties internes uniquement si la politique le prévoit",
        ],
        output:
          "Résultat (déplacé/annulé) + nouvelle date si replanifié + pénalité appliquée (si présente) + confirmation envoyée",
        example: "Je dois déplacer le rendez-vous de mardi à jeudi",
      },
      "day-planning": {
        name: "Planification Journée",
        description:
          "Organise la journée avec des blocs de deep work et gère les priorités. À utiliser le matin ou sur demande de plan quotidien.",
        whenNot: [
          "Journée déjà pleine d'engagements fixes : proposer quand même, en ne déplaçant que si flexibles",
          "Demande de priorités de semaine/sprint : utiliser Projets & Tâches",
        ],
        procedure: [
          "Lire les engagements fixes de la journée",
          "Identifier 2-3 tâches à haute priorité et d'importance stratégique",
          "Proposer 1-2 blocs de deep work de 90 minutes dans les plages libres",
          "Insérer des tampons de 15 minutes entre les blocs",
          "Terminer par la liste de ce qu'ils ne feront PAS aujourd'hui, pour éviter la culpabilité",
        ],
        rules: [
          "3 tâches « du jour » maximum : la longue liste ne génère que de l'anxiété",
          "Deep work ≥ 60 minutes : en dessous, ce n'est pas du deep work",
          "Ne jamais déplacer de réunions avec d'autres sans dire que tu le fais",
        ],
        output:
          "Plan de journée : tâches du jour (3) + blocs deep work avec horaire + ce qui reste en liste",
        example: "Organise ma journée de jeudi",
      },
    },
  },
  "quotes-finance": {
    name: "Devis & Finance",
    tagline: "Générez des devis et gérez la comptabilité",
    description:
      "Suite financière : recueil des besoins et calcul du devis avec TVA, génération du document formel, rapprochement des entrées et sorties, échéancier fiscal avec relances et extraction de données des factures.",
    category: "Finance",
    agents: {
      "quote-agent": "Quotes & Estimates génère des devis professionnels",
      "finance-manager": "Finance Manager gère comptabilité et factures",
      "invoice-agent": "Invoice Agent gère la facturation",
      "business-manager": "Business Manager analyse les métriques financières",
    },
    integrations: {
      gmail: "Gmail envoie devis et relances",
      googlesheets: "Sheets tient l'échéancier fiscal",
      microsoftexcel: "Excel crée les documents financiers",
      microsoftword: "Word génère les documents formels",
      googledrive: "Drive héberge les documents fiscaux",
      paypal: "PayPal traite les paiements",
    },
    changelog: [
      {
        version: "1.0.0",
        date: "2026-01-15",
        changes: [
          "Première version : calcul de devis avec TVA 22 %, document formel, rapprochement et échéancier fiscal.",
          "Rapprochement et relances à haut risque : les enregistrements et les envois exigent une approbation.",
        ],
      },
    ],
    skills: {
      "quote-calculation": {
        name: "Calcul Devis",
        description:
          "Recueille les besoins et calcule le devis avec base hors taxe, TVA 22 % et remises. À utiliser quand le client demande un devis.",
        whenNot: [
          "Devis avec taux de TVA différent : demander et utiliser le taux indiqué",
          "Tarifs non disponibles : demander les prix, ne pas les inventer",
        ],
        procedure: [
          "Recueillir les besoins : que faut-il, quantités, délais, exigences particulières",
          "Appliquer les prix catalogue aux lignes, une ligne par poste",
          "Calculer base = Σ lignes − remises ; TVA = base × 22 % ; total = base + TVA",
          "Afficher chaque ligne avec quantité, prix unitaire, montant et TVA",
          "Indiquer la validité du devis (30 jours par défaut) et les conditions de paiement",
        ],
        rules: [
          "TVA : utiliser le bon taux (22 % par défaut) et l'afficher clairement",
          "Arrondir à 2 décimales, jamais au hasard",
          "Aucun coût non devisé : les postes supplémentaires se disent tout de suite",
        ],
        output:
          "Tableau des postes + base, TVA 22 %, total ; conditions de paiement et validité",
        example: "Devis pour 300 chaises, 12 tables et montage, livraison à Milan",
      },
      "document-generation": {
        name: "Génération Document",
        description:
          "Génère le document formel (Word/PDF) à partir du modèle de l'entreprise. À utiliser après le calcul du devis.",
        whenNot: [
          "Document avec données fiscales non vérifiées : bloquer et demander confirmation",
          "Envoi du document au client : action à haut risque, exige une approbation",
        ],
        procedure: [
          "Prendre le dernier devis calculé et les données du client",
          "Remplir le modèle de l'entreprise : en-tête, client, postes, totaux, conditions",
          "Vérifier les champs obligatoires : raison sociale, TVA/SIRET, date, signatures",
          "Générer le document et indiquer le nom de fichier",
          "L'envoi reste une action qui exige une approbation humaine",
        ],
        rules: [
          "TVA et SIRET obligatoires : aucun document sans données fiscales complètes",
          "Ne pas insérer de coordonnées bancaires si absentes du modèle",
          "Nom de fichier : `devis-<client>-<date>.docx`",
        ],
        output:
          "Document généré (nom de fichier) + liste des champs vérifiés + état d'envoi (en attente d'approbation)",
        example: "Génère le document du devis pour Bianchi Srl",
      },
      "reconciliation": {
        name: "Rapprochement",
        description:
          "Rapproche entrées et sorties en comparant factures et mouvements bancaires. À utiliser en fin de mois ou sur demande de pointage.",
        whenNot: [
          "Mouvements bancaires non accessibles : le rapprochement se fait à la main",
          "Données fiscales en écriture : cette compétence signale seulement, n'enregistre pas",
        ],
        procedure: [
          "Charger le relevé de la période et la liste des factures",
          "Rapprocher par montant, date et libellé ; marquer les correspondances certaines",
          "Lister les non rapprochés en deux groupes : manquants et doublons",
          "Pour chaque non rapproché, indiquer l'hypothèse la plus probable et ce qu'il faut pour la confirmer",
          "Proposer les écritures, sans les appliquer",
        ],
        rules: [
          "Action à haut risque : aucune écriture comptable sans approbation",
          "Ne jamais modifier les données sources (factures ou relevé)",
          "Chaque proposition doit citer au moins deux données qui la soutiennent",
        ],
        output:
          "Résumé : rapprochés (nombre et total), manquants, doublons, propositions d'écritures à approuver",
        example: "Rapprochons le mois de septembre",
      },
      "fiscal-deadlines": {
        name: "Échéancier Fiscal",
        description:
          "Gère les échéances fiscales et prépare les relances. À utiliser pour le suivi périodique des échéances.",
        whenNot: [
          "Relances automatiques aux clients : exigent toujours une approbation",
          "Déclarations ou obligations fiscales : cette compétence suit, ne calcule pas",
        ],
        procedure: [
          "Lister les échéances de la période avec montant, client et date",
          "Séparer : échues, à venir sous 7 jours, suivantes",
          "Pour les échues, préparer le brouillon de relance (100 mots max, ton cordial mais ferme)",
          "Signaler les échéances fiscales internes avec jours d'avance",
          "Chaque relance reste en attente d'approbation avant envoi",
        ],
        rules: [
          "Envoi de relances = action à haut risque : jamais sans approbation",
          "Aucune donnée fiscale calculée par cette compétence : on suit et on signale",
          "Citer l'échéance avec date et montant exacts",
        ],
        output:
          "Échéancier : échues / 7 prochains jours / suivantes + brouillons de relances en attente d'approbation",
        example: "Quelles factures sont échues et à qui écrire ?",
      },
    },
  },
  "content-seo": {
    name: "Contenus & SEO",
    tagline: "Créez des contenus optimisés SEO",
    description:
      "Outils pour le content marketing : recherche de mots-clés avec intention de recherche, analyse des contenus concurrents, articles SEO structurés, textes pour landing et ads avec variantes A/B, séquences email et newsletters.",
    category: "Marketing",
    agents: {
      "seo-agent": "SEO Content Agent optimise les contenus pour la recherche",
      copywriter: "Copywriter crée des textes persuasifs",
      "social-media-agent": "Social Media utilise les contenus pour les posts",
      "research-agent": "Research Agent fournit les données pour les contenus",
    },
    integrations: {
      notion: "Notion pour les brouillons et la révision des contenus",
      googlesheets: "Sheets pour le plan éditorial et les mots-clés",
      microsoftword: "Word pour les révisions finales",
      googledrive: "Drive héberge les contenus",
      googleanalytics: "Analytics mesure la performance des contenus",
      googledocs: "Docs pour la collaboration sur les contenus",
      mailchimp: "Mailchimp gère les campagnes",
      googleads: "Google Ads mesure la performance des ads",
    },
    changelog: [
      {
        version: "1.0.0",
        date: "2026-01-15",
        changes: [
          "Première version : recherche de mots-clés, analyse concurrents, article SEO et textes pour ads avec variantes A/B.",
          "Notion, Sheets, Word et Drive déjà disponibles ; Analytics, Docs, Mailchimp et Ads bientôt.",
        ],
      },
    ],
    skills: {
      "keyword-research": {
        name: "Recherche Mots-clés",
        description:
          "Recherche de mots-clés avec analyse de volume, difficulté et intention de recherche. À utiliser avant d'écrire tout contenu SEO.",
        whenNot: [
          "Aucune source de données SEO connectée : proposer des mots-clés raisonnés et le déclarer",
          "Sujet non pertinent pour le business : le signaler et proposer des alternatives",
        ],
        procedure: [
          "Recueillir le thème, le public et l'objectif du contenu",
          "Déduire des mots-clés longue traîne liés à l'intention réelle (informative, commerciale, transactionnelle)",
          "Regrouper par intention et par difficulté",
          "Sélectionner 1 mot-clé principal et 5 à 8 secondaires",
          "Indiquer la source de chaque donnée : si c'est une estimation, le dire",
        ],
        rules: [
          "Aucun volume de recherche inventé : s'il n'est pas disponible, indiquer « à vérifier »",
          "Priorité aux mots-clés longue traîne à faible difficulté pour les PME",
          "Pas de bourrage de mots-clés : la densité naturelle suffit",
        ],
        output: "Tableau de mots-clés (mot-clé, intention, difficulté, rôle) + mot-clé principal recommandé",
        example: "Quels mots-clés viser pour « comment choisir des chaises de bureau » ?",
      },
      "competitor-analysis": {
        name: "Analyse Concurrents",
        description:
          "Analyse les contenus des concurrents pour trouver écarts et opportunités. À utiliser avant de définir le plan éditorial.",
        whenNot: [
          "Concurrents non identifiés : demander les noms, ne pas les deviner",
          "Demande de copie servile : jamais, uniquement analyse structurelle",
        ],
        procedure: [
          "Lister les concurrents fournis ou déjà connus",
          "Pour chacun : thèmes couverts, format des contenus, longueur, ton",
          "Repérer les écarts : questions sans réponse, formats absents, angles non couverts",
          "Proposer 3 angles de contenu couverts par personne",
          "Toujours indiquer les sources (URL) utilisées",
        ],
        rules: [
          "Aucune reproduction de textes d'autrui : analyse seulement",
          "Chaque affirmation sur les concurrents porte l'URL",
          "Ne pas attribuer de volumes de trafic s'ils ne sont pas disponibles",
        ],
        output:
          "Tableau concurrents (thèmes, formats, écarts) + 3 angles proposés + sources",
        example: "Analyse les contenus de mes 3 principaux concurrents",
      },
      "seo-article": {
        name: "Article SEO",
        description:
          "Génère un article SEO structuré avec titres, meta description et optimisation on-page. À utiliser quand le mot-clé est déjà défini.",
        whenNot: [
          "Mot-clé pas encore défini : passer par Recherche Mots-clés",
          "Article exigeant des données propriétaires non disponibles : le signaler",
        ],
        procedure: [
          "Prendre le mot-clé principal et le public visé",
          "Structurer : un seul H1, H2/H3 logiques, réponse à la question dans les 100 premiers mots",
          "Rédiger 800-1500 mots, paragraphes courts, listes si besoin",
          "Ajouter meta title (60 caractères max) et meta description (155 max)",
          "Insérer 2-3 liens internes suggérés et les FAQ",
        ],
        rules: [
          "Un seul H1, meta title ≤ 60 caractères, meta description ≤ 155",
          "Aucun fait ni chiffre inventé : les nombres viennent des sources",
          "Français clair, phrases courtes, pas de jargon métier",
        ],
        output:
          "Article complet avec structure de titres + meta title + meta description + liens internes suggérés",
        example: "Rédige l'article sur « comment choisir des chaises de bureau »",
      },
      "copy-ads": {
        name: "Textes pour Ads",
        description:
          "Crée des textes pour landing pages et ads avec variantes de test A/B. À utiliser pour campagnes et pages de destination.",
        whenNot: [
          "Allégations réglementées (santé, finance) : les déclarations doivent être vérifiées",
          "Texte sans offre claire : d'abord définir ce qu'on vend et à quel prix",
        ],
        procedure: [
          "Demander objectif, offre, public et ton de voix",
          "Rédiger headline 3 variantes (8 mots max), subheadline 3 variantes, CTA 3 variantes",
          "Indiquer quelle variante est pour A, B, C et pourquoi",
          "Ajouter l'argument de preuve sociale uniquement s'il existe une donnée réelle",
          "Terminer par le texte complet de chaque variante assemblée",
        ],
        rules: [
          "Les variantes doivent changer l'angle, pas seulement les synonymes",
          "Aucune promesse intenable (« garanti à 100 % »)",
          "CTA unique et répétable pour chaque variante",
        ],
        output:
          "3 variantes complètes (headline, subheadline, CTA, angle) avec textes assemblés",
        example: "Rédige le texte pour la landing de notre service de nettoyage",
      },
    },
  },
  "social-media": {
    name: "Réseaux Sociaux",
    tagline: "Gérez votre présence sur les réseaux",
    description:
      "Suite social media : calendrier éditorial hebdomadaire, légendes par canal (Instagram, LinkedIn, TikTok, Facebook), recherche de hashtags et tendances, réutilisation d'un contenu sur plusieurs canaux et rapport de performance.",
    category: "Marketing",
    agents: {
      "social-media-agent": "Social Media gère la présence sur les réseaux",
      copywriter: "Copywriter crée légendes et textes",
      "reviews-agent": "Reviews & Reputation gère les avis sociaux",
    },
    integrations: {
      googlesheets: "Sheets pour le calendrier éditorial",
      notion: "Notion pour les brouillons de contenus",
      googledrive: "Drive héberge les assets et les contenus",
      slack: "Slack notifie l'équipe pour l'approbation",
      instagram: "Instagram pour la publication directe",
      facebook: "Facebook pour la publication directe",
      tiktok: "TikTok pour la publication directe",
      figma: "Figma pour les visuels sociaux",
    },
    changelog: [
      {
        version: "1.0.0",
        date: "2026-01-15",
        changes: [
          "Première version : calendrier éditorial, légendes par canal, hashtags, réutilisation de contenus et rapport de performance.",
          "Tant que les canaux ne sont pas connectables, les compétences produisent plans et textes exportables vers Sheets et Notion.",
        ],
      },
    ],
    skills: {
      "editorial-calendar": {
        name: "Calendrier Éditorial",
        description:
          "Planifie le calendrier éditorial hebdomadaire avec thèmes, formats et échéances. À utiliser en début de semaine.",
        whenNot: [
          "Le ton de voix de la marque n'est pas clair : demander avant de planifier",
          "Demande d'un plan annuel : procéder par trimestres, avec priorités",
        ],
        procedure: [
          "Recueillir les objectifs du mois (visibilité, leads, ventes) et les promos en cours",
          "Répartir les posts : 60 % éducation, 30 % preuve sociale, 10 % promotion",
          "Attribuer format et canal à chaque post",
          "Définir une échéance interne de 2 jours pour l'approbation",
          "Exporter le plan vers Sheets avec responsable et statut",
        ],
        rules: [
          "3 posts maximum par semaine et par canal : qualité, pas quantité",
          "Chaque post a un objectif unique et déclaré",
          "Aucune publication sans approbation (statut « en attente »)",
        ],
        output:
          "Tableau du plan hebdomadaire (jour, canal, format, thème, objectif, statut, échéance)",
        example: "Prépare le plan éditorial de cette semaine",
      },
      "caption-generation": {
        name: "Génération Légendes",
        description:
          "Génère des légendes optimisées pour Instagram, LinkedIn, TikTok et Facebook. À utiliser pour écrire le texte d'un post déjà planifié.",
        whenNot: [
          "Contenus exigeant des données non disponibles (chiffres, dates) : les signaler",
          "Demande de modération ou de réponses à des commentaires négatifs : passer à Support",
        ],
        procedure: [
          "Adapter le ton au canal : professionnel pour LinkedIn, informel pour Instagram/TikTok",
          "Première ligne = accroche (125 caractères max, avec emoji si le ton le prévoit)",
          "Développer en 3-6 lignes courtes",
          "Terminer par un seul CTA",
          "Adapter la longueur au canal (TikTok et Instagram courts, LinkedIn plus développé)",
        ],
        rules: [
          "Aucun tag ni hashtag non pertinent : le commentaire n'est pas une liste",
          "Aucune promesse non vérifiable",
          "Ton de la marque, jamais de « mot spam » ni trop formel",
        ],
        output: "Légende pour le canal demandé (accroche, corps, CTA) + longueur suggérée",
        example: "Rédige la légende pour le post LinkedIn d'aujourd'hui",
      },
      "hashtag-research": {
        name: "Recherche Hashtags",
        description:
          "Recherche hashtags et tendances par plateforme avec analyse de l'engagement. À utiliser avant la publication.",
        whenNot: [
          "Hashtags interdits par la plateforme : jamais, même s'ils performent",
          "Aucune donnée de tendance disponible : le signaler, ne pas inventer",
        ],
        procedure: [
          "Séparer les hashtags par rôle : secteur (5-8), locaux (3-5), marque (2-3)",
          "Pour les hashtags locaux, utiliser le nom de la ville ou du quartier",
          "Sélectionner 10-15 hashtags pour Instagram, 3-5 pour TikTok, 2-3 pour LinkedIn",
          "Éliminer les hashtags à tendance négative ou non pertinents",
          "Noter la motivation de chaque groupe",
        ],
        rules: [
          "15 hashtags maximum : au-delà, c'est du spam",
          "Aucun hashtag pouvant être lu comme une offense ou un préjugé",
          "Les hashtags de marque doivent être vérifiés dans la politique de la marque",
        ],
        output: "Liste de hashtags par groupe (secteur, locaux, marque) avec nombre et motivation",
        example: "Quels hashtags utiliser pour notre restaurant à Bologne ?",
      },
      "content-repurposing": {
        name: "Réutilisation Contenus",
        description:
          "Adapte un contenu existant à plusieurs canaux en gardant la cohérence de ton. À utiliser pour maximiser un contenu déjà produit.",
        whenNot: [
          "Contenu original non disponible : le demander, ne pas le recréer de zéro",
          "Contenu à adapter avec données temporelles : toujours mettre à jour les dates",
        ],
        procedure: [
          "Lire le contenu original et extraire les 3 messages clés",
          "Décider l'angle par canal : un message par canal, jamais de copier-coller",
          "Adapter format (vidéo, carrousel, texte) et longueur",
          "Réadapter les hashtags au canal",
          "Livrer 3 versions prêtes pour approbation",
        ],
        rules: [
          "Aucun contenu identique sur deux canaux",
          "Toujours mettre à jour dates, chiffres et références avant réutilisation",
          "Chaque version garde le ton de la marque",
        ],
        output: "3 versions adaptées par canal (format, longueur, texte, hashtags)",
        example: "Prends l'article SEO du mois dernier et tires-en 3 posts",
      },
      "social-performance-report": {
        name: "Rapport Performance",
        description:
          "Génère le rapport de performance des canaux sociaux avec tendances et actions. À utiliser en fin de mois ou de semaine.",
        whenNot: [
          "Canaux non publiés directement : le rapport se base sur des données manuelles",
          "Données non disponibles : ne pas extrapoler de tendance d'un seul post",
        ],
        procedure: [
          "Recueillir les données par canal : portée, engagement, visites, abonnés",
          "Calculer le taux d'engagement = interactions / portée",
          "Comparer avec la période précédente et le benchmark du secteur",
          "Mettre en avant les 2 meilleurs et les 2 pires contenus avec les hypothèses",
          "Proposer 2 actions pour le mois suivant",
        ],
        rules: [
          "Aucune donnée agrégée sans source ni période",
          "Le benchmark du secteur, s'il n'est pas disponible, se déclare « non disponible »",
          "Le rapport ne juge pas les collaborateurs : il regarde les contenus",
        ],
        output:
          "Tableau KPI par canal + comparaison de période + 2 points forts + 2 actions",
        example: "Comment se sont passés les réseaux ce mois-ci ?",
      },
    },
  },
  "inbox-productivity": {
    name: "Inbox & Productivité",
    tagline: "Tri des emails et gestion des tâches",
    description:
      "Système de productivité : tri des emails par priorité, brouillons de réponse, suivi des échéances et engagements, résumé quotidien, comptes rendus de réunion et méthode inbox zéro.",
    category: "Productivité",
    agents: {
      "email-manager": "Email Manager gère inbox et emails",
      "email-agent": "Email Agent trie et répond aux emails",
      "personal-assistant": "Personal Assistant gère la productivité",
      "business-manager": "Business Manager utilise les synthèses de productivité",
    },
    integrations: {
      gmail: "Gmail est la source email principale",
      googlecalendar: "Calendar suit échéances et engagements",
      notion: "Notion héberge notes et tâches",
      microsoftonenote: "OneNote héberge notes et documents",
      microsoftoutlook: "Outlook élargit la couverture email",
      googletasks: "Google Tasks gère les tâches",
      googlekeep: "Google Keep héberge les notes rapides",
    },
    changelog: [
      {
        version: "1.0.0",
        date: "2026-01-15",
        changes: [
          "Première version : tri des emails, brouillon de réponse, échéances, comptes rendus de réunion et méthode inbox zéro.",
          "Gmail, Calendar, Notion et OneNote déjà disponibles ; Outlook, Tasks et Keep bientôt.",
        ],
      },
    ],
    skills: {
      "email-triage": {
        name: "Tri Emails",
        description:
          "Classe les emails par priorité (urgent, important, normal) selon contenu, expéditeur et échéances. À utiliser en début de journée.",
        whenNot: [
          "Boîtes d'autres utilisateurs : jamais, uniquement la boîte autorisée",
          "Emails d'adresses inconnues avec demandes de paiement : toujours vérifier",
        ],
        procedure: [
          "Lire les emails non lus des 3 derniers jours",
          "Classer : urgent (sous 24h ou blocage opérationnel), important (sous la semaine), normal (informatifs)",
          "Signaler les emails contenant des demandes de paiement ou des données sensibles",
          "Proposer étiquettes/dossiers pour chaque groupe",
          "Renvoyer un résumé : 3 emails à traiter aujourd'hui",
        ],
        rules: [
          "La priorité est déclarée avec le motif, ce n'est pas un fait absolu",
          "Aucun email archivé ni supprimé : proposition seulement",
          "Les demandes de paiement se signalent toujours séparément",
        ],
        output:
          "Trois groupes (urgent/important/normal) avec les 3 emails « à traiter aujourd'hui » et les demandes de paiement",
        example: "Fais-moi le tri des emails non lus",
      },
      "email-draft": {
        name: "Brouillon Réponse",
        description:
          "Génère le brouillon de réponse email selon le contexte et les préférences de l'expéditeur. À utiliser sur les demandes qui exigent une réponse.",
        whenNot: [
          "Email exigeant un engagement financier ou juridique : brouillon seulement, avec approbation",
          "Contenu exigeant des données non disponibles : signaler le manque",
        ],
        procedure: [
          "Lire l'email original et l'historique du fil",
          "Repérer les questions à traiter et les infos manquantes",
          "Rédiger le brouillon : objet, ouverture, réponses numérotées, clôture",
          "Ton cohérent avec les échanges précédents du client",
          "L'ENVOI est une action qui exige une approbation explicite",
        ],
        rules: [
          "L'envoi exige toujours une approbation : cette compétence prépare seulement",
          "150 mots maximum, un sujet par email",
          "Aucune promesse de délai ou de prix non confirmée",
        ],
        output: "Brouillon (objet, corps) + liste des infos manquantes + état d'envoi (à approuver)",
        example: "Réponds à l'email d'hier qui nous demandait les délais de livraison",
      },
      "deadline-tracking": {
        name: "Suivi Échéances",
        description:
          "Suit échéances et engagements avec notifications prioritaires. À utiliser pour ne pas perdre les engagements pris dans les emails.",
        whenNot: [
          "Échéances formelles d'entreprise (contrats, fiscales) : suivies par Devis & Finance",
          "Engagements déjà échus à signaler en bloc : les lister d'abord par date",
        ],
        procedure: [
          "Extraire des emails les engagements avec date",
          "Attribuer la priorité selon impact et échéance",
          "Créer une tâche pour chaque engagement avec date et responsable",
          "Signaler aujourd'hui les engagements qui expirent sous 3 jours",
          "Mettre à jour le statut des tâches déjà en cours",
        ],
        rules: [
          "Chaque échéance a une date et un responsable : sans responsable, pas de suivi",
          "Aucune échéance inventée : uniquement celle déclarée ou déductible",
          "Utiliser le fuseau horaire de l'utilisateur pour les échéances",
        ],
        output:
          "Liste des engagements (quoi, date, responsable, priorité) + focus des 3 prochains jours",
        example: "Quelles échéances ai-je dans les 3 prochains jours ?",
      },
      "meeting-notes": {
        name: "Comptes Rendus",
        description:
          "Génère les comptes rendus de réunion avec actions et responsables. À utiliser après chaque réunion avec notes ou transcription.",
        whenNot: [
          "Réunions confidentielles sans autorisation de partager le compte rendu : demander",
          "Réunions sans contenu à écrire : mieux vaut aucun compte rendu",
        ],
        procedure: [
          "Recueillir les notes ou la transcription",
          "Séparer : décisions, actions, points ouverts",
          "Attribuer à chaque action un responsable et une date",
          "Résumer en une page maximum : pas de compte rendu-fleuve",
          "Exporter le compte rendu dans le document de l'entreprise",
        ],
        rules: [
          "Chaque action a responsable et date : si absents, signaler comme « à attribuer »",
          "Résumer fidèlement : aucune interprétation des décisions",
          "Données personnelles des participants : nom et rôle seulement",
        ],
        output:
          "Compte rendu : décisions, actions (quoi, qui, pour quand), points ouverts",
        example: "Fais le compte rendu de la réunion de ce matin",
      },
    },
  },
  "reports-bi": {
    name: "Rapports & Décisions",
    tagline: "Analyse de données et décisions stratégiques",
    description:
      "Business intelligence : rapports KPI hebdomadaires et mensuels, comparaison période sur période, détection d'anomalies, priorités stratégiques et synthèse pour le dirigeant en langage simple.",
    category: "Analytique",
    agents: {
      "business-manager": "Business Manager analyse données et décisions",
      "analytics-agent": "Analytics Agent génère des rapports détaillés",
      "finance-manager": "Finance Manager utilise les données financières",
      "shopify-agent": "Shopify Agent fournit les données e-commerce",
    },
    integrations: {
      googlesheets: "Sheets est la source de données principale",
      microsoftexcel: "Excel pour les analyses avancées",
      airtable: "Airtable pour la base business",
      hubspot: "HubSpot pour les données CRM",
      microsoftpowerpoint: "PowerPoint pour le rapport au management",
      googleanalytics: "Analytics pour les métriques web",
      googleads: "Google Ads pour les métriques marketing",
    },
    changelog: [
      {
        version: "1.0.0",
        date: "2026-01-15",
        changes: [
          "Première version : rapport KPI, comparaison de périodes, anomalies, priorités stratégiques et synthèse executive.",
          "Sheets, Excel, Airtable, HubSpot et PowerPoint déjà disponibles ; Analytics et Ads bientôt.",
        ],
      },
    ],
    skills: {
      "kpi-report": {
        name: "Rapport KPI",
        description:
          "Génère le rapport des KPI hebdomadaires ou mensuels avec métriques clés et tendances. À utiliser pour le rythme hebdomadaire ou mensuel.",
        whenNot: [
          "KPI non définis par le dirigeant : proposer un set standard et demander confirmation",
          "Données d'un seul jour présentées comme tendance : ce n'est pas une tendance",
        ],
        procedure: [
          "Confirmer la période et la liste des KPI avec le dirigeant (ou utiliser le défaut : chiffre d'affaires, commandes, coût, marge)",
          "Lire les données depuis les sources connectées",
          "Calculer chaque KPI sur la période et la variation sur la précédente",
          "Signaler les KPI hors cible",
          "Terminer par 3 actions, pas par la répétition des chiffres",
        ],
        rules: [
          "Toujours citer source et période de chaque chiffre",
          "Aucun KPI calculé sur données incomplètes sans avertissement",
          "Le rapport ne cherche pas les causes : il constate et propose",
        ],
        output:
          "Tableau KPI (valeur, variation, état) + 3 hors cible + 3 actions + sources",
        example: "Fais-moi le rapport KPI de cette semaine",
      },
      "period-comparison": {
        name: "Comparaison Périodes",
        description:
          "Compare les données d'une période avec la précédente en analysant variations et anomalies. À utiliser pour comprendre ce qui a changé.",
        whenNot: [
          "Périodes de durées différentes : normaliser par jour avant de comparer",
          "Données avec moins de 2 périodes : la comparaison n'a pas de sens",
        ],
        procedure: [
          "Définir les deux périodes, même longueur",
          "Comparer les métriques et calculer la variation absolue et en pourcentage",
          "Signaler les anomalies : variations au-delà du seuil typique de la donnée",
          "Pour chaque anomalie, lister 3 hypothèses vérifiables (pas une explication)",
          "Indiquer quelles données il faudrait pour confirmer",
        ],
        rules: [
          "Plus de chiffre d'affaires ne veut jamais dire succès : regarder la marge avec le chiffre",
          "Les anomalies se signalent, ne s'expliquent pas avec certitude",
          "Chaque variation s'accompagne de la variation en valeur absolue",
        ],
        output:
          "Tableau de comparaison (période A, période B, écart, écart %) + anomalies + hypothèses vérifiables",
        example: "Compare ce trimestre avec le précédent",
      },
      "anomaly-detection": {
        name: "Détection Anomalies",
        description:
          "Détecte les anomalies dans les données et propose les vérifications. À utiliser quand un chiffre s'écarte de la norme.",
        whenNot: [
          "Anomalies sans explication : ne pas les traiter comme certaines",
          "Données saisonnières (fêtes, soldes) : comparer avec la même période de l'année précédente",
        ],
        procedure: [
          "Calculer moyenne et écart-type de la dernière période",
          "Signaler les valeurs au-delà de 2 écarts-types de la moyenne",
          "Comparer avec la même période de l'année précédente pour exclure la saisonnalité",
          "Classifier : anomalie système, événement isolé, erreur de donnée",
          "Proposer la vérification concrète pour chacune",
        ],
        rules: [
          "Chaque anomalie porte la vérification qui la confirmerait",
          "Aucune alerte sans la valeur de comparaison",
          "Erreur de donnée possible : toujours contrôler la source",
        ],
        output:
          "Liste des anomalies (métrique, valeur, moyenne, écart, classification, vérification proposée)",
        example: "Février s'est effondré, que s'est-il passé ?",
      },
      "strategic-priorities": {
        name: "Priorités Stratégiques",
        description:
          "Transforme les données en priorités stratégiques avec impact et coût estimés. À utiliser pour décider où investir le temps.",
        whenNot: [
          "Priorités exigeant des investissements financiers : il faut les données de trésorerie",
          "Décisions déjà prises : cette compétence aide à choisir, pas à ratifier",
        ],
        procedure: [
          "Lister les candidats (actions, projets, canaux) issus des données",
          "Évaluer pour chaque candidat : impact attendu, effort, coût, délai de retour",
          "Trier par rapport impact/effort",
          "Proposer 3 priorités maximum avec une ligne de vérification pour chacune",
          "Indiquer quoi NE PAS faire pour libérer du temps",
        ],
        rules: [
          "3 priorités maximum : une longue liste n'est pas une priorité",
          "L'impact se déclare comme estimation avec le raisonnement",
          "Aucune recommandation basée sur une seule donnée",
        ],
        output:
          "Tableau des candidats (impact, effort, coût, retour) + 3 priorités + quoi non",
        example: "Par quoi commençons-nous le prochain trimestre ?",
      },
      "executive-summary": {
        name: "Synthèse Executive",
        description:
          "Résume les données pour le dirigeant en langage simple, sans jargon. À utiliser pour le briefing hebdomadaire.",
        whenNot: [
          "Données non consolidées : signaler que la synthèse est provisoire",
          "Demande d'un document formel : il faut Documentation, pas une synthèse",
        ],
        procedure: [
          "Prendre les 5 données les plus pertinentes de la période",
          "Les traduire en langage business : que s'est-il passé, qu'est-ce que cela signifie",
          "Séparer : bon, à surveiller, à résoudre",
          "Terminer par 3 décisions demandées au dirigeant",
          "Tenir en 200 mots maximum",
        ],
        rules: [
          "Aucun jargon technique ni formule de BI non expliquée",
          "Chaque chiffre doit tenir dans une phrase",
          "La synthèse ne cache pas les données négatives",
        ],
        output:
          "Briefing (bon / à surveiller / à résoudre) + 3 décisions demandées",
        example: "Rédige le briefing pour le dirigeant de cette semaine",
      },
    },
  },
  "hr-recruiting": {
    name: "RH & Recrutement",
    tagline: "Gérez candidatures et recrutement",
    description:
      "Suite RH : tri des CV selon la fiche de poste, matching des compétences, questions de pré-qualification, retour structuré aux candidats, planification des entretiens et fiche candidat.",
    category: "Ressources humaines",
    agents: {
      "hr-recruiter": "HR & Recruiter gère la sélection du personnel",
      "calendar-booking": "Calendar Booking planifie les entretiens",
      "email-manager": "Email Manager communique avec les candidats",
    },
    integrations: {
      gmail: "Gmail communique avec les candidats",
      googlecalendar: "Calendar planifie les entretiens",
      googledrive: "Drive héberge les CV et les documents",
      microsoftword: "Word génère les documents RH",
      airtable: "Airtable suit les candidats",
      notion: "Notion héberge les notes d'entretiens",
      googlemeet: "Google Meet pour les entretiens vidéo",
      microsoftoutlook: "Outlook élargit la couverture du calendrier",
    },
    changelog: [
      {
        version: "1.0.0",
        date: "2026-01-15",
        changes: [
          "Première version : tri des CV, matching candidats, questions d'entretien, retours et planification d'entretiens.",
          "Aucun score n'utilise de données personnelles protégées : nous n'évaluons que compétences et expériences documentées.",
        ],
      },
    ],
    skills: {
      "cv-screening": {
        name: "Tri CV",
        description:
          "Compare les CV avec la fiche de poste et génère le matching des compétences. À utiliser sur les nouvelles candidatures.",
        whenNot: [
          "Candidatures pour des rôles soumis à des critères de diversité : les critères restent ceux de l'entreprise",
          "CV illisibles ou en format non pris en charge : demander une version alternative",
        ],
        procedure: [
          "Extraire de la fiche de poste les exigences obligatoires et souhaitées",
          "Extraire du CV : expérience, rôles, secteur, résultats, langues",
          "Comparer par exigence : satisfaite, partielle, absente",
          "Calculer la couverture des exigences et produire l'avis motivé",
          "Lister les points à vérifier en entretien",
        ],
        rules: [
          "Aucun jugement basé sur des données personnelles (âge, genre, nationalité, photo)",
          "N'évaluer que compétences et expériences documentées",
          "Le score est une aide à la décision humaine, jamais une décision",
        ],
        output:
          "Tableau des exigences (obligatoire/souhaitée, résultat, preuve du CV) + couverture % + points à vérifier",
        example: "Évalue les CV reçus pour l'annonce de vendeur",
      },
      "candidate-matching": {
        name: "Matching Candidats",
        description:
          "Compare les compétences du candidat avec les exigences du poste et génère un classement. À utiliser après le tri de plusieurs candidatures.",
        whenNot: [
          "Une seule candidature : le matching ne sert pas, utiliser Tri CV",
          "Classement à utiliser comme résultat définitif : la décision reste humaine",
        ],
        procedure: [
          "Recueillir les fiches des candidats déjà filtrées",
          "Comparer chaque candidat sur les exigences obligatoires, par ordre de poids",
          "Attribuer un score 0-100 et la motivation en 2 lignes",
          "Trier par score et signaler les candidats « en discussion »",
          "Mettre à jour le suivi des candidats",
        ],
        rules: [
          "Aucune donnée personnelle dans le score",
          "La motivation par candidat doit être spécifique, pas générique",
          "Première évaluation, pas résultat : la sélection se fait par une personne",
        ],
        output:
          "Classement (candidat, score, exigences couvertes, motivation) + note « à évaluer avec RH »",
        example: "Classe les 6 candidats pour le poste de vendeur",
      },
      "interview-questions": {
        name: "Questions Entretien",
        description:
          "Génère les questions de pré-qualification selon le poste et le niveau d'expérience. À utiliser avant l'entretien.",
        whenNot: [
          "Poste non défini : demander fiche de poste et niveau",
          "Questions exigeant des données personnelles protégées : exclues",
        ],
        procedure: [
          "Prendre la fiche de poste et le niveau du poste",
          "Générer 6-8 questions : 3 comportementales, 3 techniques, 1-2 de vérification",
          "Pour chaque question, indiquer ce qu'on veut observer",
          "Ajouter 2-3 questions finales pour le candidat",
          "Éviter toute question sur âge, état civil, santé, religion, orientation",
        ],
        rules: [
          "Zéro question discriminante : compétences et expériences seulement",
          "Les questions comportementales commencent par « Raconte-moi une fois où... »",
          "10 questions maximum : un long entretien n'est pas un entretien",
        ],
        output:
          "Liste de questions par type avec l'objectif observé + questions finales",
        example: "Prépare les questions pour l'entretien du commercial",
      },
      "candidate-feedback": {
        name: "Retours Candidats",
        description:
          "Génère le retour structuré pour les candidats après l'entretien. À utiliser pour communiquer résultat et retour.",
        whenNot: [
          "Retour annonçant une décision pas encore prise en interne : attendre le résultat",
          "Retour exigeant de discuter la rémunération : uniquement si autorisé",
        ],
        procedure: [
          "Confirmer le résultat du processus avec qui a décidé",
          "Préparer le retour : résultat, motifs, 2 points forts, 1 axe de progrès",
          "Ton : respect et spécificité, jamais générique",
          "L'envoi au candidat exige une approbation",
          "Enregistrer le résultat sur la fiche candidat",
        ],
        rules: [
          "Envoi d'email = action qui exige une approbation",
          "Aucun retour discriminant ni référence à des données personnelles",
          "Un candidat a droit à un retour utile : pas à un « pas le profil »",
        ],
        output:
          "Brouillon de retour (résultat, 2 points forts, 1 axe de progrès) + état d'envoi (à approuver)",
        example: "Rédige le retour à la candidate pour le poste de comptable",
      },
      "interview-planning": {
        name: "Planification Entretiens",
        description:
          "Planifie les entretiens (qui interviewe, quand, avec quelles questions) et prépare la fiche candidat. À utiliser pour organiser les journées d'entretiens.",
        whenNot: [
          "Entretiens au-delà des disponibilités des participants : proposer des alternatives",
          "Impliquer le candidat uniquement après confirmation interne",
        ],
        procedure: [
          "Recueillir les disponibilités de l'intervieweur, du candidat et du panel",
          "Proposer 2-3 créneaux, avec durée et participants",
          "Attribuer à chaque intervieweur un focus différent, sans chevauchements",
          "Créer l'événement uniquement après la confirmation du candidat",
          "Préparer la fiche candidat avec CV, exigences et questions attribuées",
        ],
        rules: [
          "Le fuseau horaire et la durée se précisent toujours dans la proposition",
          "Aucun calendrier personnel des participants au-delà de l'agenda partagé",
          "La fiche candidat contient uniquement des données de sélection, pas de notes privées",
        ],
        output:
          "Plan d'entretiens (créneaux, participants, focus, durée) + fiche candidat prête pour chaque entretien",
        example: "Organise les entretiens de mardi pour les 3 candidats finalistes",
      },
    },
  },
  "documents-office": {
    name: "Documents & Bureau",
    tagline: "Gérez documents et bureau",
    description:
      "Suite documentaire : lecture et résumé de PDF, extraction de données structurées, comparaison entre versions de contrat, création et modification de documents Word, Excel et PowerPoint, réponses aux questions sur le contenu du document.",
    category: "Productivité",
    agents: {
      "document-agent": "Document Agent gère les documents",
      "quote-agent": "Quotes & Estimates génère les documents formels",
      "business-manager": "Business Manager analyse les documents",
      "support-agent": "Support Agent répond aux questions des clients",
    },
    integrations: {
      microsoftword: "Word pour la création des documents",
      microsoftexcel: "Excel pour l'analyse des données",
      microsoftpowerpoint: "PowerPoint pour les présentations",
      googledrive: "Drive héberge les documents",
      microsoftonenote: "OneNote héberge les notes",
      microsoftonedrive: "OneDrive synchronise les documents",
      microsoftsharepoint: "SharePoint pour les documents enterprise",
      dropbox: "Dropbox pour le stockage des documents",
      googledocs: "Docs pour la collaboration sur les documents",
    },
    changelog: [
      {
        version: "1.0.0",
        date: "2026-01-15",
        changes: [
          "Première version : résumé PDF, extraction de données, Q&R avec citations, création de documents et comparaison de versions.",
          "Word, Excel, PowerPoint, Drive et OneNote déjà disponibles ; OneDrive, SharePoint, Dropbox et Docs bientôt.",
        ],
      },
    ],
    skills: {
      "pdf-summary": {
        name: "Résumé PDF",
        description:
          "Lit et résume un document PDF en extrayant les points clés. À utiliser sur contrats, factures, manuels et longs rapports.",
        whenNot: [
          "PDF scanné comme image sans OCR : signaler la limite",
          "Document avec données personnelles de tiers : vérifier la base juridique avant d'en partager le contenu",
        ],
        procedure: [
          "Lire le document en entier avant de résumer",
          "Extraire : objet, parties, dates, montants, obligations, échéances",
          "Résumer en 3 blocs : en synthèse, points clés, à vérifier",
          "Terminer par les questions auxquelles le document ne répond pas",
          "Si les pages sont nombreuses, citer les références de page",
        ],
        rules: [
          "250 mots maximum : si besoin de plus, c'est un résumé par blocs",
          "Citer la page quand le document dépasse 5 pages",
          "Aucune donnée inventée : si absente du document, écrire « non présent »",
        ],
        output:
          "Résumé : en synthèse (3 lignes) + points clés avec références + questions ouvertes",
        example: "Résume ce contrat de fourniture en pièce jointe",
      },
      "data-extraction": {
        name: "Extraction Données",
        description:
          "Extrait des données structurées des documents (tableaux, dates, montants). À utiliser pour alimenter tableurs ou rapports.",
        whenNot: [
          "Tableaux à plusieurs interprétations possibles : signaler l'ambiguïté",
          "Extraction de données personnelles non nécessaires : uniquement les champs nécessaires",
        ],
        procedure: [
          "Repérer la structure du document (tableaux, listes, sections)",
          "Définir les champs à extraire avant de commencer",
          "Extraire ligne par ligne, sans interpréter",
          "Signaler les valeurs illisibles comme « à vérifier », pas comme estimations",
          "Exporter en format tabulaire prêt pour Excel/Sheets",
        ],
        rules: [
          "Aucune interprétation : on extrait, on ne déduit pas",
          "Les valeurs illisibles se marquent, ne s'inventent pas",
          "Dates en format ISO (YYYY-MM-DD) pour éviter toute ambiguïté",
        ],
        output:
          "Tableau extrait (champs en colonne) + nombre de lignes + liste des valeurs à vérifier",
        example: "Extrais le tableau des dépenses du PDF de la note de frais",
      },
      "document-qa": {
        name: "Q&R Documents",
        description:
          "Répond aux questions sur le contenu des documents avec citations. À utiliser quand l'utilisateur demande des infos sur un document chargé.",
        whenNot: [
          "Question que le document ne couvre pas : le dire, ne pas étendre le document",
          "Demande d'interprétation juridique : rapporter le texte, l'interprétation reste à un professionnel",
        ],
        procedure: [
          "Chercher dans le document le passage pertinent",
          "Répondre en 2-4 lignes, avec la citation du texte",
          "Indiquer page ou section",
          "S'il y a plusieurs réponses plausibles, les présenter toutes les deux",
          "Si la réponse n'y est pas, proposer où chercher",
        ],
        rules: [
          "Chaque réponse porte la citation du document",
          "Aucune inférence non soutenue par le texte",
          "Ton : direct, avec la source juste sous la réponse",
        ],
        output: "Réponse courte + citation (entre parenthèses) + référence de page",
        example: "Le contrat contient-il une clause de pénalité pour retard ?",
      },
      "document-creation": {
        name: "Création Documents",
        description:
          "Crée et modifie des documents Word, Excel et PowerPoint. À utiliser quand il faut un document nouveau ou mettre à jour un existant.",
        whenNot: [
          "Document à utiliser comme source faisant foi (contrats, bilans) : révision humaine obligatoire",
          "Partage du document avec le client : action qui exige une approbation",
        ],
        procedure: [
          "Demander ou utiliser le modèle existant de l'entreprise",
          "Remplir les champs avec les données vérifiées",
          "Pour Excel : un tableau, en-têtes figées, formules si besoin",
          "Pour PowerPoint : 1 message max par slide, titres comme affirmations",
          "Générer le fichier et renvoyer le nom de fichier",
        ],
        rules: [
          "Ne pas créer de documents qui imitent l'aspect de tiers",
          "Pour Excel : aucune donnée en dur dans les formules",
          "Documents avec données personnelles : vérifier le consentement",
        ],
        output:
          "Fichier généré (nom, format) + liste des champs remplis + éventuelles révisions demandées",
        example: "Crée le rapport en Word avec les données de cette semaine",
      },
      "version-comparison": {
        name: "Comparaison Versions",
        description:
          "Compare deux versions d'un document et liste les différences. À utiliser sur révisions de contrat ou brouillons.",
        whenNot: [
          "Documents en formats non comparables (PDF scanné) : signaler la limite",
          "Versions non datées : demander laquelle est la plus récente",
        ],
        procedure: [
          "Comparer les deux documents section par section",
          "Classer chaque différence : ajout, suppression, modification",
          "Pour chaque modification, évaluer l'impact (substantiel ou formel)",
          "Signaler les modifications qui exigent attention (montants, dates, obligations)",
          "Ne pas donner d'avis juridiques : rapporter les différences",
        ],
        rules: [
          "Aucun avis juridique sur les modifications : constat seulement",
          "Les modifications de montants et d'échéances se mettent toujours en avant",
          "Trier par impact décroissant",
        ],
        output:
          "Liste des différences (section, type, impact, texte avant/après) + synthèse des modifications substantielles",
        example: "Compare la v2 du contrat avec la v1",
      },
    },
  },
  "research-competitor": {
    name: "Recherche Concurrents",
    tagline: "Analysez marché et concurrents",
    description:
      "Outils de market research : étude de marché avec sources vérifiables, comparaison de prix et d'avis, fiche concurrent complète et synthèse avec citations et niveau de confiance.",
    category: "Recherche",
    agents: {
      "research-agent": "Research Agent analyse marché et concurrents",
      "seo-agent": "SEO Content utilise les données des concurrents",
      "business-manager": "Business Manager utilise les analyses",
      "social-media-agent": "Social Media surveille les concurrents",
    },
    integrations: {
      notion: "Notion héberge les recherches",
      googlesheets: "Sheets pour les données des concurrents",
      microsoftpowerpoint: "PowerPoint pour les présentations",
      googledrive: "Drive héberge les documents de recherche",
    },
    changelog: [
      {
        version: "1.0.0",
        date: "2026-01-15",
        changes: [
          "Première version : étude de marché, comparaison de prix, fiche concurrent et synthèse avec niveau de confiance.",
          "Chaque donnée porte la source : si la recherche ne trouve pas une valeur, la compétence le déclare au lieu de l'estimer.",
        ],
      },
    ],
    skills: {
      "market-research": {
        name: "Étude Marché",
        description:
          "Étudie le marché de référence avec sources vérifiables et analyse des tendances. À utiliser au début d'une analyse.",
        whenNot: [
          "Données de marché non vérifiables : on déclare la limite, on n'estime pas",
          "Demande de prévisions à long terme : uniquement tendances documentées",
        ],
        procedure: [
          "Définir le marché : secteur, zone géographique, segment clients",
          "Recueillir des données de sources publiques et vérifiables",
          "Séparer les données vérifiées des opinions",
          "Identifier les tendances avec la source qui les soutient",
          "Chaque donnée porte la source (URL ou nom de document) et la date",
        ],
        rules: [
          "Aucune donnée de marché sans source citée",
          "Les estimations de tiers sont des estimations : les attribuer",
          "Aucune donnée inventée quand la recherche échoue : le dire",
        ],
        output:
          "Synthèse de marché + tendances (avec source et date) + données vérifiées vs estimations",
        example: "Combien croît le secteur des chaises de bureau en Italie ?",
      },
      "price-comparison": {
        name: "Comparaison Prix",
        description:
          "Compare les prix des concurrents avec notre offre. À utiliser pour décider du positionnement.",
        whenNot: [
          "Prix non publiés : on déclare « non publié », on n'estime pas",
          "Produits non comparables : aligner d'abord les spécifications",
        ],
        procedure: [
          "Aligner les spécifications : modèles, dimensions, matériaux, services inclus",
          "Recueillir les prix publiés, avec la date",
          "Comparer à spécifications égales",
          "Calculer le positionnement par rapport au marché",
          "Signaler où notre offre est plus chère et où elle est plus avantageuse",
        ],
        rules: [
          "Ne comparer que des produits équivalents : specs différentes = comparaison inutile",
          "Chaque prix avec la source et la date",
          "Aucune donnée de prix non publiée",
        ],
        output:
          "Tableau des prix (concurrent, spécifications, prix, source, date) + positionnement",
        example: "Comparons les prix de nos concurrents directs",
      },
      "competitor-profile": {
        name: "Fiche Concurrent",
        description:
          "Génère la fiche concurrent complète avec prix, avis et positionnement. À utiliser pour les analyses périodiques.",
        whenNot: [
          "Concurrent sans activité vérifiable : le déclarer, ne pas inventer",
          "Fiche utilisée pour des décisions de prix : il faut une décision humaine",
        ],
        procedure: [
          "Recueillir les infos publiques sur le concurrent",
          "Organiser : positionnement, offre, prix, canaux, avis",
          "Calculer le sentiment des avis (positifs/négatifs) si disponibles",
          "Indiquer les forces et faiblesses observables",
          "Terminer par 3 pistes de différenciation pour nous",
        ],
        rules: [
          "Données publiques seulement : rien de non public",
          "Chaque affirmation porte la source",
          "Aucun jugement moral sur l'entreprise concurrente",
        ],
        output:
          "Fiche concurrent (positionnement, offre, prix, avis, forces/faiblesses) + 3 pistes de différenciation",
        example: "Fais-moi la fiche concurrent de Bianchi Srl",
      },
      "insight-synthesis": {
        name: "Synthèse avec Citations",
        description:
          "Synthétise les recherches en un document avec citations et niveau de confiance. À utiliser pour clore une analyse.",
        whenNot: [
          "Sources insuffisantes : la synthèse déclare le niveau de confiance bas",
          "Document à partager en externe : action qui exige une approbation",
        ],
        procedure: [
          "Recueillir les résultats des recherches précédentes",
          "Séparer : confirmé (plusieurs sources), probable (une source forte), à vérifier",
          "Attribuer un niveau de confiance : haut, moyen, bas",
          "Citer chaque affirmation avec la source entre parenthèses",
          "Lister les vérifications encore à faire",
        ],
        rules: [
          "Chaque affirmation avec sa source ; aucune synthèse sans citations",
          "Le niveau de confiance est obligatoire",
          "Les infos non vérifiées restent marquées comme telles",
        ],
        output:
          "Document de synthèse : confirmé / probable / à vérifier + sources + niveau de confiance",
        example: "Clôturons l'étude de marché avec une synthèse citée",
      },
    },
  },
  "projects-tasks": {
    name: "Projets & Tâches",
    tagline: "Gérez projets et tâches",
    description:
      "Gestion de projet : transformer les demandes en tâches, mettre à jour les boards, rapport d'avancement, standup automatique et rappels d'échéances.",
    category: "Productivité",
    agents: {
      "personal-assistant": "Personal Assistant gère tâches et projets",
      "business-manager": "Business Manager suit l'avancement des projets",
      "email-manager": "Email Manager communique tâches et échéances",
    },
    integrations: {
      trello: "Trello pour la gestion de projet",
      asana: "Asana pour la gestion des tâches",
      clickup: "ClickUp pour la gestion des projets",
      notion: "Notion pour tâches et documents",
      slack: "Slack pour les notifications à l'équipe",
      github: "GitHub pour les équipes techniques",
      jira: "Jira pour les projets enterprise",
      microsoftteams: "Teams pour la collaboration",
    },
    changelog: [
      {
        version: "1.0.0",
        date: "2026-01-15",
        changes: [
          "Première version : demande qui devient tâche, mise à jour du board, rapport d'avancement, standup et rappels.",
          "Trello, Asana, ClickUp, Notion, Slack et GitHub déjà disponibles ; Jira et Teams bientôt.",
        ],
      },
    ],
    skills: {
      "request-to-task": {
        name: "Demande en Tâche",
        description:
          "Transforme une demande orale en tâches structurées avec priorité et échéance. À utiliser sur les demandes à répartir.",
        whenNot: [
          "Demande qui n'est pas une tâche (info, question) : ne pas créer de tâche",
          "Projet sans objectif défini : d'abord clarifier l'objectif",
        ],
        procedure: [
          "Demander l'objectif de la demande en une phrase",
          "Découper en 3-7 tâches avec un résultat vérifiable chacune",
          "Attribuer priorité (P1/P2/P3) et estimation en heures",
          "Définir l'échéance ou la demander",
          "Créer les tâches sur le board et renvoyer la liste",
        ],
        rules: [
          "Une tâche = un résultat vérifiable, pas une série d'actions",
          "Chaque tâche a priorité et échéance, sinon c'est un souhait",
          "Aucune tâche sans responsable : demander qui s'en occupe",
        ],
        output:
          "Liste des tâches (titre, résultat, priorité, estimation, échéance, responsable) + confirmation de création",
        example: "Le client veut le nouveau catalogue pour fin du mois : quelles tâches créer ?",
      },
      "board-update": {
        name: "Mise à Jour Board",
        description:
          "Met à jour le board projet (Trello, Asana, ClickUp) avec l'état des tâches. À utiliser en fin de journée.",
        whenNot: [
          "État non confirmé par l'équipe : ne pas déplacer les tâches par déduction",
          "Board non connecté : produire la liste des modifications à appliquer",
        ],
        procedure: [
          "Lire le board et comparer avec les engagements connus",
          "Ne déplacer que les tâches à l'état confirmé",
          "Ajouter les commentaires d'état aux tâches en cours",
          "Ne pas clore les tâches : à qui les a réalisées",
          "Renvoyer la liste des modifications appliquées",
        ],
        rules: [
          "Aucune tâche déplacée en « fait » sans confirmation",
          "Les priorités existantes ne se changent pas sans motif déclaré",
          "Chaque modification est réversible : aucune suppression",
        ],
        output: "Liste des modifications appliquées + tâches laissées inchangées par doute",
        example: "Mets à jour le board avec l'état d'aujourd'hui",
      },
      "progress-report": {
        name: "Rapport Avancement",
        description:
          "Génère le rapport d'avancement du projet avec blocages et prochaines étapes. À utiliser pour le client ou la direction.",
        whenNot: [
          "Projet sans tâches suivies : le rapport serait inventé",
          "Rapport pour usage interne et externe ensemble : demander lequel",
        ],
        procedure: [
          "Recueillir les tâches par état : terminées, en cours, à démarrer",
          "Calculer l'avancement en pourcentage sur les tâches terminées",
          "Lister les blocages avec la cause et qui doit débloquer",
          "Définir les 3 prochaines étapes avec responsable et date",
          "Signaler les écarts par rapport au planning",
        ],
        rules: [
          "L'avancement se calcule sur les tâches, pas sur les estimations d'effort",
          "Aucun blocage sans responsable attribué",
          "Si une date projet glisse, le déclarer : jamais « dans les temps » si faux",
        ],
        output:
          "Rapport : avancement % + terminées/en cours/à démarrer + blocages (cause, responsable) + 3 prochaines étapes",
        example: "Où en sommes-nous avec le projet catalogue ?",
      },
      "auto-standup": {
        name: "Standup Automatique",
        description:
          "Génère le résumé quotidien de standup depuis les tâches de l'équipe. À utiliser le matin ou sur demande.",
        whenNot: [
          "Équipe sans tâches suivies : le standup n'est pas reconstructible",
          "Standup avec données personnelles : rien de privé des membres de l'équipe",
        ],
        procedure: [
          "Recueillir pour chaque membre : tâches en cours, terminées hier, blocages",
          "Regrouper en trois colonnes : hier, aujourd'hui, blocages",
          "Signaler les membres sans mises à jour",
          "Terminer par les décisions nécessaires aujourd'hui",
          "15 lignes maximum : un standup n'est pas un rapport",
        ],
        rules: [
          "Aucune évaluation des personnes : faits sur les tâches seulement",
          "Rien de privé des membres de l'équipe",
          "Qui n'a pas mis à jour se signale, ne se déduit pas",
        ],
        output: "Standup : hier / aujourd'hui / blocages (par tâche, pas par personne) + décisions demandées",
        example: "Prépare le standup d'aujourd'hui",
      },
      "deadline-reminder": {
        name: "Rappel Échéances",
        description:
          "Rappelle les échéances proches avec la marge nécessaire pour agir. À utiliser de façon programmée ou quotidienne.",
        whenNot: [
          "Rappel déjà envoyé aujourd'hui pour la même échéance : ne pas dupliquer",
          "Échéances formelles d'entreprise : suivies par Devis & Finance",
        ],
        procedure: [
          "Lister les échéances sous 3 jours",
          "Pour chacune, indiquer la marge restante et si déjà en retard",
          "Signaler celles en retard avec la nouvelle date proposée",
          "Envoyer un rappel synthétique (5 lignes max)",
          "Proposer la mise à jour des dates si la marge est irrécupérable",
        ],
        rules: [
          "Un rappel par échéance et par jour",
          "Les échéances en retard se disent ouvertement : pas d'alarmes implicites",
          "Aucun envoi automatique à des tiers : uniquement au responsable interne",
        ],
        output:
          "Rappel envoyé avec liste des échéances (échéance, marge, état) + proposition pour les dates dépassées",
        example: "Qu'est-ce qui expire dans les 3 prochains jours ?",
      },
    },
  },
};
