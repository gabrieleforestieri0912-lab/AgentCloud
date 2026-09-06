/**
 * Bolle fluttuanti dei marchi (effetto "costellazione") usate in hero e
 * waitlist. Ogni bolla è definita da posizione/size/animazione e mostra il
 * logo del brand; la prop `interactive` abilita hover/click. È puro layout
 * decorativo: nessuna logica di business.
 */
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
 * Costellazione decorativa di marchi fluttuanti — stesso linguaggio visivo
 * della sezione hero. Renderizzata dietro al contenuto (z-0, pointer-events
 * none) e nascosta sugli schermi piccoli. I keyframe di float vivono in
 * globals.css.
 *
 * Nota: HeroSection renderizza di proposito la propria variante animata con
 * motion (entrata a molla con stagger, breakpoint `lg`, colonne laterali a
 * larghezza fissa).
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
            {/* BrandLogo renderizza il marchio ufficiale multicolore quando
                esiste (Google, WhatsApp, Instagram, Gmail, …) e ripiega sul
                glifo ufficiale monocromatico altrimenti — come nell'hero. */}
            <BrandLogo slug={b.brand} size={iconSize} />
          </div>
        );
      })}
    </div>
  );
}
