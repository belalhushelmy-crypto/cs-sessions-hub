import { getTranslations, setRequestLocale } from "next-intl/server";
import { AiGradingConsole } from "@/components/admin/ai-grading-console";
import { Alert, PageHeader } from "@/components/ui";
import { getAiHealth, getAiSettings } from "@/actions/ai-settings";
import { requireAdmin } from "@/lib/auth";
import { toLocale } from "@/lib/locale";

export default async function AiGradingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = toLocale(raw);
  setRequestLocale(locale);

  await requireAdmin(locale);
  const t = await getTranslations("aiGrading");
  const [settings, health] = await Promise.all([getAiSettings(), getAiHealth()]);

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("subtitle")} />
      <Alert tone="info">{t("disclosure")}</Alert>
      <AiGradingConsole locale={locale} settings={settings} health={health} />
    </div>
  );
}
