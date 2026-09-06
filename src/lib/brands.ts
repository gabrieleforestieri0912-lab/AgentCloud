import {
  siAndroid,
  siApple,
  siCaldotcom,
  siCalendly,
  siDiscord,
  siDropbox,
  siFacebook,
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
  siMailchimp,
  siMeta,
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

export const BRANDS: Record<string, Brand> = {
  android: official(siAndroid),
  apple: official(siApple),
  caldotcom: official(siCaldotcom),
  calendly: official(siCalendly),
  discord: official(siDiscord),
  dropbox: official(siDropbox),
  facebook: official(siFacebook),
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
  mailchimp: official(siMailchimp),
  meta: official(siMeta),
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
  linkedin: {
    title: "LinkedIn",
    path: LINKEDIN_PATH,
    hex: "#0A66C2",
  },
};