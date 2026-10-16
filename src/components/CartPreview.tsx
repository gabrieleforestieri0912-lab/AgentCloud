"use client";

import Link from "next/link";
import { ArrowRight, ShoppingCart, Trash2 } from "lucide-react";
import { useCart } from "./CartProvider";
import { useLanguage } from "./LanguageProvider";
import AgentIcon from "./AgentIcon";

/**
 * Anteprima del carrello per la navbar: elenca gli articoli con rimozione
 * rapida, totale e CTA verso la pagina intera (/cart).
 */
export default function CartPreview({ onNavigate }: { onNavigate?: () => void }) {
  const { items, totalDisplay, remove } = useCart();
  const { dict } = useLanguage();

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-neutral-900 shadow-xl">
      <div className="px-4 py-3">
        <p className="text-sm font-bold text-white">{dict.navbar.cartLabel}</p>
      </div>
      <div className="h-px bg-white/5" />
      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
          <ShoppingCart size={22} className="text-neutral-600" />
          <p className="text-sm font-semibold text-neutral-400">{dict.navbar.cartEmpty}</p>
        </div>
      ) : (
        <>
          <ul className="max-h-72 overflow-y-auto p-2">
            {items.map((item) => (
              <li
                key={item.agent_slug}
                className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/5"
              >
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${item.accent}`}>
                  <AgentIcon icon={item.icon} brand={item.brand} size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-white">
                    {item.shortName || item.name}
                  </span>
                  <span className="block text-xs font-semibold text-neutral-400">
                    {item.price}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => remove(item.agent_slug)}
                  aria-label={`${dict.navbar.cartRemoveItem}: ${item.name}`}
                  title={dict.navbar.cartRemoveItem}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-red-500/10 hover:text-red-300"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
          <div className="h-px bg-white/5" />
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-xs font-bold uppercase tracking-widest text-neutral-500">
              {dict.navbar.cartTotal}
            </span>
            <span className="text-sm font-extrabold text-white">{totalDisplay}</span>
          </div>
        </>
      )}
      <div className="p-2 pt-0">
        <Link
          href="/cart"
          onClick={onNavigate}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-400"
        >
          {dict.navbar.cartViewCart}
          <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
