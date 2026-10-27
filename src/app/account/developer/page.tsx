import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/supabase/server";
import { accountIdentityFromUser } from "@/lib/account-identity";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import SettingsShell from "@/components/SettingsShell";
import ApiTokens from "../api-tokens";
import ApiKeys from "../api-keys";

/**
 * /account/developer — area riservata per credenziali.
 *
 * La generazione di token CLI e chiavi API è stata separata dalle impostazioni
 * generali: queste credenziali valgono quanto la password, quindi si creano,
 * si usano e si revocano in una pagina dedicata, non sulla pagina account.
 */
export default async function AccountDeveloperPage() {
  const locale = await getLocale();
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const dict = getDictionary(locale);

  return (
    <SettingsShell email={user.email ?? ""} account={accountIdentityFromUser(user)}>
      <div className="max-w-3xl">
        <h1 className="text-3xl font-bold text-white">
          {dict.accountPage.devPageTitle}
        </h1>
        <p className="mt-2 text-neutral-400">{dict.accountPage.devPageDesc}</p>
        <div className="mt-6 space-y-6">
          <ApiTokens />
          <ApiKeys />
        </div>
      </div>
    </SettingsShell>
  );
}
