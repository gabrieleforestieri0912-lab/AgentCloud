import BrandLogo from "./BrandLogo";

export type FloatingBubble = {
  top: string;
  left: string;
  size: string;
  brand: string;
  delay: string;
  anim: "animate-float-gentle" | "animate-float-reverse";
};

/**
 * Decorative constellation of floating brand marks — the same visual language
 * as the hero section. Rendered behind page content (z-0, pointer-events none)
 * and hidden on small screens. Float keyframes live in globals.css.
 *
 * Note: the HeroSection intentionally renders its own motion-animated variant
 * (spring stagger entrance, `lg:` breakpoint, fixed-width side columns).
 */
export default function FloatingBrandBubbles({
  bubbles,
}: {
  bubbles: FloatingBubble[];
}) {
  return (
    <div
      className="hidden md:block absolute inset-0 z-0 pointer-events-none select-none opacity-50"
      aria-hidden="true"
    >
      {bubbles.map((b, idx) => {
        const bubblePx = Number(b.size.match(/\d+/)?.[0] ?? 12) * 4;
        const iconSize = Math.round(bubblePx * 0.42);
        return (
          <div
            key={idx}
            className={`absolute rounded-full border border-white/10 bg-neutral-900/80 backdrop-blur-sm flex items-center justify-center shadow-[0_6px_20px_rgba(0,0,0,0.3)] ${b.size} ${b.anim}`}
            style={{ top: b.top, left: b.left, animationDelay: b.delay }}
          >
            {/* BrandLogo renders the authentic multi-color mark when one exists
                (Google, WhatsApp, Instagram, Gmail, …) and falls back to the
                official single-color glyph otherwise — same as the hero. */}
            <BrandLogo slug={b.brand} size={iconSize} />
          </div>
        );
      })}
    </div>
  );
}
