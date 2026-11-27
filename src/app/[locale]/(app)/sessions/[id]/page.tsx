import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Download, ExternalLink, FileText, Link2, StickyNote } from "lucide-react";
import { Alert, Card, CardHeader, EmptyState, PageHeader, badgeClass } from "@/components/ui";
import { getMaterialUrl } from "@/actions/materials";
import { requireProfile } from "@/lib/auth";
import { toLocale } from "@/lib/locale";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { idSchema } from "@/lib/validation";
import type { AttendanceStatus } from "@/lib/types";

type SessionRow = { id: string; title: string; session_date: string };
type MaterialRow = {
  id: string;
  title: string;
  kind: "file" | "link" | "note";
  url: string | null;
  note_body: string | null;
  storage_path: string | null;
};

const icons = { file: FileText, link: Link2, note: StickyNote };

export default async function StudentSessionDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: raw, id } = await params;
  const locale = toLocale(raw);
  setRequestLocale(locale);

  const profile = await requireProfile(locale);
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) notFound();

  const t = await getTranslations("sessions");
  const ts = await getTranslations("attendanceStatus");
  const tm = await getTranslations("materials");
  const supabase = await createClient();

  const [sessionResult, attendanceResult, materialsResult] = await Promise.all([
    supabase.from("sessions").select("id, title, session_date").eq("id", parsed.data).maybeSingle().returns<SessionRow | null>(),
    supabase.from("attendance").select("status").eq("session_id", parsed.data).eq("student_id", profile.id).maybeSingle().returns<{ status: AttendanceStatus } | null>(),
    supabase.from("session_materials").select("id, title, kind, url, note_body, storage_path").eq("session_id", parsed.data).order("position", { ascending: true }).returns<MaterialRow[]>(),
  ]);

  if (!sessionResult.data) notFound();
  const session = sessionResult.data;
  const materials = materialsResult.data ?? [];

  const resolved = await Promise.all(
    materials.map(async (material) => {
      if (material.kind !== "file") return { material, url: material.url };
      const result = await getMaterialUrl(material.id);
      return { material, url: result.ok ? result.url : undefined };
    }),
  );

  return (
    <div className="space-y-6">
      <Link href="/sessions" className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
        ← {t("back")}
      </Link>

      <PageHeader
        title={session.title}
        description={`${formatDate(session.session_date, locale)} · ${
          attendanceResult.data ? ts(attendanceResult.data.status) : t("notRecorded")
        }`}
        action={<span className={badgeClass}>{t("materialsCount", { count: materials.length })}</span>}
      />

      {sessionResult.error || attendanceResult.error || materialsResult.error ? (
        <Alert>{t("loadError")}</Alert>
      ) : null}

      <Card>
        <CardHeader title={t("materialsTitle")} description={t("materialsSubtitle")} />
        {resolved.length === 0 ? (
          <div className="p-5"><EmptyState title={t("noMaterials")} /></div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {resolved.map(({ material, url }) => {
              const Icon = icons[material.kind];
              const fileName = material.storage_path?.split("/").pop();
              return (
                <li key={material.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                  <span className="grid size-9 place-items-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-300">
                    <Icon className="size-4" aria-hidden="true" />
                    <span className="sr-only">{tm(`kind.${material.kind}`)}</span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900 dark:text-white">{material.title}</p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {tm(`kind.${material.kind}`)}{fileName ? ` · ${fileName}` : ""}
                    </p>
                    {material.note_body ? (
                      <p className="mt-1 whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">
                        {material.note_body}
                      </p>
                    ) : null}
                  </div>
                  {url ? (
                    <a
                      href={url}
                      {...(material.kind === "file" ? { download: fileName ?? material.title } : { target: "_blank", rel: "noreferrer" })}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400"
                    >
                      {material.kind === "file" ? <Download className="size-4" aria-hidden="true" /> : <ExternalLink className="size-4" aria-hidden="true" />}
                      {material.kind === "file" ? t("download") : t("openLink")}
                    </a>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
