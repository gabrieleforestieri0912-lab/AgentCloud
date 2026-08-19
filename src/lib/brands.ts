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
};