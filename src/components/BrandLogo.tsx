import BrandIcon from "./BrandIcon";
import { BRANDS } from "@/lib/brands";

/**
 * Logo completo di un marchio: multicolore dove serve, altrimenti icona
 * monocolore. Perché esiste: alcuni brand (Google, Instagram...) hanno un
 * marchio intrinsecamente multicolore e simple-icons fornisce solo un glifo a
 * colore singolo, quindi per questi usiamo il logo autentico (da
 * vectorlogo.zone) in /public/brand-logos. Tutto il resto ripiega sul glifo
 * monocolore ufficiale (che ha già il colore corretto del brand).
 *
 * INVARIANTE: ogni slug di MULTICOLOR deve avere il file
 * `public/brand-logos/<slug>.svg`. Un `<img>` con src inesistente non ripiega
 * su nulla: il browser mostra l'attributo `alt` al posto dell'icona. Aggiungere
 * uno slug qui senza aggiungere il file rompe la UI; in tal caso lasciarlo
 * fuori (il glifo monocolore ufficiale è comunque corretto).
 */
const MULTICOLOR = new Set([
  "clickup",
  "airtable",
  "google",
  "googledrive",
  "gmail",
  "googlecalendar",
  "googlesheets",
  "googledocs",
  "googleforms",
  "googlemeet",
  "googleads",
  "googleanalytics",
  "whatsapp",
  "instagram",
  "tiktok",
  "slack",
  "microsoftoutlook",
  "microsoftword",
  "microsoftexcel",
  "microsoftpowerpoint",
  "microsoftonenote",
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
    return (
      // I loghi autentici multicolore sono SVG statici in /public/brand-logos:
      // next/image richiederebbe dangerouslyAllowSVG, quindi usiamo <img>.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/brand-logos/${slug}.svg`}
        width={size}
        height={size}
        alt={brand?.title ?? slug}
        className={className}
        draggable={false}
        loading="lazy"
        decoding="async"
      />
    );
  }

  const brand = BRANDS[slug];
  if (!brand) {
    // Fallback: alcuni marchi (Adobe, Canva, AWS...) non hanno un glifo
    // disponibile in simple-icons — non usiamo loghi "fatti a mano" che
    // sbagliano il marchio ufficiale, ma una tessera con l'iniziale.
    const initial = (slug[0] ?? "?").toUpperCase();
    return (
      <span
        aria-label={slug}
        className={`inline-flex items-center justify-center ${className}`}
        style={{
          width: size,
          height: size,
          borderRadius: 4,
          background: "rgba(255,255,255,0.07)",
          color: "#a3a3a3",
          fontSize: Math.max(size * 0.55, 8),
          fontWeight: 800,
          lineHeight: 1,
          userSelect: "none",
        }}
      >
        {initial}
      </span>
    );
  }
  return <BrandIcon brand={brand} size={size} className={className} />;
}
