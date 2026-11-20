import { cn } from "@/lib/utils";

export type BadgeView = {
  code: string;
  icon: string;
  name: string;
  description: string;
  earned: boolean;
  awardedAt?: string;
};

/** Earned badges are highlighted; locked ones stay visible as a goal. */
export function BadgeGrid({ badges }: { badges: BadgeView[] }) {
  return (
    <ul className="grid gap-3 p-5 sm:grid-cols-2">
      {badges.map((badge) => (
        <li
          key={badge.code}
          className={cn(
            "flex items-start gap-3 rounded-xl border p-3",
            badge.earned
              ? "border-amber-200 bg-amber-50/60 dark:border-amber-500/30 dark:bg-amber-500/10"
              : "border-dashed border-slate-200 bg-slate-50/40 dark:border-slate-700 dark:bg-slate-950/30",
          )}
        >
          <span
            className={cn(
              "grid size-11 shrink-0 place-items-center rounded-xl text-xl",
              badge.earned
                ? "bg-white shadow-sm dark:bg-slate-900"
                : "bg-slate-100 grayscale dark:bg-slate-800",
            )}
            aria-hidden="true"
          >
            {badge.icon}
          </span>
          <div className="min-w-0">
            <p
              className={cn(
                "text-sm font-semibold",
                badge.earned
                  ? "text-slate-900 dark:text-white"
                  : "text-slate-500 dark:text-slate-400",
              )}
            >
              {badge.name}
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              {badge.description}
            </p>
            {badge.earned && badge.awardedAt ? (
              <p className="mt-1 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                {badge.awardedAt}
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
