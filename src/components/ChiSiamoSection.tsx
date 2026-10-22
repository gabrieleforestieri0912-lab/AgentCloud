import Image from "next/image";
import BrandIcon from "@/components/BrandIcon";
import { BRANDS } from "@/lib/brands";

/**
 * Sezione "Chi siamo" — i tre fondatori.
 *
 * Vive in un componente dedicato perché è usata in due posti: la landing
 * (`/#chi-siamo`) e la pagina di waitlist. L'id `chi-siamo` è l'ancora a cui
 * punta la voce "Chi siamo" del menu account.
 */
export type ChiSiamoLabels = {
  badge: string;
  title: string;
  sub: string;
  gabBio: string;
  alleBio: string;
  matteoBio: string;
  photosNote: string;
  photosLink: string;
};

const FOUNDERS = [
  {
    name: "Gabriele Forestieri",
    role: "Developer",
    img: "/founders/gabriele_forestieri.jpg",
    bioKey: "gabBio" as const,
    instagram: "https://www.instagram.com/gabrieleforestieri_/",
  },
  {
    name: "Alle Cerchiari",
    role: "Social & Marketing",
    img: "/founders/alle_cerchiari.jpeg",
    bioKey: "alleBio" as const,
    instagram: "https://www.instagram.com/_allespy_/",
  },
  {
    name: "Matteo Parubi",
    role: "Stripe & Pricing",
    sub: "Paru",
    img: "/founders/matteo_parubi.jpeg",
    bioKey: "matteoBio" as const,
    instagram: "https://www.instagram.com/matteo.parubi/",
  },
];

export default function ChiSiamoSection({ labels }: { labels: ChiSiamoLabels }) {
  return (
    <section
      id="chi-siamo"
      className="relative z-10 mx-auto max-w-6xl 3xl:max-w-420 4xl:max-w-460 scroll-mt-28 px-4 py-10 sm:px-6 3xl:px-8 3xl:py-16"
    >
      <div className="mx-auto max-w-3xl 3xl:max-w-4xl text-center">
        <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs 3xl:text-sm font-semibold tracking-widest text-neutral-400">
          {labels.badge}
        </span>
        <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl 3xl:text-4xl">
          {labels.title}
        </h2>
        <p className="mx-auto mt-3 max-w-2xl 3xl:max-w-3xl text-sm 3xl:text-base leading-relaxed text-neutral-400">
          {labels.sub}
        </p>
      </div>
      <div className="mt-8 3xl:mt-10 grid gap-6 3xl:gap-8 sm:grid-cols-3">
        {FOUNDERS.map((m) => (
          <div
            key={m.name}
            className="group rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-center backdrop-blur"
          >
            <div className="relative mx-auto h-24 w-24 overflow-hidden rounded-full border border-white/10 bg-neutral-800">
              <Image src={m.img} alt={m.name} fill sizes="96px" className="object-cover" />
            </div>
            <h3 className="mt-4 text-base font-bold text-white">
              {m.name}{" "}
              {m.sub ? <span className="font-normal text-neutral-400">· {m.sub}</span> : null}
            </h3>
            <p className="mt-1 text-xs font-bold uppercase tracking-widest text-brand-300">{m.role}</p>
            <p className="mt-3 text-sm leading-relaxed text-neutral-400">{labels[m.bioKey]}</p>
            <a
              href={m.instagram}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Instagram di ${m.name}`}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-neutral-300 hover:bg-white/10 hover:text-white"
            >
              <BrandIcon brand={BRANDS.instagram} size={16} color="currentColor" /> Instagram
            </a>
          </div>
        ))}
      </div>
      <p className="mt-6 text-center text-xs text-neutral-500">
        {labels.photosNote}{" "}
        <a href="/about" className="font-semibold text-brand-400 hover:text-brand-300">
          {labels.photosLink}
        </a>
        .
      </p>
    </section>
  );
}
