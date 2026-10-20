"use client";

/**
 * Segna l'onboarding come visto.
 *
 * Perché esiste un modulo invece di una fetch spesso nei due componenti: la
 * regola è "il tour si vede una volta sola per account", e per mantenerla
 * serve un unico punto di verità su cosa è già stato inviato. In più la
 * richiesta va fatta con `keepalive`: l'utente può chiudere la pagina o
 * ricaricare mentre il tour è ancora aperto, e senza keepalive la segnalazione
 * verrebbe persa — il tour ricomparirebbe alla visita successiva, che è
 * esattamente il difetto che questo modulo chiude.
 *
 * Nota: la segnalazione è idempotente lato server (una colonna booleana), ma
 * il guard in memoria evita di fare due POST nella stessa sessione.
 */

export type OnboardingType = "chat" | "dashboard";

const alreadySent = new Set<OnboardingType>();

export function markOnboardingSeen(type: OnboardingType): void {
  if (alreadySent.has(type)) return;
  alreadySent.add(type);
  try {
    void fetch("/api/user/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
      keepalive: true,
    }).catch(() => {
      // Se la rete fallisce il flag non resta scritto: il tour verrà
      // riproposto, che è il comportamento desiderato.
    });
  } catch {
    // idem
  }
}
