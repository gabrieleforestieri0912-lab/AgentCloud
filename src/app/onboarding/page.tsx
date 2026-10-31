import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedAgentSlugs } from "@/lib/agents/ownership";
import { getEnabledAgentSlugs, AGENTS, localizeAgent } from "@/lib/agents";
import { getLocale } from "@/lib/i18n/locale";
import { getOnboardingCopy } from "@/lib/i18n/onboarding";
import { isSafeRedirectPath } from "@/lib/safe-redirect-path";
import type { OnboardingAnswers } from "@/lib/onboarding/constants";
import OnboardingClient from "./onboarding-client";

export const metadata: Metadata = {
  title: "Setup · AgentCloud",
  robots: { index: false, follow: false },
};

/**
 * Pagina del setup guidato (primo accesso).
 *
 * Server-side fa le tre cose che il client NON può fare da solo:
 *   1. verificare la sessione (il proxy protegge comunque la rotta, ma qui
 *      doppia verifica: la pagina non esiste per anonimi);
 *   2. decidere se l'onboarding è ancora da fare: chi l'ha già concluso
 *      o saltato (decided + flag) viene rispedito alla dashboard, tranne
 *      quando arriva con ?again=1 dalle Impostazioni;
 *   3. raccogliere il materiale per il client: agenti online/posseduti
 *      (localizzati), risposte già salvate (ripresa a metà), nome dal
 *      profilo (Google/email) e destinazione di ritorno valida.
 */
export default async function OnboardingPage(props: {
  searchParams?: Promise<{ returnTo?: string; again?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const locale = await getLocale();
  const params = await props.searchParams;
  const again = params?.again === "1";

  const db = createAdminClient();
  type OnboardingProfile = {
    onboarding: Record<string, unknown> | null;
    onboarding_step: number | null;
    onboarding_completed_at: string | null;
    onboarding_skipped: boolean | null;
    onboarding_decided: boolean | null;
    full_name: string | null;
  };
  let profile: OnboardingProfile | null = null;
  if (db) {
    const { data } = await db
      .from("profiles")
      .select(
        "onboarding, onboarding_step, onboarding_completed_at, onboarding_skipped, onboarding_decided, full_name",
      )
      .eq("id", user.id)
      .maybeSingle();
    profile = (data as OnboardingProfile | null) ?? null;
  }

  // Onboarding già concluso (o saltato): qui non c'è niente da fare, a meno
  // di un ?again=1 esplicito (venuto da "Rifai l'onboarding" in Impostazioni
  // oppure dall'invito in dashboard, che ha già chiamato DELETE /api/user/setup).
  if (profile?.onboarding_decided && !again) {
    redirect("/dashboard");
  }

  const ownedSlugs = await getOwnedAgentSlugs(user.id, user);
  const eligibleSlugs = Array.from(new Set([...getEnabledAgentSlugs(), ...ownedSlugs]));

  // Candidati localizzati per la schermata 7. Il catalogo resta la fonte dei
  // contenuti; chi non è in catalogo (agente solo runtime) prende il nome
  // dal registry e nessuna localizzazione.
  const agents = eligibleSlugs
    .map((slug) => {
      const catalog = AGENTS.find((a) => a.slug === slug);
      const localized = catalog ? localizeAgent(catalog, locale) : null;
      return {
        slug,
        name: localized?.name ?? slug,
        shortName: localized?.shortName ?? slug,
        category: (localized?.category ?? "") as string,
        priceCents: catalog?.priceCents ?? 0,
        integrations: (catalog?.integrations ?? []) as string[],
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  // Round di ritorno: solo percorsi same-origin validati (stessa regola del
  // login); di default la dashboard.
  const returnToRaw = params?.returnTo ?? "";
  const returnTo = isSafeRedirectPath(returnToRaw) ? returnToRaw : "";

  // Nome precompilato: profilo (trigger handle_new_user) o metadata Google.
  const metadataName =
    typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "";
  const googleHint = user.app_metadata?.provider === "google";

  return (
    <OnboardingClient
      locale={locale}
      copy={getOnboardingCopy(locale)}
      agents={agents}
      eligibleSlugs={eligibleSlugs}
      ownedSlugs={ownedSlugs}
      initialName={profile?.full_name || metadataName || ""}
      googleHint={googleHint}
      initialAnswers={(profile?.onboarding ?? {}) as unknown as OnboardingAnswers}
      initialStep={Math.min(Math.max(profile?.onboarding_step ?? 0, 0), 7)}
      returnTo={returnTo}
    />
  );
}
