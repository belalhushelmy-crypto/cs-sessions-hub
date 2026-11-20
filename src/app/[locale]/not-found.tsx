import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buttonPrimary } from "@/components/ui";

export default async function NotFound() {
  const t = await getTranslations("common");

  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="text-5xl font-semibold tracking-tight text-slate-300 dark:text-slate-700">404</p>
        <h1 className="mt-3 text-lg font-semibold text-slate-900 dark:text-white">
          {t("notFoundTitle")}
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t("notFoundBody")}</p>
        <Link href="/" className={`${buttonPrimary} mt-6 w-full`}>
          {t("backHome")}
        </Link>
      </div>
    </main>
  );
}
