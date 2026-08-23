import BrandIcon from "./BrandIcon";
import { BRANDS } from "@/lib/brands";

// Brands whose official mark is inherently multi-color. simple-icons only ships
// a single-color glyph, so for these we use an authentic logo (sourced from
// vectorlogo.zone) stored under /public/brand-logos. Everything else falls back
// to the official single-color simple-icons mark (which already carries the
// correct brand color).
const MULTICOLOR = new Set([
  "google",
  "googledrive",
  "gmail",
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
