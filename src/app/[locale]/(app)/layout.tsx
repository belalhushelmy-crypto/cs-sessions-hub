import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";
import { requireProfile } from "@/lib/auth";
import { toLocale } from "@/lib/locale";

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = toLocale(raw);
  setRequestLocale(locale);

  const profile = await requireProfile(locale);
  const t = await getTranslations({ locale, namespace: "common" });

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-primary-600 focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg"
      >
        {t("skipToContent")}
      </a>
      <SiteHeader profile={profile} />
      <main
        id="main-content"
        className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:py-10"
      >
        {children}
      </main>
    </div>
  );
}
