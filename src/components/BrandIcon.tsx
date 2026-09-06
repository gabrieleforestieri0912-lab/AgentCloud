/**
 * Icona SVG di un marchio (brand) a un colore, con colore ufficiale di default.
 *
 * Usata ovunque serva un logo compatto: navbar, footer, card integrazioni,
 * bolle fluttuanti. Il colore può essere forzato via prop `color` (per
 * superfici scure o stati hover).
 */
import type { Brand } from "@/lib/brands";

type BrandIconProps = {
  brand: Brand;
  size?: number;
  /** Sovrascrive il colore del brand (default: colore ufficiale del brand). */
  color?: string;
  className?: string;
};

export default function BrandIcon({
  brand,
  size = 20,
  color,
  className = "",
}: BrandIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      role="img"
      aria-label={brand.title}
      width={size}
      height={size}
      fill={color ?? (brand.light ? "#ffffff" : brand.hex)}
      className={className}
    >
      <path d={brand.path} />
    </svg>
  );
}
