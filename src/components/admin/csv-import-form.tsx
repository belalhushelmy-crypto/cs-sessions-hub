"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { importStudentsAction } from "@/actions/students";
import type { CsvImportState } from "@/lib/types";
import {
  Alert,
  Card,
  CardHeader,
  buttonSecondary,
  inputClass,
  labelClass,
} from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { downloadCsv } from "@/lib/csv";

const initialState: CsvImportState = { status: "idle" };

export function CsvImportForm({ locale }: { locale: string }) {
  const t = useTranslations("admin.students");
  const tc = useTranslations("common");
  const [state, formAction] = useActionState(importStudentsAction, initialState);

  const successfulRows = state.status === "done" ? state.rows.filter((row) => row.ok) : [];

  function downloadSample() {
    downloadCsv("students-sample.csv", [
      ["username", "full_name", "password"],
      ["sara", "Sara Ahmed", "StrongPass123"],
      ["omar", "Omar Hassan", ""],
    ]);
  }

  function downloadLogins() {
    downloadCsv("student-logins.csv", [
      ["username", "full_name", "password", "student_code"],
      ...successfulRows.map((row) => [
        row.username,
        row.full_name,
        row.password ?? "",
        row.student_code ?? "",
      ]),
    ]);
  }

  return (
    <Card>
      <CardHeader title={t("importTitle")} description={t("importSubtitle")} />
      <form action={formAction} className="space-y-4 p-5">
        <input type="hidden" name="locale" value={locale} />

        <div>
          <label htmlFor="csv" className={labelClass}>
            CSV
          </label>
          <textarea
            id="csv"
            name="csv"
            rows={7}
            required
            spellCheck={false}
            dir="ltr"
            placeholder={t("importPlaceholder")}
            className={`${inputClass} font-mono text-xs leading-relaxed`}
          />
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            {t("importHint")}
          </p>
        </div>

        {state.status === "error" ? <Alert>{state.error}</Alert> : null}

        <div className="flex flex-wrap items-center gap-2">
          <SubmitButton idle={t("importRun")} pendingLabel={t("importing")} />
          <button type="button" onClick={downloadSample} className={buttonSecondary}>
            {t("downloadSample")}
          </button>
        </div>
      </form>

      {state.status === "done" ? (
        <div className="border-t border-slate-100 p-5 dark:border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                {t("createdCount", { count: state.created })}
              </span>
              {state.failed > 0 ? (
                <span className="rounded-full bg-rose-50 px-2.5 py-1 font-medium text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
                  {t("failedCount", { count: state.failed })}
                </span>
              ) : null}
            </div>
            {successfulRows.length > 0 ? (
              <button type="button" onClick={downloadLogins} className={buttonSecondary}>
                {t("downloadCredentials")}
              </button>
            ) : null}
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[32rem] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-start text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th scope="col" className="py-2 pe-3 text-start font-medium">{t("line")}</th>
                  <th scope="col" className="py-2 pe-3 text-start font-medium">{t("colUsername")}</th>
                  <th scope="col" className="py-2 pe-3 text-start font-medium">{tc("status")}</th>
                  <th scope="col" className="py-2 text-start font-medium">{t("studentCode")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {state.rows.map((row) => (
                  <tr key={`${row.line}-${row.username}`}>
                    <td className="py-2 pe-3 font-mono text-xs text-slate-500">{row.line}</td>
                    <td className="py-2 pe-3 font-mono text-xs text-slate-700 dark:text-slate-300">
                      {row.username || "—"}
                    </td>
                    <td className="py-2 pe-3">
                      {row.ok ? (
                        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          {t("rowCreated")}
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-rose-600 dark:text-rose-400">
                          {t("rowFailed")}
                        </span>
                      )}
                    </td>
                    <td className="py-2 text-xs text-slate-500 dark:text-slate-400">
                      {row.ok ? row.student_code : row.error}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
