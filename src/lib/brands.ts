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
  siAirtable,
  siAndroid,
  siApple,
  siAsana,
  siAtlassian,
  siBookingdotcom,
  siCaldotcom,
  siCalendly,
  siClickup,
  siCloudflare,
  siDeepl,
  siDiscord,
  siDropbox,
  siElevenlabs,
  siEvernote,
  siExpo,
  siFacebook,
  siFigma,
  siFramer,
  siGithub,
  siGmail,
  siGoogle,
  siGoogleads,
  siGoogleanalytics,
  siGooglecalendar,
  siGooglechat,
  siGoogleclassroom,
  siGooglecloud,
  siGoogledocs,
  siGoogledrive,
  siGoogleforms,
  siGooglekeep,
  siGooglemaps,
  siGooglemeet,
  siGooglesheets,
  siGoogleslides,
  siGoogletasks,
  siHubspot,
  siInstagram,
  siJira,
  siKahoot,
  siLinear,
  siMailchimp,
  siMeta,
  siMongodb,
  siNetlify,
  siNotion,
  siOpenrouter,
  siPaypal,
  siPosthog,
  siPostman,
  siReplit,
  siShopify,
  siSentry,
  siSpotify,
  siStrava,
  siStripe,
  siSupabase,
  siTiktok,
  siTrello,
  siTripadvisor,
  siUber,
  siUnsplash,
  siVercel,
  siWhatsapp,
  siWoocommerce,
  siX,
  siZoom,
  siZillow,
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
  /**
   * True for marks whose official color is too light for a white surface
   * (MailChimp yellow). Nel tema chiaro il glifo usa l'inchiostro del tema:
   * dipinto col colore ufficiale sparirebbe sul fondo bianco.
   */
  inkOnLight?: true;
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
 * True when the official color is too light to be read on a white surface
 * (MailChimp #FFE01B). Luminanza relativa WCAG: sopra ~0,55 il marchio si
 * perde sul bianco anche se è il colore ufficiale.
 */
const isTooLightForWhite = (hex: string) => {
  const value = hex.startsWith("#") ? hex.slice(1) : hex;
  if (value.length !== 6) return false;
  const channel = (start: number) => {
    const s = parseInt(value.slice(start, start + 2), 16) / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4) > 0.55;
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
    inkOnLight: isTooLightForWhite(icon.hex) ? true : undefined,
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

export const MICROSOFT_PATH =
  "M2 2h9.5v9.5H2zM12.5 2H22v9.5h-9.5zM2 12.5H11.5V22H2zM12.5 12.5H22V22h-9.5z";

// Microsoft Teams / Outlook / OneDrive / SharePoint — official marks as
// shipped by simple-icons v11 (current package versions removed them for
// brand-policy reasons), each with its official brand color below.
export const MICROSOFT_TEAMS_PATH =
  "M20.625 8.127q-.55 0-1.025-.205-.475-.205-.832-.563-.358-.357-.563-.832Q18 6.053 18 5.502q0-.54.205-1.02t.563-.837q.357-.358.832-.563.474-.205 1.025-.205.54 0 1.02.205t.837.563q.358.357.563.837.205.48.205 1.02 0 .55-.205 1.025-.205.475-.563.832-.357.358-.837.563-.48.205-1.02.205zm0-3.75q-.469 0-.797.328-.328.328-.328.797 0 .469.328.797.328.328.797.328.469 0 .797-.328.328-.328.328-.797 0-.469-.328-.797-.328-.328-.797-.328zM24 10.002v5.578q0 .774-.293 1.46-.293.685-.803 1.194-.51.51-1.195.803-.686.293-1.459.293-.445 0-.908-.105-.463-.106-.85-.329-.293.95-.855 1.729-.563.78-1.319 1.336-.756.557-1.67.861-.914.305-1.898.305-1.148 0-2.162-.398-1.014-.399-1.805-1.102-.79-.703-1.312-1.664t-.674-2.086h-5.8q-.411 0-.704-.293T0 16.881V6.873q0-.41.293-.703t.703-.293h8.59q-.34-.715-.34-1.5 0-.727.275-1.365.276-.639.75-1.114.475-.474 1.114-.75.638-.275 1.365-.275t1.365.275q.639.276 1.114.75.474.475.75 1.114.275.638.275 1.365t-.275 1.365q-.276.639-.75 1.113-.475.475-1.114.75-.638.276-1.365.276-.188 0-.375-.024-.188-.023-.375-.058v1.078h10.875q.469 0 .797.328.328.328.328.797zM12.75 2.373q-.41 0-.78.158-.368.158-.638.434-.27.275-.428.639-.158.363-.158.773 0 .41.158.78.159.368.428.638.27.27.639.428.369.158.779.158.41 0 .773-.158.364-.159.64-.428.274-.27.433-.639.158-.369.158-.779 0-.41-.158-.773-.159-.364-.434-.64-.275-.275-.639-.433-.363-.158-.773-.158zM6.937 9.814h2.25V7.94H2.814v1.875h2.25v6h1.875zm10.313 7.313v-6.75H12v6.504q0 .41-.293.703t-.703.293H8.309q.152.809.556 1.5.405.691.985 1.19.58.497 1.318.779.738.281 1.582.281.926 0 1.746-.352.82-.351 1.436-.966.615-.616.966-1.43.352-.815.352-1.752zm5.25-1.547v-5.203h-3.75v6.855q.305.305.691.452.387.146.809.146.469 0 .879-.176.41-.175.715-.48.304-.305.48-.715t.176-.879Z";

export const MICROSOFT_OUTLOOK_PATH =
  "M7.88 12.04q0 .45-.11.87-.1.41-.33.74-.22.33-.58.52-.37.2-.87.2t-.85-.2q-.35-.21-.57-.55-.22-.33-.33-.75-.1-.42-.1-.86t.1-.87q.1-.43.34-.76.22-.34.59-.54.36-.2.87-.2t.86.2q.35.21.57.55.22.34.31.77.1.43.1.88zM24 12v9.38q0 .46-.33.8-.33.32-.8.32H7.13q-.46 0-.8-.33-.32-.33-.32-.8V18H1q-.41 0-.7-.3-.3-.29-.3-.7V7q0-.41.3-.7Q.58 6 1 6h6.5V2.55q0-.44.3-.75.3-.3.75-.3h12.9q.44 0 .75.3.3.3.3.75V10.85l1.24.72h.01q.1.07.18.18.07.12.07.25zm-6-8.25v3h3v-3zm0 4.5v3h3v-3zm0 4.5v1.83l3.05-1.83zm-5.25-9v3h3.75v-3zm0 4.5v3h3.75v-3zm0 4.5v2.03l2.41 1.5 1.34-.8v-2.73zM9 3.75V6h2l.13.01.12.04v-2.3zM5.98 15.98q.9 0 1.6-.3.7-.32 1.19-.86.48-.55.73-1.28.25-.74.25-1.61 0-.83-.25-1.55-.24-.71-.71-1.24t-1.15-.83q-.68-.3-1.55-.3-.92 0-1.64.3-.71.3-1.2.85-.5.54-.75 1.3-.25.74-.25 1.63 0 .85.26 1.56.26.72.74 1.23.48.52 1.17.81.69.3 1.56.3zM7.5 21h12.39L12 16.08V17q0 .41-.3.7-.29.3-.7.3H7.5zm15-.13v-7.24l-5.9 3.54Z";

export const MICROSOFT_ONEDRIVE_PATH =
  "M19.453 9.95q.961.058 1.787.468.826.41 1.442 1.066.615.657.966 1.512.352.856.352 1.816 0 1.008-.387 1.893-.386.885-1.049 1.547-.662.662-1.546 1.049-.885.387-1.893.387H6q-1.242 0-2.332-.475-1.09-.475-1.904-1.29-.815-.814-1.29-1.903Q0 14.93 0 13.688q0-.985.31-1.887.311-.903.862-1.658.55-.756 1.324-1.325.774-.568 1.711-.861.434-.129.85-.187.416-.06.861-.082h.012q.515-.786 1.207-1.413.691-.627 1.5-1.066.808-.44 1.705-.668.896-.229 1.845-.229 1.278 0 2.456.417 1.177.416 2.144 1.16.967.744 1.658 1.78.692 1.038 1.008 2.28zm-7.265-4.137q-1.325 0-2.52.544-1.195.545-2.04 1.565.446.117.85.299.405.181.792.416l4.78 2.86 2.731-1.15q.27-.117.545-.204.276-.088.58-.147-.293-.937-.855-1.705-.563-.768-1.319-1.318-.755-.551-1.658-.856-.902-.304-1.886-.304zM2.414 16.395l9.914-4.184-3.832-2.297q-.586-.351-1.23-.539-.645-.188-1.325-.188-.914 0-1.722.364-.809.363-1.412.978-.604.616-.955 1.436-.352.82-.352 1.723 0 .703.234 1.423.235.721.68 1.284zm16.711 1.793q.563 0 1.078-.176.516-.176.961-.516l-7.23-4.324-10.301 4.336q.527.328 1.13.504.604.175 1.237.175zm3.012-1.852q.363-.727.363-1.523 0-.774-.293-1.407t-.791-1.072q-.498-.44-1.166-.68-.668-.24-1.406-.24-.422 0-.838.1t-.815.252q-.398.152-.785.334-.386.181-.761.345Z";

export const MICROSOFT_SHAREPOINT_PATH =
  "M24 13.5q0 1.242-.475 2.332-.474 1.09-1.289 1.904-.814.815-1.904 1.29-1.09.474-2.332.474-.762 0-1.523-.2-.106.997-.557 1.858-.451.862-1.154 1.494-.704.633-1.606.99-.902.358-1.91.358-1.09 0-2.045-.416-.955-.416-1.664-1.125-.709-.709-1.125-1.664Q6 19.84 6 18.75q0-.188.018-.375.017-.188.04-.375H.997q-.41 0-.703-.293T0 17.004V6.996q0-.41.293-.703T.996 6h3.54q.14-1.277.726-2.373.586-1.096 1.488-1.904Q7.652.914 8.807.457 9.96 0 11.25 0q1.395 0 2.625.533T16.02 1.98q.914.915 1.447 2.145T18 6.75q0 .188-.012.375-.011.188-.035.375 1.242 0 2.344.469 1.101.468 1.928 1.277.826.809 1.3 1.904Q24 12.246 24 13.5zm-12.75-12q-.973 0-1.857.34-.885.34-1.577.943-.691.604-1.154 1.43Q6.2 5.039 6.06 6h4.945q.41 0 .703.293t.293.703v4.945l.21-.035q.212-.75.61-1.424.399-.673.944-1.218.545-.545 1.213-.944.668-.398 1.43-.61.093-.503.093-.96 0-1.09-.416-2.045-.416-.955-1.125-1.664-.709-.709-1.664-1.125Q12.34 1.5 11.25 1.5zM6.117 15.902q.54 0 1.06-.111.522-.111.932-.37.41-.257.662-.679.252-.422.252-1.055 0-.632-.263-1.054-.264-.422-.662-.703-.399-.282-.856-.463l-.855-.34q-.399-.158-.662-.334-.264-.176-.264-.445 0-.2.14-.323.141-.123.335-.193.193-.07.404-.094.21-.023.351-.023.598 0 1.055.152.457.153.95.457V8.543q-.282-.082-.522-.14-.24-.06-.475-.1-.234-.041-.486-.059-.252-.017-.557-.017-.515 0-1.054.117-.54.117-.979.375-.44.258-.715.68-.275.421-.275 1.03 0 .598.263.997.264.398.663.68.398.28.855.474l.856.363q.398.17.662.358.263.187.263.457 0 .222-.123.351-.123.13-.31.2-.188.07-.393.087-.205.018-.369.018-.703 0-1.248-.234-.545-.235-1.107-.621v1.875q1.195.468 2.472.468zM11.25 22.5q.773 0 1.453-.293t1.19-.803q.51-.51.808-1.195.299-.686.299-1.459 0-.668-.223-1.277-.222-.61-.62-1.096-.4-.486-.95-.826-.55-.34-1.207-.48v1.933q0 .41-.293.703t-.703.293H7.57q-.07.375-.07.75 0 .773.293 1.459t.803 1.195q.51.51 1.195.803.686.293 1.459.293zM18 18q.926 0 1.746-.352.82-.351 1.436-.966.615-.616.966-1.43.352-.815.352-1.752 0-.926-.352-1.746-.351-.82-.966-1.436-.616-.615-1.436-.966Q18.926 9 18 9t-1.74.357q-.815.358-1.43.973t-.973 1.43q-.357.814-.357 1.74 0 .129.006.258t.017.258q.551.27 1.02.65t.838.855q.369.475.627 1.026.258.55.387 1.148Q17.18 18 18 18Z";

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
  googlechat: official(siGooglechat),
  googlecloud: official(siGooglecloud),
  googledocs: official(siGoogledocs),
  googledrive: official(siGoogledrive),
  googleforms: official(siGoogleforms),
  googlekeep: official(siGooglekeep),
  googlemeet: official(siGooglemeet),
  googlesheets: official(siGooglesheets),
  googleslides: official(siGoogleslides),
  googletasks: official(siGoogletasks),
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
  // Server MCP remoti (vedi src/lib/mcp/registry.ts).
  sentry: official(siSentry),
  supabase: official(siSupabase),
  stripe: official(siStripe),
  tiktok: official(siTiktok),
  trello: official(siTrello),
  whatsapp: official(siWhatsapp),
  woocommerce: official(siWoocommerce),
  // X (Twitter) — official mark; near-black, so rendered light on dark surfaces.
  x: official(siX),
  // Nuove card "Prossimamente" del catalogo integrazioni — glifi ufficiali
  // simple-icons con colore di marca originale.
  cloudflare: official(siCloudflare),
  vercel: official(siVercel),
  googleclassroom: official(siGoogleclassroom),
  openrouter: official(siOpenrouter),
  framer: official(siFramer),
  zillow: official(siZillow),
  netlify: official(siNetlify),
  posthog: official(siPosthog),
  unsplash: official(siUnsplash),
  replit: official(siReplit),
  postman: official(siPostman),
  expo: official(siExpo),
  tripadvisor: official(siTripadvisor),
  evernote: official(siEvernote),
  kahoot: official(siKahoot),
  mongodb: official(siMongodb),
  deepl: official(siDeepl),
  uber: official(siUber),
  googlemaps: official(siGooglemaps),
  strava: official(siStrava),
  elevenlabs: official(siElevenlabs),
  spotify: official(siSpotify),
  zoom: official(siZoom),
  bookingcom: official(siBookingdotcom),
  atlassian: official(siAtlassian),
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
  // Microsoft suite — official marks as shipped by simple-icons v11 (current
  // package versions removed them); generic Microsoft 365 keeps the 4-square
  // tile, which is the Microsoft logo shape.
  microsoftteams: { title: "Microsoft Teams", path: MICROSOFT_TEAMS_PATH, hex: "#6264A7" },
  microsoftoutlook: { title: "Microsoft Outlook", path: MICROSOFT_OUTLOOK_PATH, hex: "#0078D4" },
  microsoftonedrive: { title: "Microsoft OneDrive", path: MICROSOFT_ONEDRIVE_PATH, hex: "#0078D4" },
  microsoftsharepoint: { title: "Microsoft SharePoint", path: MICROSOFT_SHAREPOINT_PATH, hex: "#0078D4" },
  microsoftexcel: { title: "Microsoft Excel", path: MICROSOFT_PATH, hex: "#217346" },
  microsoftword: { title: "Microsoft Word", path: MICROSOFT_PATH, hex: "#2B579A" },
  microsoftpowerpoint: { title: "Microsoft PowerPoint", path: MICROSOFT_PATH, hex: "#B7472A" },
  microsoftonenote: { title: "Microsoft OneNote", path: MICROSOFT_PATH, hex: "#7719AA" },
  // Provider generico Microsoft 365: una sola connessione abilita Word/Excel/
  // PowerPoint/OneNote. Brand dedicato perché il catalogo provider usa `brand`
  // come chiave di rendering del logo.
  microsoft: { title: "Microsoft 365", path: MICROSOFT_PATH, hex: "#0078D4" },
};