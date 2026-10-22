"use client";

/**
 * Footer globale: colonne link (prodotto, azienda, legale), lingue,
 * contatti e loghi dei brand. Testi dal dizionario i18n attivo.
 */
import Link from "next/link";
import Image from "next/image";
import BrandIcon from "./BrandIcon";
import { BRANDS } from "@/lib/brands";
import { useLanguage } from "./LanguageProvider";

export default function Footer() {
  const { dict } = useLanguage();

  // Profili social reali, mostrati con i loro marchi ufficiali (X, Instagram,
  // LinkedIn) e link alle URL verificate.
  const socialLinks = [
    { label: "X (Twitter)", href: "https://x.com/AgentCloud2k", brand: "x" },
    {
      label: "Instagram",
      href: "https://www.instagram.com/_agentcloud/",
      brand: "instagram",
    },
    {
      label: "LinkedIn",
      href: "https://www.linkedin.com/in/agent-cloud-323218431/",
      brand: "linkedin",
    },
  ];

  const SocialGlyph = ({ brand, size }: { brand: string; size: number }) => {
    const def = BRANDS[brand];
    if (!def) return null;
    return (
      <BrandIcon
        brand={def}
        size={size}
        color="currentColor"
        className="opacity-70 group-hover:opacity-100 transition-opacity"
      />
    );
  };

  const companyLinks = [
    { label: dict.footer.about, href: "/about" },
    { label: dict.footer.faq, href: "/#faq" },
    { label: dict.footer.contact, href: "/contact" },
  ];

  const productLinks = [
    { label: dict.navbar.marketplace, href: "/agents" },
    { label: dict.marketplacePage.bundlesAndSave, href: "/bundles" },
    { label: dict.navbar.integrations, href: "/integrations" },
    { label: dict.chat.aiChat, href: "/chat" },
    { label: dict.navbar.appsLabel, href: "/apps" },
    { label: dict.apps.cliTitle, href: "/cli" },
    { label: dict.apps.extTitle, href: "/extension" },
    { label: dict.apps.desktopTitle, href: "/desktop" },
    { label: dict.mobile.badge, href: "/mobile" },
  ];

  return (
    <footer className="relative border-t border-white/5 bg-black pb-[env(safe-area-inset-bottom)] text-white">
      <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-brand-500/70 to-transparent" />
      <div
        className="pointer-events-none absolute inset-0 select-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 0%, rgba(3,139,254,0.08), transparent 45%), radial-gradient(circle at 85% 100%, rgba(217,70,239,0.05), transparent 50%)",
        }}
      />

      <div className="relative mx-auto max-w-7xl 3xl:max-w-[1720px] px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 py-12 border-b border-white/10 md:grid-cols-4 lg:grid-cols-6 lg:gap-6">
          {/* Colonna brand */}
          <div className="col-span-2 flex flex-col items-start gap-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="relative h-8 w-8">
                <Image src="/agentcloud.png" alt="AgentCloud" fill className="object-cover" sizes="32px" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">AgentCloud</span>
            </Link>
            <p className="text-sm font-semibold text-neutral-400 select-none">{dict.footer.tagline}</p>
          </div>

          {/* Colonna prodotto — pagine della piattaforma.
              I link sono su due colonne: su una sola colonna la lista
              faceva il footer troppo alto. */}
          <div className="col-span-2 md:col-span-1 lg:col-span-2 flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-neutral-500">{dict.navbar.marketplace}</span>
            <ul className="grid grid-cols-1 gap-x-4 gap-y-0.5 sm:grid-cols-2">
              {productLinks.map(({ label, href }) => (
                <li key={label}>
                  <Link href={href} className="block py-1 text-sm font-bold text-neutral-300 hover:text-white transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Colonna azienda */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-neutral-500">{dict.footer.company}</span>
            <ul className="flex flex-col gap-0.5">
              {companyLinks.map(({ label, href }) => (
                <li key={label}>
                  <Link href={href} className="block py-1 text-sm font-bold text-neutral-300 hover:text-white transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Colonna contatti — solo link di contatto.
              I social stanno nella barra qui sotto: averli anche qui
              duplicava gli stessi tre link. */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-neutral-500">{dict.footer.contact}</span>
            <ul className="flex flex-col gap-0.5">
              <li>
                <a href="tel:+393519863021" className="block py-1 text-sm font-bold text-neutral-300 hover:text-white transition-colors">
                  {dict.footer.phone}
                </a>
              </li>
              <li>
                <a href="mailto:info@agentcloud.agency" className="block py-1 text-sm font-bold text-neutral-300 hover:text-white transition-colors">
                  {dict.footer.email}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="py-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm font-semibold text-neutral-500">
            <span className="select-none">{dict.footer.rights}</span>
            <Link
              href="/mobile"
              className="block py-1.5 text-neutral-400 hover:text-brand-400 transition-colors"
            >
              {dict.mobile.badge}
            </Link>
            <Link
              href="/privacy"
              className="block py-1.5 text-neutral-400 hover:text-brand-400 transition-colors"
            >
              {dict.footer.privacy}
            </Link>
            <Link
              href="/terms"
              className="block py-1.5 text-neutral-400 hover:text-brand-400 transition-colors"
            >
              {dict.footer.terms}
            </Link>
            <Link
              href="/refunds"
              className="block py-1.5 text-neutral-400 hover:text-brand-400 transition-colors"
            >
              {dict.footer.refunds}
            </Link>
          </div>
          <div className="flex items-center gap-2">
            {socialLinks.map(({ label, href, brand }) => (
              <Link
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex h-10 w-10 items-center justify-center text-neutral-500 hover:text-white transition-colors"
                aria-label={label}
              >
                <span className="sr-only">{label}</span>
                <SocialGlyph brand={brand} size={18} />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
