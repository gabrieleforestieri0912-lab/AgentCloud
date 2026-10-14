import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { createClient, type SupabaseClient, type Session } from "@supabase/supabase-js";

/**
 * Auth: Supabase come il mobile (anon key pubblica, sessione persistita in
 * localStorage dal client). Google via browser di sistema + deep-link
 * `agentcloud://auth` (da autorizzare nella dashboard Supabase).
 */
const SUPABASE_URL = "https://umnvmlfzclkuorwnevpu.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtbnZtbGZ6Y2xrdW9yd25ldnB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4MzgyMjksImV4cCI6MjA5NzQxNDIyOX0.Q1PWWyocWG7I3hRJRyT_hxz_uY3P6QiXmE3_zMWopJg";

type AuthCtx = {
  client: SupabaseClient;
  session: Session | null;
  loading: boolean;
  error: string | null;
  loginEmail: (email: string, password: string) => Promise<void>;
  loginGoogle: () => Promise<void>;
  logout: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const client = useMemo(() => createClient(SUPABASE_URL, SUPABASE_ANON_KEY), []);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void client.auth.getSession().then(({ data }) => {
      if (alive) {
        setSession(data.session);
        setLoading(false);
      }
    });
    const { data: sub } = client.auth.onAuthStateChange((_e, s) => {
      if (alive) {
        setSession(s);
        setLoading(false);
      }
    });
    // Ritorno OAuth dal browser: agentcloud://auth#access_token=...&refresh_token=...
    const off = window.agentcloud.onDeepLink((url) => {
      const hash = url.split("#")[1] ?? "";
      const params = new URLSearchParams(hash.replace(/&/g, "&"));
      const access_token = params.get("access_token") ?? "";
      const refresh_token = params.get("refresh_token") ?? "";
      if (!access_token) {
        setError("Accesso Google non riuscito: riprova.");
        return;
      }
      void client.auth.setSession({ access_token, refresh_token }).then(({ error: e }) => {
        if (e) setError("Accesso Google non riuscito: riprova.");
      });
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
      off();
    };
  }, [client]);

  const loginEmail = useCallback(
    async (email: string, password: string) => {
      setError(null);
      const { error: e } = await client.auth.signInWithPassword({ email, password });
      if (e) setError("Credenziali non valide o rete assente.");
    },
    [client],
  );

  const loginGoogle = useCallback(async () => {
    setError(null);
    const { data, error: e } = await client.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: "agentcloud://auth", skipBrowserRedirect: true },
    });
    if (e || !data?.url) {
      setError("Google non disponibile: usa email e password.");
      return;
    }
    await window.agentcloud.openExternal(data.url);
  }, [client]);

  const logout = useCallback(async () => {
    await client.auth.signOut();
  }, [client]);

  const value = useMemo(
    () => ({ client, session, loading, error, loginEmail, loginGoogle, logout }),
    [client, session, loading, error, loginEmail, loginGoogle, logout],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth fuori da AuthProvider");
  return ctx;
}
