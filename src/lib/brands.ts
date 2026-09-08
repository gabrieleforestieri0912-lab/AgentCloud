/**
 * Catalogo dei marchi (brand) con i loghi ufficiali Simple Icons.
 *
 * Perché esiste: navbar, footer, hero, marketplace e pagina integrazioni
 * mostrano i loghi dei servizi collegabili (Shopify, Google, Stripe...).
 * Avere qui un'unica mappa marchio → logo (con fallback su colore o icona
 * generica) evita di duplicare import e logica di fallback nei componenti.
 * Le icone sono dati statici SVG/React.
 */
import {
  siAndroid,
  siApple,
  siAsana,
  siCaldotcom,
  siCalendly,
  siClickup,
  siDiscord,
  siDropbox,
  siFacebook,
  siFigma,
  siGithub,
  siGmail,
  siGoogle,
  siGoogleads,
  siGoogleanalytics,
  siGooglecalendar,
  siGoogledrive,
  siGooglemeet,
  siGooglesheets,
  siHubspot,
  siInstagram,
  siJira,
  siLinear,
  siMailchimp,
  siMeta,
  siAirtable,
  siNotion,
  siPaypal,
  siShopify,
  siStripe,
  siTiktok,
  siTrello,
  siWhatsapp,
  siWoocommerce,
  siX,
} from "simple-icons";

export type Brand = {
  title: string;
  path: string;
  /** Official brand color (from simple-icons), hex with `#`. */
  hex: string;
  /**
   * True for marks whose official color is black/near-black (Apple, GitHub,
   * TikTok, Notion, Cal.com). On dark surfaces they are rendered white — the
   * same way those brands present their marks on dark backgrounds.
   */
  light?: true;
};

const withHash = (hex: string) => `#${hex}`;

/** True when the official color is so dark that it needs a light fill on dark surfaces. */
const isNearBlack = (hex: string) => {
  const value = hex.startsWith("#") ? hex.slice(1) : hex;
  if (value.length !== 6) return false;
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return r < 0x40 && g < 0x40 && b < 0x40;
};

/**
 * Every mark below comes straight from the `simple-icons` package: official
 * path data AND the official brand color. Nothing is hand-drawn or hand-colored.
 */
const official = (icon: { title: string; path: string; hex: string }): Brand => {
  const hex = withHash(icon.hex);
  return {
    title: icon.title,
    path: icon.path,
    hex,
    light: isNearBlack(icon.hex) ? true : undefined,
  };
};

// LinkedIn — official mark as shipped by simple-icons (the current package
// version removed it for brand-policy reasons; the last upstream glyph, hex
// #0A66C2, is kept here so the footer and integrations keep the official mark).
export const LINKEDIN_PATH =
  "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z";

export const SLACK_PATH =
  "M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z";

export const ZENDESK_PATH =
  "M12.914 2.904V16.29L24 2.905H12.914zM0 2.906C0 5.966 2.483 8.45 5.543 8.45s5.542-2.484 5.543-5.544H0zm11.086 4.807L0 21.096h11.086V7.713zm7.37 7.84c-3.063 0-5.542 2.48-5.542 5.543H24c0-3.06-2.48-5.543-5.543-5.543z";

export const BRANDS: Record<string, Brand> = {
  android: official(siAndroid),
  apple: official(siApple),
  asana: official(siAsana),
  caldotcom: official(siCaldotcom),
  calendly: official(siCalendly),
  clickup: official(siClickup),
  discord: official(siDiscord),
  dropbox: official(siDropbox),
  facebook: official(siFacebook),
  figma: official(siFigma),
  github: official(siGithub),
  gmail: official(siGmail),
  google: official(siGoogle),
  googleads: official(siGoogleads),
  googleanalytics: official(siGoogleanalytics),
  googlecalendar: official(siGooglecalendar),
  googledrive: official(siGoogledrive),
  googlemeet: official(siGooglemeet),
  googlesheets: official(siGooglesheets),
  hubspot: official(siHubspot),
  instagram: official(siInstagram),
  jira: official(siJira),
  linear: official(siLinear),
  mailchimp: official(siMailchimp),
  meta: official(siMeta),
  airtable: official(siAirtable),
  notion: official(siNotion),
  paypal: official(siPaypal),
  shopify: official(siShopify),
  stripe: official(siStripe),
  tiktok: official(siTiktok),
  trello: official(siTrello),
  whatsapp: official(siWhatsapp),
  woocommerce: official(siWoocommerce),
  // X (Twitter) — official mark; near-black, so rendered light on dark surfaces.
  x: official(siX),
  slack: {
    title: "Slack",
    path: SLACK_PATH,
    hex: "#4A154B",
  },
  zendesk: {
    title: "Zendesk",
    path: ZENDESK_PATH,
    hex: "#03363D",
  },
  linkedin: {
    title: "LinkedIn",
    path: LINKEDIN_PATH,
    hex: "#0A66C2",
  },
};