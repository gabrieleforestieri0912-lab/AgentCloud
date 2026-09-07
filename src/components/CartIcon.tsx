"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useCart } from "./CartProvider";

export default function CartIcon({ className = "" }: { className?: string }) {
  const { count } = useCart();
  return (
    <Link
      href="/cart"
      aria-label="Carrello"
      className={`relative flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-neutral-300 transition-colors hover:border-brand-500/40 hover:bg-white/10 hover:text-white ${className}`}
    >
      <ShoppingCart size={17} />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] font-bold text-white">
          {count}
        </span>
      )}
    </Link>
  );
}
