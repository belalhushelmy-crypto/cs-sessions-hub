import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  Alert,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  StatCard,
  buttonSecondary,
} from "@/components/ui";
import { BadgeGrid, type BadgeView } from "@/components/points/badge-grid";
import { BreakdownBars, type BreakdownItem } from "@/components/points/breakdown-bars";
import { WeeklyPointsChart } from "@/components/points/weekly-chart";
import { requireProfile } from "@/lib/auth";
import { toLocale } from "@/lib/locale";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatNumber } from "@/lib/utils";
import type { PointsBreakdown, WeeklyProgress } from "@/lib/types";

type BadgeCatalogRow = {
  id: string;
  code: string;
  name_en: string;
  name_ar: string;
  description_en: string;
  description_ar: string;
  icon: string;
};

type EarnedBadgeRow = {
  badge_id: string;
  awarded_at: string;
};

const WEEKS = 8;

export default async function ProgressPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = toLocale(raw);
  setRequestLocale(locale);

  const profile = await requireProfile(locale);
  if (profile.role === "admin") redirect(`/${locale}/admin/points`);

  const t = await getTranslations("progress");

  const supabase = await createClient();
  const [breakdownResult, weeksResult, catalogResult, earnedResult] = await Promise.all([
    supabase.rpc("my_breakdown"),
    supabase.rpc("my_progress_weeks", { p_weeks: WEEKS }),
    supabase
      .from("badges")
      .select("id, code, name_en, name_ar, description_en, description_ar, icon")
      .order("code")
      .returns<BadgeCatalogRow[]>(),
    supabase
      .from("student_badges")
      .select("badge_id, awarded_at")
      .eq("student_id", profile.id)
      .returns<EarnedBadgeRow[]>(),
  ]);

  // Log actual Supabase errors for debugging
  if (breakdownResult.error) console.error("[progress] my_breakdown error:", breakdownResult.error);
  if (weeksResult.error) console.error("[progress] my_progress_weeks error:", weeksResult.error);
  if (catalogResult.error) console.error("[progress] badges catalog error:", catalogResult.error);
  if (earnedResult.error) console.error("[progress] earned badges error:", earnedResult.error);

  const hasError = [breakdownResult.error, weeksResult.error, catalogResult.error, earnedResult.error].some(
    Boolean,
  );

  const breakdown = ((breakdownResult.data ?? [])[0] ?? null) as PointsBreakdown | null;
  const weeks = (weeksResult.data ?? []) as WeeklyProgress[];

  // If breakdown is null (e.g., no data yet), provide empty defaults so the page renders with zeros
  const safeBreakdown = breakdown ?? {
    total_points: 0,
    weekly_points: 0,
    homework_points: 0,
    attendance_points: 0,
    on_time_points: 0,
    streak_points: 0,
    attended_count: 0,
    late_count: 0,
    longest_streak: 0,
    current_streak: 0,
    badge_count: 0,
    all_rank: null,
    all_gap: null,
    weekly_rank: null,
    weekly_gap: null,
    leaderboard_visible: true,
    opted_out: false,
  };

  const points = (value: number | null | undefined) => formatNumber(Number(value ?? 0), locale, 2);

  const earnedById = new Map(
    (earnedResult.data ?? []).map((row) => [row.badge_id, row.awarded_at]),
  );

  const badges: BadgeView[] = (catalogResult.data ?? []).map((badge) => {
    const awardedAt = earnedById.get(badge.id);
    return {
      code: badge.code,
      icon: badge.icon,
      name: locale === "ar" ? badge.name_ar : badge.name_en,
      description: locale === "ar" ? badge.description_ar : badge.description_en,
      earned: Boolean(awardedAt),
      awardedAt: awardedAt ? t("earnedOn", { date: formatDate(awardedAt, locale) }) : undefined,
    };
  });

  const earnedCount = badges.filter((badge) => badge.earned).length;

  const components = [
    { key: "homework", value: Number(safeBreakdown.homework_points), bar: "bg-primary-500" },
    { key: "attendance", value: Number(safeBreakdown.attendance_points), bar: "bg-emerald-500" },
    { key: "onTime", value: Number(safeBreakdown.on_time_points), bar: "bg-sky-500" },
    { key: "streak", value: Number(safeBreakdown.streak_points), bar: "bg-amber-500" },
  ];
  const componentTotal = Math.max(
    Number(safeBreakdown.total_points),
    components.reduce((sum, item) => sum + item.value, 0),
    1,
  );

  const breakdownItems: BreakdownItem[] = components.map((item) => ({
    key: item.key,
    label: t(`components.${item.key}`),
    value: points(item.value),
    ratio: item.value / componentTotal,
    barClass: item.bar,
  }));

  const ranksHidden = !safeBreakdown.leaderboard_visible || safeBreakdown.opted_out;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        action={
          <Link href="/leaderboard" className={buttonSecondary}>
            {t("viewLeaderboard")}
          </Link>
        }
      />

      {hasError ? <Alert>{t("loadError")}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("totalPoints")} value={points(safeBreakdown.total_points)} hint={t("allTime")} />
        <StatCard label={t("weeklyPoints")} value={points(safeBreakdown.weekly_points)} hint={t("thisWeek")} />
        <StatCard
          label={t("rank")}
          value={
            safeBreakdown.all_rank != null
              ? `#${formatNumber(Number(safeBreakdown.all_rank), locale)}`
              : "—"
          }
          hint={
            safeBreakdown.all_rank != null
              ? safeBreakdown.all_gap != null && Number(safeBreakdown.all_gap) > 0
                ? t("gapToNext", { points: points(safeBreakdown.all_gap) })
                : t("topRank")
              : ranksHidden
                ? t("hiddenRank")
                : t("unranked")
          }
        />
        <StatCard
          label={t("streak")}
          value={formatNumber(Number(safeBreakdown.current_streak), locale)}
          hint={t("bestStreak", { count: formatNumber(Number(safeBreakdown.longest_streak), locale) })}
        />
      </div>

      {safeBreakdown.opted_out ? (
        <Alert tone="info">{t("optedOutNote")}</Alert>
      ) : !safeBreakdown.leaderboard_visible ? (
        <Alert tone="info">{t("hiddenNote")}</Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title={t("chartTitle")} description={t("chartSubtitle")} />
          <div className="p-5">
            <WeeklyPointsChart
              data={weeks}
              locale={locale}
              pointsLabel={t("chartLabel")}
              emptyLabel={t("chartEmpty")}
            />
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              {t("chartFooter", {
                attended: formatNumber(Number(safeBreakdown.attended_count), locale),
                late: formatNumber(Number(safeBreakdown.late_count), locale),
              })}
            </p>
          </div>
        </Card>

        <Card>
          <CardHeader title={t("breakdownTitle")} description={t("breakdownSubtitle")} />
          <div className="p-5">
            <BreakdownBars items={breakdownItems} emptyLabel={t("breakdownEmpty")} />
            <dl className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-sm dark:border-slate-800">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500 dark:text-slate-400">{t("totalPoints")}</dt>
                <dd className="font-semibold text-slate-900 dark:text-white">
                  {points(safeBreakdown.total_points)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500 dark:text-slate-400">{t("weeklyPoints")}</dt>
                <dd className="font-semibold text-slate-900 dark:text-white">
                  {points(safeBreakdown.weekly_points)}
                </dd>
              </div>
            </dl>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title={t("badgesTitle")}
          description={t("badgesSubtitle", {
            earned: formatNumber(earnedCount, locale),
            total: formatNumber(badges.length, locale),
          })}
        />
        {badges.length > 0 ? (
          <BadgeGrid badges={badges} />
        ) : (
          <div className="p-5">
            <EmptyState title={t("badgesEmpty")} />
          </div>
        )}
      </Card>
    </div>
  );
}
