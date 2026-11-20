"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { buttonPrimary, codeClass } from "@/components/ui";

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("common");

  useEffect(() => {
    console.error("[Error Boundary] Error caught:", error.message);
    console.error("[Error Boundary] Stack:", error.stack);
    if (error.cause) console.error("[Error Boundary] Cause:", error.cause);
  }, [error]);

  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-6"
            aria-hidden="true"
          >
            <path d="M12 8v5M12 17h.01" />
            <circle cx="12" cy="12" r="9" />
          </svg>
        </div>
        <h1 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
          {t("errorTitle")}
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t("errorBody")}</p>
        {process.env.NODE_ENV === "development" && error.message && (
          <div className="mt-4 text-left">
            <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Error details:</p>
            <pre className={codeClass}>{error.message}</pre>
            {error.stack && <pre className={`${codeClass} mt-2`}>{error.stack}</pre>}
          </div>
        )}
        <button type="button" onClick={reset} className={`${buttonPrimary} mt-6 w-full`}>
          {t("retry")}
        </button>
      </div>
    </main>
  );
}