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
  buttonPrimary,
} from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { toLocale } from "@/lib/locale";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatNumber } from "@/lib/utils";
import type { AttendanceStatus } from "@/lib/types";

type SessionRow = {
  id: string;
  title: string;
  session_date: string;
};

type AttendanceRow = {
  session_id: string;
  status: AttendanceStatus;
};

const statusClasses: Record<AttendanceStatus | "none", string> = {
  present:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/10 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/20",
  late: "bg-amber-50 text-amber-700 ring-amber-600/10 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/20",
  absent:
    "bg-rose-50 text-rose-700 ring-rose-600/10 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/20",
  excused:
    "bg-sky-50 text-sky-700 ring-sky-600/10 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-400/20",
  none: "bg-slate-100 text-slate-600 ring-slate-500/10 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-400/20",
};

export default async function StudentAttendancePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = toLocale(raw);
  setRequestLocale(locale);

  const profile = await requireProfile(locale);
  if (profile.role === "admin") redirect(`/${locale}/admin/sessions`);

  const t = await getTranslations("attendance");
  const ts = await getTranslations("attendanceStatus");

  const today = new Date().toISOString().slice(0, 10);
  const supabase = await createClient();
  const [sessionsResult, attendanceResult] = await Promise.all([
    supabase
      .from("sessions")
      .select("id, title, session_date")
      .lte("session_date", today)
      .order("session_date", { ascending: false })
      .limit(100)
      .returns<SessionRow[]>(),
    supabase
      .from("attendance")
      .select("session_id, status")
      .eq("student_id", profile.id)
      .returns<AttendanceRow[]>(),
  ]);

  const sessions = sessionsResult.data ?? [];
  const sessionIds = sessions.map((session) => session.id);
  const filesResult = sessionIds.length
    ? await supabase
        .from("session_files")
        .select("session_id, file_name, file_path")
        .in("session_id", sessionIds)
        .order("created_at", { ascending: false })
    : { data: [], error: null };
  const filesBySession = new Map<string, Array<{ name: string; url: string }>>();
  for (const file of filesResult.data ?? []) {
    const list = filesBySession.get(file.session_id) ?? [];
    list.push({
      name: file.file_name,
      url: supabase.storage.from("session-materials").getPublicUrl(file.file_path).data.publicUrl,
    });
    filesBySession.set(file.session_id, list);
  }

  const statusBySession = new Map(
    (attendanceResult.data ?? []).map((row) => [row.session_id, row.status]),
  );

  const counts = { present: 0, late: 0, absent: 0, excused: 0 };
  for (const session of sessions) {
    const status = statusBySession.get(session.id);
    if (status) counts[status] += 1;
  }

  const attended = counts.present + counts.late;
  const total = sessions.length;
  const rate = total > 0 ? Math.round((attended / total) * 100) : 0;
  const hasError = Boolean(sessionsResult.error || attendanceResult.error);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
      />

      {hasError ? <Alert>{t("loadError")}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t("rate")}
          value={total > 0 ? `${formatNumber(rate, locale)}%` : "—"}
          hint={t("rateHint", { attended, total })}
        />
        <StatCard
          label={ts("present")}
          value={formatNumber(counts.present, locale)}
        />
        <StatCard label={ts("late")} value={formatNumber(counts.late, locale)} />
        <StatCard label={ts("absent")} value={formatNumber(counts.absent, locale)} />
      </div>

      <Card>
        <CardHeader title={t("history")} />
        {sessions.length === 0 ? (
          <div className="p-5">
            <EmptyState title={t("empty")} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[30rem] text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950/40 dark:text-slate-400">
                <tr>
                  <th scope="col" className="px-5 py-3 text-start font-medium">{t("colSession")}</th>
                  <th scope="col" className="px-5 py-3 text-start font-medium">{t("colStatus")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sessions.map((session) => {
                  const status = statusBySession.get(session.id) ?? "none";
                  return (
                    <tr key={session.id}>
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-slate-900 dark:text-white">
                          {session.title}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          {formatDate(session.session_date, locale)}
                        </p>
                        {(filesBySession.get(session.id) ?? []).length > 0 ? (
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                              {t("sessionFiles")}
                            </span>
                            {(filesBySession.get(session.id) ?? []).map((file) => (
                              <a
                                key={file.url}
                                href={file.url}
                                download={file.name}
                                className="inline-flex items-center rounded-lg bg-primary-50 px-2 py-1 text-xs font-medium text-primary-700 transition hover:bg-primary-100 dark:bg-primary-500/10 dark:text-primary-300"
                              >
                                {file.name}
                              </a>
                            ))}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${statusClasses[status]}`}
                        >
                          {status === "none" ? t("notRecorded") : ts(status)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="text-xs text-slate-500 dark:text-slate-400">{t("note")}</p>
    </div>
  );
}
