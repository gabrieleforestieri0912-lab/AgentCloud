"use client";

import {
  BarChart3,
  Briefcase,
  Bug,
  Code,
  Cpu,
  Database,
  DollarSign,
  FileText,
  Globe,
  Headphones,
  Mail,
  MessageSquare,
  Megaphone,
  Palette,
  Package,
  PenTool,
  Search,
  Shield,
  ShoppingCart,
  Sparkles,
  Users,
  Wrench,
  Calendar,
  GitBranch,
  Bot,
  LucideIcon,
} from "lucide-react";
import type { Agent } from "@/lib/agents";

const ICONS: Record<Agent["icon"], LucideIcon> = {
  "bar-chart": BarChart3,
  briefcase: Briefcase,
  calendar: Calendar,
  code: Code,
  cpu: Cpu,
  database: Database,
  "file-text": FileText,
  "file-text-dollar": DollarSign,
  globe: Globe,
  headphones: Headphones,
  mail: Mail,
  "message-square": MessageSquare,
  megaphone: Megaphone,
  package: Package,
  "pen-tool": PenTool,
  search: Search,
  shield: Shield,
  "shopping-cart": ShoppingCart,
  users: Users,
  wrench: Wrench,
  "git-branch": GitBranch,
  bug: Bug,
  palette: Palette,
  bot: Bot,
};

type AgentIconProps = {
  icon: Agent["icon"];
  size?: number;
  className?: string;
};

export default function AgentIcon({
  icon,
  size = 20,
  className,
}: AgentIconProps) {
  const Icon = ICONS[icon] ?? Bot;
  return <Icon size={size} className={className} />;
}
