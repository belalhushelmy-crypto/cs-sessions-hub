import { getTranslations, setRequestLocale } from "next-intl/server";
import { Users, UserCog, CalendarDays, ClipboardCheck, Bot, Settings, LayoutGrid } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { BentoCard } from "@/components/style-parts";
import { requireAdmin } from "@/lib/auth";
import { toLocale } from "@/lib/locale";

export default async function AdminHubPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = toLocale(raw);
  setRequestLocale(locale);
  await requireAdmin(locale);
  const t = await getTranslations("admin.hub");

  const cards = [
    { key: "students", icon: Users, href: "/admin/students" },
    { key: "admins", icon: UserCog, href: "/admin/roles" },
    { key: "overview", icon: LayoutGrid, href: "/admin" },
    { key: "attendance", icon: CalendarDays, href: "/admin/attendance" },
    { key: "assignments", icon: ClipboardCheck, href: "#", disabled: true },
    { key: "ai", icon: Bot, href: "/admin/ai-grading" },
    { key: "settings", icon: Settings, href: "#", disabled: true },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("subtitle")} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.key} className={`rounded-xl border border-border bg-surface p-5 transition hover:border-accent/40 ${card.disabled ? "opacity-50" : ""}`}>
              <Icon className="size-5 text-accent" aria-hidden="true" />
              <h3 className="mt-3 font-semibold text-text">{t(card.key)}</h3>
              <p className="mt-1 text-sm text-muted">{t(`${card.key}Desc`)}</p>
              {!card.disabled ? (
                <a href={`/${locale}${card.href}`} className="mt-3 inline-block text-sm font-medium text-accent">
                  {t("overview")} →
                </a>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
