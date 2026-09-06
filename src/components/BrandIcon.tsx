import type { Brand } from "@/lib/brands";

type BrandIconProps = {
  brand: Brand;
  size?: number;
  /** Override the brand color (defaults to the official brand color). */
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
