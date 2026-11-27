"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { changeRoleAction } from "@/actions/roles";
import { SubmitButton } from "@/components/submit-button";
import { buttonSecondary, inputClass } from "@/components/ui";
import type { ChangeRoleState } from "@/lib/types";
import { initials } from "@/lib/utils";

export type RoleRow = {
  id: string;
  username: string;
  full_name: string;
  student_code: string;
  role: "student" | "teacher" | "admin";
};

const initialState: ChangeRoleState = { status: "idle" };

export function RoleManager({ rows, locale }: { rows: RoleRow[]; locale: string }) {
  const t = useTranslations("admin.roles");

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950/40 dark:text-slate-400">
          <tr>
            <th scope="col" className="px-5 py-3 text-start font-medium">{t("colStudent")}</th>
            <th scope="col" className="px-5 py-3 text-start font-medium">{t("colCode")}</th>
            <th scope="col" className="px-5 py-3 text-end font-medium">{t("colRole")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((row) => (
            <RoleRowForm key={row.id} row={row} locale={locale} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RoleRowForm({ row, locale }: { row: RoleRow; locale: string }) {
  const t = useTranslations("admin.roles");
  const [state, formAction] = useActionState(changeRoleAction, initialState);
  const [role, setRole] = useState(row.role);
  const changed = role !== row.role;

  return (
    <tr>
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-50 text-xs font-semibold text-primary-700 dark:bg-primary-500/10 dark:text-primary-300">
            {initials(row.full_name)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-900 dark:text-white">{row.full_name}</p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">@{row.username}</p>
          </div>
        </div>
      </td>
      <td className="px-5 py-3.5">
        <span className="font-mono text-xs text-slate-600 dark:text-slate-300">
          {row.student_code}
        </span>
      </td>
      <td className="px-5 py-3.5">
        <form action={formAction} className="flex flex-wrap items-center justify-end gap-2">
          <input type="hidden" name="student_id" value={row.id} />
          <input type="hidden" name="locale" value={locale} />
          <label htmlFor={`role-${row.id}`} className="sr-only">{t("colRole")}</label>
          <select
            id={`role-${row.id}`}
            name="role"
            value={role}
            onChange={(event) => setRole(event.target.value as RoleRow["role"])}
            className={`${inputClass} w-auto min-w-32`}
          >
            <option value="student">{t("roleStudent")}</option>
            <option value="teacher">{t("roleTeacher")}</option>
            <option value="admin">{t("roleAdmin")}</option>
          </select>
          <SubmitButton
            idle={t("save")}
            pendingLabel={t("saving")}
            className={buttonSecondary}
            disabled={!changed}
          />
          {state.status === "error" ? (
            <span className="w-full text-end text-xs text-rose-600 dark:text-rose-400">{state.error}</span>
          ) : null}
          {state.status === "success" ? (
            <span className="w-full text-end text-xs text-emerald-600 dark:text-emerald-400">
              {state.message}
            </span>
          ) : null}
        </form>
      </td>
    </tr>
  );
}
