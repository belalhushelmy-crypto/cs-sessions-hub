import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Alert, Card, CardHeader, EmptyState, PageHeader, StatCard, buttonSecondary } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { toLocale } from "@/lib/locale";
import { createClient } from "@/lib/supabase/server";
import { cn, formatDate, formatNumber } from "@/lib/utils";
import type { LeaderboardEntry, PointsBreakdown, PointsConfig } from "@/lib/types";

type Period = "week" | "all";

const medals = ["🥇", "🥈", "🥉"];

export default async function LeaderboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const { locale: raw } = await params;
  const locale = toLocale(raw);
  setRequestLocale(locale);

  const profile = await requireProfile(locale);
  const t = await getTranslations("leaderboard");

  const { period: rawPeriod } = await searchParams;
  const period: Period = rawPeriod === "week" ? "week" : "all";

  const supabase = await createClient();
  const breakdownRequest =
    profile.role === "student"
      ? supabase.rpc("my_breakdown")
      : Promise.resolve({ data: null, error: null });
  const [boardResult, configResult, breakdownResult] = await Promise.all([
    supabase.rpc("leaderboard_page", { p_period: period }),
    supabase
      .from("points_config")
      .select("leaderboard_visible, weekly_reset_at")
      .eq("id", 1)
      .single<Pick<PointsConfig, "leaderboard_visible" | "weekly_reset_at">>(),
    breakdownRequest,
  ]);

  const hasError = [boardResult.error, configResult.error].some(Boolean);
  const entries = (boardResult.data ?? []) as LeaderboardEntry[];
  const visible = configResult.data?.leaderboard_visible ?? true;
  const breakdown = ((breakdownResult.data ?? [])[0] ?? null) as PointsBreakdown | null;

  const myRank = period === "week" ? breakdown?.weekly_rank : breakdown?.all_rank;
  const myPoints = period === "week" ? breakdown?.weekly_points : breakdown?.total_points;
  const myGap = period === "week" ? breakdown?.weekly_gap : breakdown?.all_gap;
  const optedOut = breakdown?.opted_out ?? false;

  const total = entries.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        action={
          <Link href={profile.role === "admin" ? "/admin/points" : "/progress"} className={buttonSecondary}>
            {profile.role === "admin" ? t("managePoints") : t("viewProgress")}
          </Link>
        }
      />

      <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {(["week", "all"] as Period[]).map((value) => (
          <Link
            key={value}
            href={{ pathname: "/leaderboard", query: { period: value } }}
            className={cn(
              "rounded-lg px-4 py-1.5 text-sm font-medium transition",
              period === value
                ? "bg-primary-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
            )}
            aria-current={period === value ? "page" : undefined}
          >
            {t(`period.${value}`)}
          </Link>
        ))}
      </div>

      {hasError ? <Alert>{t("loadError")}</Alert> : null}

      {profile.role === "student" && !optedOut && visible && myRank != null ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label={t("yourRank")} value={`#${formatNumber(Number(myRank), locale)}`} hint={t("ofTotal", { count: total })} />
          <StatCard
            label={period === "week" ? t("yourWeeklyPoints") : t("yourPoints")}
            value={formatNumber(Number(myPoints ?? 0), locale, 2)}
          />
          <StatCard
            label={t("toNextRank")}
            value={myGap != null && Number(myGap) > 0 ? formatNumber(Number(myGap), locale, 2) : "—"}
            hint={myGap != null && Number(myGap) > 0 ? t("keepGoing") : t("topRank")}
          />
        </div>
      ) : null}

      {profile.role === "student" && optedOut ? (
        <Alert tone="info">
          {t("optedOutNote")}{" "}
          <Link href="/profile" className="font-semibold underline underline-offset-2">
            {t("changeInProfile")}
          </Link>
        </Alert>
      ) : null}

      {!visible ? (
        <Alert tone="info">{t("hiddenNote")}</Alert>
      ) : null}

      <Card>
        <CardHeader
          title={period === "week" ? t("weeklyBoard") : t("allTimeBoard")}
          description={
            period === "week"
              ? t("weeklyBoardHint", {
                  date: formatDate(configResult.data?.weekly_reset_at ?? new Date(), locale),
                })
              : t("allTimeBoardHint")
          }
          action={
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {t("studentCount", { count: total })}
            </span>
          }
        />

        {entries.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title={!visible ? t("hiddenTitle") : t("emptyTitle")}
              description={!visible ? t("hiddenNote") : t("emptyBody")}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th scope="col" className="w-16 px-5 py-3 text-start font-medium">
                    {t("rank")}
                  </th>
                  <th scope="col" className="px-3 py-3 text-start font-medium">
                    {t("student")}
                  </th>
                  <th scope="col" className="px-5 py-3 text-end font-medium">
                    {t("points")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {entries.map((entry) => (
                  <tr
                    key={`${entry.rank}-${entry.display_name}`}
                    className={cn(
                      "transition",
                      entry.is_me
                        ? "bg-primary-50/70 dark:bg-primary-500/10"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/40",
                    )}
                  >
                    <td className="px-5 py-3.5">
                      <span
                        className={cn(
                          "inline-flex min-w-8 items-center justify-center text-sm",
                          entry.rank <= 3
                            ? "text-lg"
                            : "font-mono font-semibold text-slate-500 dark:text-slate-400",
                        )}
                      >
                        {entry.rank <= 3 ? medals[Number(entry.rank) - 1] : formatNumber(Number(entry.rank), locale)}
                      </span>
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "font-medium",
                            entry.is_me
                              ? "text-primary-700 dark:text-primary-300"
                              : "text-slate-900 dark:text-white",
                          )}
                        >
                          {entry.display_name}
                        </span>
                        {entry.is_me ? (
                          <span className="rounded-full bg-primary-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                            {t("you")}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-end font-semibold tabular-nums text-slate-900 dark:text-white">
                      {formatNumber(Number(entry.points), locale, 2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="text-xs text-slate-500 dark:text-slate-400">{t("privacyNote")}</p>
    </div>
  );
}
