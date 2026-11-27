import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";
import { AppSidebar } from "@/components/app-sidebar";
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
    <div className="flex min-h-dvh">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-bg"
      >
        {t("skipToContent")}
      </a>
      <AppSidebar role={profile.role} locale={locale} />
      <div className="flex min-w-0 flex-1 flex-col">
        <SiteHeader profile={profile} />
        <main
          id="main-content"
          className="mx-auto w-full max-w-[1232px] flex-1 px-4 py-8 sm:px-6 lg:px-8 lg:py-10"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
