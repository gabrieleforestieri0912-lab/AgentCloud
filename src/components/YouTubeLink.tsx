"use client";

import { useEffect, useState } from "react";
import { Play } from "lucide-react";

/**
 * Link YouTube dentro le bolle della chat: invece del solo link di testo
 * mostra una card con titolo e anteprima REALI del video.
 *
 * I metadati arrivano da `/api/youtube`, che risolve sia i link a un video
 * (`watch?v=`, `youtu.be/…`) sia i link di ricerca (`results?search_query=`):
 * in entrambi i casi la card punta al video trovato, quindi in chat si vedono
 * link a video veri e non pagine di ricerca.
 *
 * Degradazione graduale, senza stati di errore a schermo:
 * - mentre carica → il link di testo con la freccia ▶ (identico al prima);
 * - se la risoluzione fallisce (YouTube irraggiungibile, link a un canale, …)
 *   → resta il link di testo.
 */

type YouTubeVideo = {
  id: string;
  url: string;
  title: string;
  author?: string;
  thumbnail?: string;
};

/** Cache in memoria condivisa tra le bolle: la stessa conversazione può
 *  mostrare lo stesso video più volte e ogni istanza ha il suo stato, quindi
 *  senza questa mappa ogni bubbla rifarebbe la fetch. Il valore `null` (link
 *  non risolvibile) è cachato anch'esso. */
const previewCache = new Map<string, YouTubeVideo | null>();

/** True per i link YouTube che questa card sa risolvere: video, live, Shorts e
 *  pagine di ricerca. Canali/playlist restano link di testo normali. */
export function isYouTubePreviewUrl(url: string): boolean {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.hostname === "youtu.be") return true;
  if (!/(^|\.)youtube\.com$/.test(u.hostname)) return false;
  return (
    u.pathname === "/watch" ||
    u.pathname === "/results" ||
    /^\/(?:shorts|embed|live|v)\/[\w-]{11}/.test(u.pathname)
  );
}

/** Risolve l'anteprima di un link YouTube: dalla cache se già nota, altrimenti
 *  via /api/youtube. Restituisce sempre una promise, così chi la consuma può
 *  applicarla in un .then senza setState sincroni dentro gli effect. */
function resolvePreview(url: string, label: string): Promise<YouTubeVideo | null> {
  const cached = previewCache.get(url);
  if (cached !== undefined) return Promise.resolve(cached);
  return fetch(`/api/youtube?url=${encodeURIComponent(url)}&q=${encodeURIComponent(label)}`)
    .then((res) => (res.ok ? res.json() : null))
    .then((data: { video?: YouTubeVideo } | null) => {
      const card = data?.video ?? null;
      previewCache.set(url, card);
      return card;
    })
    .catch(() => {
      previewCache.set(url, null);
      return null;
    });
}

export default function YouTubeLink({ url, label }: { url: string; label: string }) {
  // Primo render: se il video è già in cache (altra bubbla, chat riaperta) la
  // card c'è subito, senza il flash del link di testo.
  const [video, setVideo] = useState<YouTubeVideo | null | undefined>(() => previewCache.get(url));

  useEffect(() => {
    let alive = true;
    resolvePreview(url, label).then((card) => {
      if (alive) setVideo(card);
    });
    return () => {
      alive = false;
    };
  }, [url, label]);

  if (!video) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer nofollow"
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 font-semibold text-brand-300 underline decoration-brand-400/40 underline-offset-2 break-all hover:text-brand-200 cursor-pointer"
      >
        ▶ {label}
      </a>
    );
  }

  return (
    <a
      href={video.url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      onClick={(e) => e.stopPropagation()}
      className="group relative z-10 my-1 flex w-full max-w-md items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-2 text-left no-underline transition-all hover:border-brand-500/40 hover:bg-white/[0.06] cursor-pointer"
    >
      <span className="relative block h-16 w-28 shrink-0 overflow-hidden rounded-lg bg-neutral-900">
        {video.thumbnail ? (
          // L'anteprima arriva da i.ytimg.com: l'host non è tra quelli
          // ottimizzabili da next/image senza config, e la card è piccola con
          // loading lazy — quindi un <img> normale.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={video.thumbnail} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : null}
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/35 text-white opacity-80 transition-opacity group-hover:opacity-100">
          <Play size={16} fill="currentColor" />
        </span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-white">{video.title}</span>
        {video.author ? (
          <span className="mt-0.5 block truncate text-xs text-neutral-400">
            {video.author} · YouTube
          </span>
        ) : null}
      </span>
    </a>
  );
}
