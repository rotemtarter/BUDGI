import {
  BarChart3,
  Bell,
  House,
  Send,
  Settings,
  Sparkles,
  TrendingUp,
  Upload,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

// Navigation order from DESIGN.md 1.15
export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "בית", icon: House },
  { href: "/campaigns", label: "קמפיינים", icon: Send },
  { href: "/budget", label: "תקציב", icon: Wallet },
  { href: "/metrics", label: "מדדים", icon: BarChart3 },
  { href: "/forecast", label: "תחזית", icon: TrendingUp },
  { href: "/advisor", label: "AI Budget", icon: Sparkles },
  { href: "/alerts", label: "התראות", icon: Bell },
  { href: "/imports", label: "ייבוא נתונים", icon: Upload },
  { href: "/settings", label: "הגדרות", icon: Settings },
];

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
