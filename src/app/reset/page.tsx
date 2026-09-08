"use client";

/**
 * Pagina di reset: pulisce tutti i cookie del browser (sessioni Supabase
 * vecchie, ac_access, ecc.) e reindirizza alla waitlist.
 *
 * Usata quando il proxy è in confusione per cookie stale.
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ResetPage() {
  const router = useRouter();

  useEffect(() => {
    // Pulisci TUTTI i cookie del dominio
    const cookies = document.cookie.split(";");
    for (const cookie of cookies) {
      const name = cookie.split("=")[0].trim();
      if (name) {
        // Prova con path=/ e path=/api/ per coprire tutti i cookie
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/api`;
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname}`;
      }
    }

    // Pulisci anche localStorage e sessionStorage
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}

    // Redirect a /waitlist dopo un breve delay
    setTimeout(() => {
      router.replace("/waitlist");
    }, 500);
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950">
      <div className="text-center">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent mx-auto" />
        <p className="text-sm font-semibold text-neutral-400">
          Pulizia cookie in corso...
        </p>
      </div>
    </div>
  );
}
