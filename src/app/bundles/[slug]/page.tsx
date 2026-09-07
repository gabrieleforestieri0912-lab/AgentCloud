import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BundleDetailClient from "./bundle-detail-client";
import { BUNDLES, getBundleBySlug } from "@/lib/bundles";
import { getLocale } from "@/lib/i18n/locale";
import { pageSeo } from "@/lib/seo";
import { AVAILABLE_AGENTS, localizeAgent } from "@/lib/agents";

export async function generateStaticParams() {
  return BUNDLES.map((b) => ({ slug: b.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const bundle = getBundleBySlug(slug);
  if (!bundle) return {};
  const locale = await getLocale();
  const isIt = locale === "it";
  return pageSeo({
    title: `${bundle.name} — ${isIt ? "Bundle Agenti AI" : "AI Agent Bundle"}`,
    description: bundle.description,
    path: `/bundles/${slug}`,
    locale,
  });
}

export default async function BundleDetailPage({ params }: Props) {
  const { slug } = await params;
  const bundle = getBundleBySlug(slug);
  if (!bundle) notFound();

  const locale = await getLocale();
  const navAgents = AVAILABLE_AGENTS.map((a) => localizeAgent(a, locale));

  return (
    <main className="min-h-screen bg-neutral-950">
      <Navbar marketplaceAgents={navAgents} />
      <BundleDetailClient bundle={bundle} />
      <Footer />
    </main>
  );
}
