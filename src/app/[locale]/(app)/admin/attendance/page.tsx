import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireTeacher } from "@/lib/auth";
import { toLocale } from "@/lib/locale";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { AdminAttendanceClient } from "../admin-attendance-client";

type SessionRow = {
  id: string;
  title: string;
  session_date: string;
};

type StudentRow = {
  id: string;
  full_name: string;
  username: string;
  student_code: string;
};

type AttendanceRow = {
  student_id: string;
  status: "present" | "absent" | "late";
};

export default async function AdminAttendancePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ session?: string }>;
}) {
  const { locale: raw } = await params;
  const locale = toLocale(raw);
  setRequestLocale(locale);

  await requireTeacher(locale);
  const t = await getTranslations("admin.attendance");
  const ts = await getTranslations("attendanceStatus");

  const { session: sessionIdParam } = await searchParams;

  const supabase = await createClient();
  const [sessionsResult, studentsResult, attendanceResult] = await Promise.all([
    supabase
      .from("sessions")
      .select("id, title, session_date")
      .order("session_date", { ascending: false })
      .limit(100)
      .returns<SessionRow[]>(),
    supabase
      .from("profiles")
      .select("id, full_name, username, student_code")
      .eq("role", "student")
      .order("full_name", { ascending: true })
      .limit(500)
      .returns<StudentRow[]>(),
    supabase
      .from("attendance")
      .select("student_id, status")
      .eq("session_id", sessionIdParam ?? "")
      .returns<AttendanceRow[]>(),
  ]);

  const sessions = sessionsResult.data ?? [];
  const allStudents = studentsResult.data ?? [];
  const attendance = attendanceResult.data ?? [];

  const selectedSession = sessions.find((s) => s.id === sessionIdParam) ?? sessions[0] ?? null;
  const statusByStudent = new Map(attendance.map((row) => [row.student_id, row.status]));

  const presentStudents = allStudents
    .filter((s) => statusByStudent.get(s.id) === "present")
    .map((s) => ({ ...s, status: "present" as const }));

  const lateStudents = allStudents
    .filter((s) => statusByStudent.get(s.id) === "late")
    .map((s) => ({ ...s, status: "late" as const }));

  const absentStudents = allStudents
    .filter((s) => statusByStudent.get(s.id) === "absent")
    .map((s) => ({ ...s, status: "absent" as const }));

  const markedStudents = [...presentStudents, ...lateStudents, ...absentStudents];

  return (
    <AdminAttendanceClient
      locale={locale}
      sessions={sessions}
      markedStudents={markedStudents}
      selectedSession={selectedSession}
      hasError={Boolean(sessionsResult.error || studentsResult.error || attendanceResult.error)}
    />
  );
}