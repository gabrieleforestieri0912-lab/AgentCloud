"use client";

/**
 * Icona di un plugin di skill.
 *
 * Il catalogo indicizza le icone per nome Lucide invece che per emoji: le
 * emoji hanno forme diverse su Windows, macOS, Android e iOS, e su Windows
 * in particolare i glifi arrivano a colori di sistema che non esistono in
 * nessun'altra piattaforma. Disegnate in SVG, le icone sono identiche
 * ovunque e prendono il colore del contenitore come gli altri elementi.
 *
 * La lista arriva anche dal DB (casi in cui il plugin è stato creato da
 * utenti), quindi il valore non è detto che sia una chiave nota: in quel
 * caso si cade su Package invece di stampare un carattere a caso.
 */
import {
  BarChart3,
  CalendarDays,
  FileText,
  ListChecks,
  Mail,
  MessagesSquare,
  Package,
  PenLine,
  Search,
  ShoppingCart,
  Smartphone,
  Target,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

/**
 * Icone salvate con le vecchia emoji, ancora presenti nel DB finche' il seed
 * non viene rieseguito: senza questo alias finirebbero tutte sul fallback e
 * i 13 plugin mostrerebbero la stessa icona.
 */
const LEGACY_EMOJI: Record<string, string> = {
  "🛒": "shopping-cart",
  "🎯": "target",
  "💬": "messages-square",
  "📅": "calendar-days",
  "💰": "wallet",
  "✍️": "pen-line",
  "📱": "smartphone",
  "📧": "mail",
  "📊": "bar-chart-3",
  "👥": "users",
  "📄": "file-text",
  "🔍": "search",
  "✅": "list-checks",
};

const ICONS: Record<string, LucideIcon> = {
  "shopping-cart": ShoppingCart,
  target: Target,
  "messages-square": MessagesSquare,
  "calendar-days": CalendarDays,
  wallet: Wallet,
  "pen-line": PenLine,
  smartphone: Smartphone,
  mail: Mail,
  "bar-chart-3": BarChart3,
  users: Users,
  "file-text": FileText,
  search: Search,
  "list-checks": ListChecks,
  package: Package,
};

type SkillIconProps = {
  icon: string;
  size?: number;
  className?: string;
};

export default function SkillIcon({ icon, size = 20, className }: SkillIconProps) {
  const key = LEGACY_EMOJI[icon] ?? icon;
  const Icon = ICONS[key] ?? Package;
  return <Icon size={size} className={className} />;
}