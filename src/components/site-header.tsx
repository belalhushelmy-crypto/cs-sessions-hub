"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Bell, Search, Sparkles } from "lucide-react";
import type { Profile } from "@/lib/types";
import { navHref, roleChipKey, visibleNav } from "@/config/nav";
import { BrandMark } from "@/components/brand-mark";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileNavTrigger } from "@/components/app-sidebar";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { initials } from "@/lib/utils";

export function SiteHeader({ profile }: { profile: Profile }) {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [query, setQuery] = useState("");
  const items = useMemo(() => visibleNav(profile.role), [profile.role]);
  const filtered = items.filter((item) => t(item.key).toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="sticky top-0 z-40 h-14 border-b border-border bg-bg/95 backdrop-blur">
      <div className="mx-auto flex h-full w-full max-w-[1232px] items-center gap-2 px-4 sm:px-6">
        <MobileNavTrigger role={profile.role} locale={locale} />
        <div className="hidden min-w-0 items-center gap-1.5 md:flex">
          <span className="grid size-7 place-items-center overflow-hidden rounded-lg bg-white">
            <BrandMark className="size-6" />
          </span>
          <span className="truncate whitespace-nowrap text-sm font-semibold text-text">Data Science | SFE</span>
        </div>

        <div className="ms-auto flex items-center gap-2">
          <input
            readOnly
            onFocus={() => setPaletteOpen(true)}
            onClick={() => setPaletteOpen(true)}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchPlaceholder")}
            className="hidden h-9 w-[300px] cursor-pointer rounded-lg border border-border bg-surface px-3 text-sm text-text outline-none placeholder:text-muted focus:border-accent md:block xl:w-[380px]"
          />
          <button type="button" onClick={() => setPaletteOpen(true)} aria-label={t("commandPalette")}
            className="inline-flex size-9 items-center justify-center rounded-lg border border-border text-muted hover:bg-surface-2 md:hidden">
            <Search className="size-4" aria-hidden="true" />
          </button>
          <span className="hidden items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent sm:inline-flex">
            <Sparkles className="size-3" aria-hidden="true" />
            {profile.role === "admin" ? t("superAdmin") : t(roleChipKey(profile.role))}
          </span>
          <LocaleSwitcher />
          <ThemeToggle />
          <button type="button" aria-label={t("notifications")}
            className="inline-flex size-9 items-center justify-center rounded-lg border border-border text-muted hover:bg-surface-2">
            <Bell className="size-4" aria-hidden="true" />
          </button>
          <span className="grid size-9 place-items-center rounded-lg border border-border bg-surface-2 text-xs font-semibold text-text">
            {initials(profile.display_name)}
          </span>
        </div>
      </div>

      <Dialog open={paletteOpen} onOpenChange={setPaletteOpen}>
        <DialogContent className="max-w-lg p-0">
          <DialogTitle className="sr-only">{t("commandPalette")}</DialogTitle>
          <div className="flex items-center gap-2 border-b border-border px-4">
            <Search className="size-4 text-muted" aria-hidden="true" />
            <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)}
              placeholder={t("searchPages")} aria-label={t("searchPages")}
              className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted" />
          </div>
          <ul className="max-h-80 overflow-y-auto p-2">
            {filtered.map((item) => {
              const Icon = item.icon;
              const href = navHref(item, profile.role);
              return (
                <li key={item.key}>
                  <Link href={`/${locale}${href}`} onClick={() => setPaletteOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-text hover:bg-surface-2">
                    <Icon className="size-4 text-muted" aria-hidden="true" />
                    {t(item.key)}
                  </Link>
                </li>
              );
            })}
            {filtered.length === 0 ? <li className="px-3 py-6 text-center text-sm text-muted">{t("searchPages")}</li> : null}
          </ul>
        </DialogContent>
      </Dialog>
    </header>
  );
}
