import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BrandMark } from "@/components/brand-mark";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignupForm } from "./signup-form";
import { toLocale } from "@/lib/locale";

export default async function SignupPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = raw as "en" | "ar";
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "auth" });
  const tc = await getTranslations({ locale, namespace: "common" });

  return (
    <main className="min-h-dvh lg:grid lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-navy-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-primary-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-24 size-96 rounded-full bg-accent-500/20 blur-3xl" />

        <div className="relative z-10 flex items-center gap-3">
          <BrandMark className="size-12" />
          <span className="text-sm font-semibold tracking-tight">{tc("appName")}</span>
        </div>

        <div className="relative z-10 max-w-md">
          <h2 className="text-4xl font-semibold tracking-tight text-balance">
            {t("brandTitle")}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-300">{t("brandSubtitle")}</p>

          <ul className="mt-8 space-y-3 text-sm text-slate-300">
            {["featureAttendance", "featureAssignments", "featureProgress"].map((key) => (
              <li key={key} className="flex items-center gap-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-emerald-400">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-3.5"
                    aria-hidden="true"
                  >
                    <path d="m5 12 4 4L19 6" />
                  </svg>
                </span>
                {t(key)}
              </li>
            ))}
          </ul>
        </div>

        <p dir="ltr" className="relative z-10 text-end text-xs text-slate-500">
          Data Science · Python
        </p>
      </aside>

      <section className="flex min-h-dvh flex-col">
        <div className="flex items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2.5 lg:invisible">
            <BrandMark className="size-8" />
            <span className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white">
              {tc("appName")}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-4 pb-16 sm:px-6">
          <div className="w-full max-w-sm animate-rise">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
              {t("signUpTitle")}
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t("signUpSubtitle")}</p>

            <SignupForm locale={locale} />

            <p className="mt-8 text-center text-xs text-slate-400 dark:text-slate-500">
              {t("footerNote")}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}