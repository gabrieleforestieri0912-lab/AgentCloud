/**
 * Testi del pannello dell'app dentro l'amministratore Shopify (`/shopify`).
 *
 * Modulo a parte da `dictionaries.ts` come `appClients.ts` e
 * `featureDetails.ts`: è contenuto di una sola pagina, servito da un server
 * component e passato al client come props (così nel bundle JS non finisce
 * nessun testo e i cinque locale non si duplicano).
 */

import type { Locale } from "./constants";

export type ShopifyAppContent = {
  metaTitle: string;
  metaDescription: string;
  badge: string;
  title: string;
  subtitle: string;
  checking: string;
  verifiedTitle: string;
  verifiedText: string;
  shopLabel: string;
  userLabel: string;
  scopeLabel: string;
  errorTitle: string;
  errorText: string;
  notEmbeddedTitle: string;
  notEmbeddedText: string;
  openSite: string;
  stepsTitle: string;
  steps: string[];
  ctaConnect: string;
  ctaDashboard: string;
  securityNote: string;
};

const it: ShopifyAppContent = {
  metaTitle: "Collega il tuo store Shopify",
  metaDescription:
    "Il pannello di AgentCloud dentro l'amministratore Shopify: verifica il negozio con il session token e attiva il widget nel tema.",
  badge: "App Shopify",
  title: "AgentCloud per il tuo store Shopify",
  subtitle:
    "Verifichiamo il negozio con il session token firmato da Shopify: così l'app agisce per conto tuo senza che tu condivida password o token.",
  checking: "Verifica del negozio in corso…",
  verifiedTitle: "Negozio verificato",
  verifiedText:
    "Il negozio è stato autenticato con il session token emesso da Shopify per questa sessione.",
  shopLabel: "Negozio",
  userLabel: "Utente Shopify",
  scopeLabel: "Scope autorizzati",
  errorTitle: "Verifica non riuscita",
  errorText:
    "Non sono riuscito a verificare il negozio. Ricarica la pagina dall'amministratore Shopify: se il problema resta, controlla che l'app sia installata.",
  notEmbeddedTitle: "Questa pagina si apre dentro Shopify",
  notEmbeddedText:
    "Aprila dall'amministratore Shopify (Temi → Personalizza → Embed dell'app → AgentCloud) per vedere lo stato del tuo negozio.",
  openSite: "Vai al sito",
  stepsTitle: "Attiva l'embed nel tema",
  steps: [
    "Apri Negozio online → Temi → Personalizza",
    "In \"Embed dell'app\" scegli AgentCloud e attiva il blocco",
    "Salva il tema: il widget compare nel negozio",
  ],
  ctaConnect: "Collega il tuo account AgentCloud",
  ctaDashboard: "Vai alla dashboard",
  securityNote:
    "Le richieste dell'app viaggiano con il session token di Shopify (HS256) e vengono verificate lato server.",
};

const en: ShopifyAppContent = {
  metaTitle: "Connect your Shopify store",
  metaDescription:
    "The AgentCloud panel inside the Shopify admin: verify the store with the session token and enable the widget in your theme.",
  badge: "Shopify app",
  title: "AgentCloud for your Shopify store",
  subtitle:
    "We verify the store with the session token signed by Shopify, so the app acts on your behalf without you sharing passwords or tokens.",
  checking: "Verifying the store…",
  verifiedTitle: "Store verified",
  verifiedText:
    "The store was authenticated with the session token issued by Shopify for this session.",
  shopLabel: "Store",
  userLabel: "Shopify user",
  scopeLabel: "Granted scopes",
  errorTitle: "Verification failed",
  errorText:
    "I could not verify the store. Reload the page from the Shopify admin; if it persists, check that the app is installed.",
  notEmbeddedTitle: "This page lives inside Shopify",
  notEmbeddedText:
    "Open it from the Shopify admin (Themes → Customize → App embeds → AgentCloud) to see your store status.",
  openSite: "Go to the site",
  stepsTitle: "Enable the embed in your theme",
  steps: [
    "Open Online Store → Themes → Customize",
    "In \"App embeds\" pick AgentCloud and turn the block on",
    "Save the theme: the widget appears in the store",
  ],
  ctaConnect: "Connect your AgentCloud account",
  ctaDashboard: "Go to the dashboard",
  securityNote:
    "App requests carry the Shopify session token (HS256) and are verified server-side.",
};

const es: ShopifyAppContent = {
  metaTitle: "Conecta tu tienda de Shopify",
  metaDescription:
    "El panel de AgentCloud dentro del administrador de Shopify: verifica la tienda con el session token y activa el widget en tu tema.",
  badge: "App de Shopify",
  title: "AgentCloud para tu tienda de Shopify",
  subtitle:
    "Verificamos la tienda con el session token firmado por Shopify: así la app actúa en tu nombre sin que compartas contraseñas ni tokens.",
  checking: "Verificando la tienda…",
  verifiedTitle: "Tienda verificada",
  verifiedText:
    "La tienda se autenticó con el session token emitido por Shopify para esta sesión.",
  shopLabel: "Tienda",
  userLabel: "Usuario de Shopify",
  scopeLabel: "Permisos concedidos",
  errorTitle: "La verificación falló",
  errorText:
    "No he podido verificar la tienda. Recarga la página desde el administrador de Shopify; si sigue igual, comprueba que la app esté instalada.",
  notEmbeddedTitle: "Esta página se abre dentro de Shopify",
  notEmbeddedText:
    "Ábrela desde el administrador de Shopify (Temas → Personalizar → Insertos de app → AgentCloud) para ver el estado de tu tienda.",
  openSite: "Ir al sitio",
  stepsTitle: "Activa el inserto en tu tema",
  steps: [
    "Abre Tienda online → Temas → Personalizar",
    "En \"Insertos de app\" elige AgentCloud y activa el bloque",
    "Guarda el tema: el widget aparece en la tienda",
  ],
  ctaConnect: "Conecta tu cuenta de AgentCloud",
  ctaDashboard: "Ir al panel",
  securityNote:
    "Las peticiones de la app viajan con el session token de Shopify (HS256) y se verifican en el servidor.",
};

const de: ShopifyAppContent = {
  metaTitle: "Verbinde deinen Shopify-Shop",
  metaDescription:
    "Das AgentCloud-Panel im Shopify-Backoffice: Shop mit dem Session Token prüfen und das Widget im Theme aktivieren.",
  badge: "Shopify-App",
  title: "AgentCloud für deinen Shopify-Shop",
  subtitle:
    "Wir prüfen den Shop mit dem von Shopify signierten Session Token: So handelt die App in deinem Auftrag, ohne dass du Passwörter oder Tokens teilst.",
  checking: "Shop wird geprüft…",
  verifiedTitle: "Shop geprüft",
  verifiedText:
    "Der Shop wurde mit dem für diese Sitzung ausgestellten Session Token von Shopify authentifiziert.",
  shopLabel: "Shop",
  userLabel: "Shopify-Nutzer",
  scopeLabel: "Erteilte Berechtigungen",
  errorTitle: "Prüfung fehlgeschlagen",
  errorText:
    "Der Shop konnte nicht geprüft werden. Lade die Seite im Shopify-Backoffice neu; bleibt es dabei, prüfe, ob die App installiert ist.",
  notEmbeddedTitle: "Diese Seite öffnet sich in Shopify",
  notEmbeddedText:
    "Öffne sie im Shopify-Backoffice (Themes → Anpassen → App-Einbettungen → AgentCloud), um den Status deines Shops zu sehen.",
  openSite: "Zur Website",
  stepsTitle: "Einbettung im Theme aktivieren",
  steps: [
    "Öffne Online-Shop → Themes → Anpassen",
    "Wähle unter \"App-Einbettungen\" AgentCloud und aktiviere den Block",
    "Theme speichern: das Widget erscheint im Shop",
  ],
  ctaConnect: "Dein AgentCloud-Konto verbinden",
  ctaDashboard: "Zum Dashboard",
  securityNote:
    "Anfragen der App tragen den Shopify Session Token (HS256) und werden serverseitig geprüft.",
};

const fr: ShopifyAppContent = {
  metaTitle: "Connectez votre boutique Shopify",
  metaDescription:
    "Le panneau AgentCloud dans l'administration Shopify : vérifiez la boutique avec le session token et activez le widget dans votre thème.",
  badge: "App Shopify",
  title: "AgentCloud pour votre boutique Shopify",
  subtitle:
    "Nous vérifions la boutique avec le session token signé par Shopify : l'app agit en votre nom sans que vous partagiez mot de passe ou jeton.",
  checking: "Vérification de la boutique…",
  verifiedTitle: "Boutique vérifiée",
  verifiedText:
    "La boutique a été authentifiée avec le session token émis par Shopify pour cette session.",
  shopLabel: "Boutique",
  userLabel: "Utilisateur Shopify",
  scopeLabel: "Autorisations accordées",
  errorTitle: "Vérification impossible",
  errorText:
    "Impossible de vérifier la boutique. Rechargez la page depuis l'administration Shopify ; si le problème persiste, vérifiez que l'app est installée.",
  notEmbeddedTitle: "Cette page s'ouvre dans Shopify",
  notEmbeddedText:
    "Ouvrez-la depuis l'administration Shopify (Thèmes → Personnaliser → Intégrations d'applications → AgentCloud) pour voir l'état de votre boutique.",
  openSite: "Aller sur le site",
  stepsTitle: "Activer l'intégration dans votre thème",
  steps: [
    "Ouvrez Boutique en ligne → Thèmes → Personnaliser",
    "Dans « Intégrations d'applications », choisissez AgentCloud et activez le bloc",
    "Enregistrez le thème : le widget apparaît dans la boutique",
  ],
  ctaConnect: "Connecter votre compte AgentCloud",
  ctaDashboard: "Aller au tableau de bord",
  securityNote:
    "Les requêtes de l'app portent le session token de Shopify (HS256) et sont vérifiées côté serveur.",
};

const CONTENT: Record<Locale, ShopifyAppContent> = { it, en, es, de, fr };

export function getShopifyAppContent(locale: Locale): ShopifyAppContent {
  return CONTENT[locale];
}
