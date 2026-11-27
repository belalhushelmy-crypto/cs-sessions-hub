"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { ChevronDown, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Search, ShieldCheck } from "lucide-react";
import type { UserRole } from "@/lib/types";
import { logoutAction } from "@/actions/auth";
import { navHref, visibleNav, type NavEntry } from "@/config/nav";
import { BrandMark } from "@/components/brand-mark";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

function NavRows({ entries, role, locale, collapsed, onNavigate }: {
  entries: NavEntry[]; role: UserRole; locale: string; collapsed?: boolean; onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const t = useTranslations("nav");
  return (
    <ul className="space-y-1">
      {entries.map((entry) => {
        const href = navHref(entry, role);
        const active = pathname === href || pathname.startsWith(`${href}/`);
        const Icon = entry.icon;
        return (
          <li key={entry.key}>
            <Link
              href={`/${locale}${href}`}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              title={collapsed ? t(entry.key) : undefined}
              className={cn(
                "flex h-10 items-center gap-3 rounded-lg px-3 text-sm transition",
                active ? "bg-accent/10 text-text" : "text-muted hover:bg-surface-2 hover:text-text",
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              {!collapsed ? <span className="truncate">{t(entry.key)}</span> : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function SidebarBody({ role, locale, collapsed, onNavigate, onToggle }: {
  role: UserRole; locale: string; collapsed: boolean; onNavigate?: () => void; onToggle?: () => void;
}) {
  const t = useTranslations("nav");
  const [adminOpen, setAdminOpen] = useState(true);
  const main = visibleNav(role).filter((entry) => entry.group === "main");
  const admin = visibleNav(role).filter((entry) => entry.group === "admin");

  return (
    <div className="flex h-full flex-col bg-surface-2">
      <div className="flex items-center gap-2.5 px-3 py-4">
        <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-white">
          <BrandMark className="size-9" />
        </span>
        {!collapsed ? (
          <span className="min-w-0">
            <span className="block truncate whitespace-nowrap text-sm font-semibold text-text">Data Science | SFE</span>
            <span className="block truncate text-xs text-muted">Students for Egypt</span>
          </span>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        <NavRows entries={main} role={role} locale={locale} collapsed={collapsed} onNavigate={onNavigate} />
        {role === "admin" ? (
          <div className="mt-5 border-t border-border pt-4">
            <button type="button" onClick={() => setAdminOpen((value) => !value)} aria-expanded={adminOpen}
              className="flex h-10 w-full items-center gap-2 rounded-lg px-3 text-muted transition hover:bg-surface-2 hover:text-text">
              <ShieldCheck className="size-4 shrink-0" aria-hidden="true" />
              {!collapsed ? (
                <>
                  <span className="tiny-label flex-1 text-start">{t("adminPanel")}</span>
                  <ChevronDown className={cn("size-4 transition", adminOpen && "rotate-180")} aria-hidden="true" />
                </>
              ) : null}
            </button>
            {adminOpen ? (
              <div className="mt-1">
                <NavRows entries={admin} role={role} locale={locale} collapsed={collapsed} onNavigate={onNavigate} />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="space-y-1 border-t border-border p-3">
        {onToggle ? (
          <button type="button" onClick={onToggle} aria-label={collapsed ? t("expand") : t("collapse")}
            className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm text-muted transition hover:bg-surface-2 hover:text-text">
            {collapsed ? <PanelLeftOpen className="size-4" aria-hidden="true" /> : <PanelLeftClose className="size-4" aria-hidden="true" />}
            {!collapsed ? t("collapse") : null}
          </button>
        ) : null}
        <form action={logoutAction} className="w-full">
          <input type="hidden" name="locale" value={locale} />
          <button type="submit" className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm text-muted transition hover:bg-surface-2 hover:text-text">
            <LogOut className="size-4" aria-hidden="true" />
            {!collapsed ? t("signOut") : null}
          </button>
        </form>
      </div>
    </div>
  );
}

export function AppSidebar({ role, locale }: { role: UserRole; locale: string }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <aside className={cn("hidden shrink-0 border-e border-border lg:block", collapsed ? "w-16" : "w-[264px]")}>
      <div className="sticky top-0 h-dvh">
        <SidebarBody role={role} locale={locale} collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} />
      </div>
    </aside>
  );
}

export function MobileNavTrigger({ role, locale }: { role: UserRole; locale: string }) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("nav");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className="inline-flex size-9 items-center justify-center rounded-lg border border-border text-muted hover:bg-surface-2 lg:hidden" aria-label={t("openMenu")}>
          <Menu className="size-5" aria-hidden="true" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-[280px] p-0">
        <DialogTitle className="sr-only">{t("openMenu")}</DialogTitle>
        <div className="h-[80dvh] overflow-y-auto">
          <SidebarBody role={role} locale={locale} collapsed={false} onNavigate={() => setOpen(false)} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
