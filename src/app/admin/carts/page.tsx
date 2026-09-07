import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/supabase/server";
import { hasPlatformAccess } from "@/lib/access-code";
import { isAdminEmail } from "@/lib/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAgentBySlug } from "@/lib/agents";
import Link from "next/link";
import { ShoppingCart, User, Clock } from "lucide-react";
import AppHeader from "@/components/AppHeader";

export const dynamic = "force-dynamic";

export default async function AdminCartsPage() {
  const user = await getSessionUser();
  const hasAccess = await hasPlatformAccess();
  const isAdmin = (user && isAdminEmail(user.email)) || (!user && hasAccess);
  if (!isAdmin) redirect("/login");
  const displayEmail = user?.email ?? (hasAccess ? "admin@agentcloud.agency (preview)" : "");

  const db = createAdminClient();
  if (!db) return <div className="p-8 text-white">DB non configurato</div>;

  const { data: carts } = await db
    .from("carts")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(100);

  const cartIds = (carts ?? []).map((c: { id: string }) => c.id);
  let itemsByCart = new Map<string, Array<{ agent_slug: string; quantity: number; added_at: string }>>();
  if (cartIds.length > 0) {
    const { data: items } = await db.from("cart_items").select("*").in("cart_id", cartIds);
    for (const it of (items ?? []) as Array<{ cart_id: string; agent_slug: string; quantity: number; added_at: string }>) {
      const arr = itemsByCart.get(it.cart_id) ?? [];
      arr.push(it);
      itemsByCart.set(it.cart_id, arr);
    }
  }

  const userIds = [...new Set((carts ?? []).map((c: { user_id: string }) => c.user_id))];
  let emailById = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiles } = await db.from("profiles").select("id, email").in("id", userIds);
    for (const p of (profiles ?? []) as Array<{ id: string; email: string }>) {
      emailById.set(p.id, p.email);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950">
      <AppHeader variant="dashboard" title="Carrelli — Admin" subtitle={displayEmail} />
      <section className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/15 text-brand-400">
                <ShoppingCart size={20} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Carrelli utenti</h1>
                <p className="text-sm text-neutral-500">Vista admin — tutti i carrelli attivi/abbandonati/convertiti</p>
              </div>
            </div>
            <Link href="/dashboard" className="rounded-full border border-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/5">
              Dashboard
            </Link>
          </div>

          {(carts ?? []).length === 0 ? (
            <div className="rounded-xl border border-white/5 bg-neutral-900 p-10 text-center text-sm text-neutral-500">
              Nessun carrello trovato.
            </div>
          ) : (
            <div className="space-y-4">
              {(carts ?? []).map((cart: { id: string; user_id: string; status: string; created_at: string; updated_at: string }) => {
                const items = itemsByCart.get(cart.id) ?? [];
                const totalCents = items.reduce((sum, it) => {
                  const ag = getAgentBySlug(it.agent_slug);
                  return sum + (ag?.priceCents ?? 0) * it.quantity;
                }, 0);
                const email = emailById.get(cart.user_id) ?? cart.user_id;
                return (
                  <div key={cart.id} className="rounded-xl border border-white/5 bg-neutral-900 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm">
                        <User size={14} className="text-neutral-500" />
                        <span className="font-semibold text-white">{email}</span>
                        <span className="text-neutral-600">·</span>
                        <span className="text-xs text-neutral-500">{cart.user_id.slice(0, 8)}…</span>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                          cart.status === "active"
                            ? "bg-emerald-500/15 text-emerald-300"
                            : cart.status === "converted"
                              ? "bg-brand-500/15 text-brand-300"
                              : "bg-amber-500/15 text-amber-300"
                        }`}
                      >
                        {cart.status}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {items.length === 0 ? (
                        <span className="text-xs text-neutral-600">— vuoto —</span>
                      ) : (
                        items.map((it) => {
                          const ag = getAgentBySlug(it.agent_slug);
                          return (
                            <span key={it.agent_slug} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white">
                              {ag?.name ?? it.agent_slug}
                              <span className="text-neutral-400">×{it.quantity}</span>
                              <span className="text-brand-300">{ag?.price ?? ""}</span>
                            </span>
                          );
                        })
                      )}
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1 text-neutral-500">
                        <Clock size={12} /> {new Date(cart.updated_at).toLocaleString("it-IT")}
                      </span>
                      <span className="font-bold text-white">Totale: €{(totalCents / 100).toFixed(2).replace(".", ",")}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
