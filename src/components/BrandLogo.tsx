import BrandIcon from "./BrandIcon";
import { BRANDS } from "@/lib/brands";

/**
 * Logo completo di un marchio: multicolore dove serve, altrimenti icona
 * monocolore. Perché esiste: alcuni brand (Google, Instagram...) hanno un
 * marchio intrinsecamente multicolore e simple-icons fornisce solo un glifo a
 * colore singolo, quindi per questi usiamo il logo autentico (da
 * vectorlogo.zone) in /public/brand-logos. Tutto il resto ripiega sul glifo
 * monocolore ufficiale (che ha già il colore corretto del brand).
 */
const MULTICOLOR = new Set([
const MULTICOLOR = new Set([
  "google",
  "googledrive",
  "gmail",
  "googlecalendar",
  "googlesheets",
  "googlemeet",
  "googleads",
  "whatsapp",
  "instagram",
  "tiktok",
]);

type BrandLogoProps = {
  slug: string;
  size?: number;
  className?: string;
};

export default function BrandLogo({
  slug,
  size = 20,
  className = "",
}: BrandLogoProps) {
  if (MULTICOLOR.has(slug)) {
    const brand = BRANDS[slug];
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={`/brand-logos/${slug}.svg`}
        width={size}
        height={size}
        alt={brand?.title ?? slug}
        className={className}
        draggable={false}
      />
    );
  }

  const brand = BRANDS[slug];
  return brand ? <BrandIcon brand={brand} size={size} className={className} /> : null;
}
