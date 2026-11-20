import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500";

export const labelClass =
  "mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300";

export const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500";

export const buttonPrimary = cn(
  "inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-60",
  focusRing,
);

export const buttonSecondary = cn(
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800",
  focusRing,
);

export const iconButtonClass = cn(
  "inline-flex size-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-60 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white",
  focusRing,
);

export const badgeClass =
  "inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700 ring-1 ring-inset ring-primary-600/10 dark:bg-primary-500/10 dark:text-primary-300 dark:ring-primary-400/20";

export const codeClass =
  "rounded-lg bg-slate-100 p-3 text-xs font-mono text-slate-800 dark:bg-slate-800 dark:text-slate-200 overflow-auto max-h-48";

export const tabsClass =
  "inline-flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800";

export function tabPanelClass(isActive: boolean): string {
  return `rounded-md px-3 py-1.5 text-sm font-medium transition ${
    isActive
      ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
      : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
  }`;
}

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  action,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
      <div>
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
            {value}
          </p>
          {hint ? (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>
          ) : null}
        </div>
        {icon ? (
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-300">
            {icon}
          </span>
        ) : null}
      </div>
    </Card>
  );
}

export function Alert({
  tone = "error",
  children,
}: {
  tone?: "error" | "success" | "info";
  children: ReactNode;
}) {
  const tones = {
    error:
      "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200",
    success:
      "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200",
    info: "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200",
  };

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("rounded-xl border px-3.5 py-2.5 text-sm", tones[tone])}
    >
      {children}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  icon,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 px-6 py-10 text-center dark:border-slate-700">
      {icon ? <div className="mb-3 text-slate-400 dark:text-slate-500">{icon}</div> : null}
      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{description}</p>
      ) : null}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
