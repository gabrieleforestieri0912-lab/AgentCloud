"use client";

/**
 * Placeholder skeleton per la griglia del marketplace.
 *
 * Mostra card "fantasma" animate (shimmer/pulse) mentre gli agenti vengono
 * caricati, così la pagina non salta e l'utente sa che il contenuto sta
 * arrivando. `count` indica quante card mostrare (default 6).
 */
import { motion } from "framer-motion";

type AgentCardSkeletonProps = {
  count?: number;
};

export default function AgentCardSkeleton({ count = 6 }: AgentCardSkeletonProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: i * 0.05 }}
          className="rounded-xl border border-white/5 bg-neutral-900 p-6"
        >
          {/* Skeleton intestazione */}
          <div className="mb-6 flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-neutral-800 animate-pulse" />
              <div>
                <div className="mb-2 h-5 w-32 rounded bg-neutral-800 animate-pulse" />
                <div className="h-4 w-24 rounded bg-neutral-800 animate-pulse" />
              </div>
            </div>
          </div>

          {/* Skeleton descrizione */}
          <div className="mb-6 space-y-2">
            <div className="h-4 w-full rounded bg-neutral-800 animate-pulse" />
            <div className="h-4 w-3/4 rounded bg-neutral-800 animate-pulse" />
          </div>

          {/* Skeleton attività */}
          <div className="mb-6 space-y-2.5">
            {[1, 2, 3].map((j) => (
              <div key={j} className="flex items-center gap-3">
                <div className="h-4 w-4 rounded-full bg-neutral-800 animate-pulse" />
                <div className="h-4 w-2/3 rounded bg-neutral-800 animate-pulse" />
              </div>
            ))}
          </div>

          {/* Skeleton piè di card */}
          <div className="flex items-center justify-between border-t border-white/5 pt-6">
            <div>
              <div className="mb-1 h-3 w-12 rounded bg-neutral-800 animate-pulse" />
              <div className="h-5 w-16 rounded bg-neutral-800 animate-pulse" />
            </div>
            <div className="h-10 w-24 rounded-full bg-neutral-800 animate-pulse" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}
