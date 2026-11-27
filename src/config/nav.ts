import {
  BookOpen, ClipboardList, Home, ShieldCheck, Trophy, User, Users,
  CalendarDays, UserCog, Settings, ClipboardCheck, Bot, Sparkles, LayoutGrid,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { UserRole } from "@/lib/types";

export type NavEntry = {
  key: string;
  icon: LucideIcon;
  href: string;
  studentHref?: string;
  enabled: boolean;
  adminOnly?: boolean;
  group: "main" | "admin";
};

/** Single source of truth for the screenshots. Disabled = no backend yet. */
export const navEntries: NavEntry[] = [
  { key: "home", icon: Home, href: "/admin", studentHref: "/dashboard", enabled: true, group: "main" },
  { key: "sessions", icon: BookOpen, href: "/admin/sessions", studentHref: "/sessions", enabled: true, group: "main" },
  { key: "grading", icon: ClipboardList, href: "/admin/assignments", studentHref: "/assignments", enabled: true, group: "main" },
  { key: "leaderboard", icon: Trophy, href: "/leaderboard", enabled: true, group: "main" },
  { key: "profile", icon: User, href: "/profile", enabled: true, group: "main" },

  { key: "overviewAdmin", icon: LayoutGrid, href: "/admin/hub", enabled: true, adminOnly: true, group: "admin" },
  { key: "students", icon: Users, href: "/admin/students", enabled: true, adminOnly: true, group: "admin" },
  { key: "adminsRoles", icon: UserCog, href: "/admin/roles", enabled: true, adminOnly: true, group: "admin" },
  { key: "attendance", icon: CalendarDays, href: "/admin/attendance", enabled: true, adminOnly: true, group: "admin" },
  { key: "aiProviders", icon: Bot, href: "/admin/ai-grading", enabled: true, adminOnly: true, group: "admin" },
  { key: "studentAssignments", icon: ClipboardCheck, href: "/admin/student-assignments", enabled: false, adminOnly: true, group: "admin" },
  { key: "platformSettings", icon: Settings, href: "/admin/platform-settings", enabled: false, adminOnly: true, group: "admin" },
];

export function visibleNav(role: UserRole): NavEntry[] {
  return navEntries.filter((entry) => {
    if (!entry.enabled) return false;
    if (role === "student" && entry.group === "admin") return false;
    if (entry.adminOnly && role !== "admin") return false;
    return true;
  });
}

export function navHref(entry: NavEntry, role: UserRole): string {
  return role === "student" && entry.studentHref ? entry.studentHref : entry.href;
}

export function roleChipKey(role: UserRole): string {
  if (role === "admin") return "nav.superAdmin";
  if (role === "teacher") return "nav.teacher";
  return "nav.student";
}

export { Sparkles };
