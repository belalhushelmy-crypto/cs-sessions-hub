import { getTranslations, setRequestLocale } from "next-intl/server";
import { RoleManager, type RoleRow } from "@/components/admin/role-manager";
import { Alert, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { toLocale } from "@/lib/locale";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminRolesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = toLocale(raw);
  setRequestLocale(locale);

  await requireAdmin(locale);
  const t = await getTranslations("admin.roles");

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id, username, full_name, student_code, role")
    .order("role", { ascending: true })
    .order("username", { ascending: true })
    .limit(300)
    .returns<RoleRow[]>();

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("subtitle")} />
      <Card>
        <CardHeader title={t("listTitle")} />
        {error ? (
          <div className="p-5"><Alert>{t("loadError")}</Alert></div>
        ) : !data || data.length === 0 ? (
          <div className="p-5"><EmptyState title={t("empty")} /></div>
        ) : (
          <RoleManager rows={data} locale={locale} />
        )}
      </Card>
    </div>
  );
}
