import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  Alert, Card, CardHeader, EmptyState, PageHeader, badgeClass,
} from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { toLocale } from "@/lib/locale";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import type { AttendanceStatus } from "@/lib/types";

type SessionRow = { id: string; title: string; session_date: string };
type AttendanceRow = { session_id: string; status: AttendanceStatus };

export default async function StudentSessionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = toLocale(raw);
  setRequestLocale(locale);

  const profile = await requireProfile(locale);
  const t = await getTranslations("sessions");
  const ts = await getTranslations("attendanceStatus");
  const supabase = await createClient();

  const [sessionsResult, attendanceResult] = await Promise.all([
    supabase
      .from("sessions")
      .select("id, title, session_date")
      .order("session_date", { ascending: false })
      .limit(200)
      .returns<SessionRow[]>(),
    supabase
      .from("attendance")
      .select("session_id, status")
      .eq("student_id", profile.id)
      .returns<AttendanceRow[]>(),
  ]);

  const statusBySession = new Map(
    (attendanceResult.data ?? []).map((row) => [row.session_id, row.status]),
  );
  const sessions = sessionsResult.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("subtitle")} />
      {sessionsResult.error || attendanceResult.error ? (
        <Alert>{t("loadError")}</Alert>
      ) : null}

      {sessions.length === 0 ? (
        <Card><div className="p-5"><EmptyState title={t("empty")} /></div></Card>
      ) : (
        <Card>
          <CardHeader title={t("listTitle")} />
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {sessions.map((session) => {
              const status = statusBySession.get(session.id);
              return (
                <li key={session.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/sessions/${session.id}`}
                      className="font-medium text-slate-900 hover:text-primary-600 dark:text-white dark:hover:text-primary-400"
                    >
                      {session.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {formatDate(session.session_date, locale)}
                    </p>
                  </div>
                  <span className={badgeClass}>
                    {status ? ts(status) : t("notRecorded")}
                  </span>
                  <Link
                    href={`/sessions/${session.id}`}
                    className="text-sm font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400"
                  >
                    {t("view")}
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
