import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function StatusPanel({
  title,
  rows,
  live = false,
  className,
}: {
  title?: string;
  rows: Array<{ label: string; value: ReactNode }>;
  live?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-border bg-surface p-6", className)}>
      {title ? (
        <div className="mb-4 flex items-center justify-between">
          <p className="tiny-label">{title}</p>
          {live ? (
            <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-success">
              <span className="size-1.5 rounded-full bg-success" aria-hidden="true" /> live
            </span>
          ) : null}
        </div>
      ) : null}
      <dl className="divide-y divide-border">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4 py-2.5">
            <dt className="font-mono text-xs uppercase tracking-wide text-muted">{row.label}</dt>
            <dd className="num text-sm font-medium text-text">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function Disclosure({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border px-4 py-3">
      <p className="tiny-label">{label}</p>
      <p className="mt-1.5 text-sm text-muted">{children}</p>
    </div>
  );
}

export function PillChips({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item} className="rounded-full border border-border bg-surface-2 px-3 py-1 font-mono text-[11px] text-muted">{item}</span>
      ))}
    </div>
  );
}

export function BentoCard({ tag, title, href, children, className }: {
  tag: string; title: string; href?: string; children?: ReactNode; className?: string;
}) {
  const content = (
    <>
      <p className="tiny-label">{tag}</p>
      <h3 className="mt-3 text-lg font-semibold tracking-tight text-text">{title}</h3>
      {children ? <div className="mt-2 text-sm text-muted">{children}</div> : null}
    </>
  );
  const classes = `rounded-xl border border-border bg-surface p-5 transition hover:border-accent/40 ${href ? "block hover:-translate-y-0.5" : ""} ${className ?? ""}`;
  return href ? <a href={href} className={classes}>{content}</a> : <div className={classes}>{content}</div>;
}

export function Marquee({ items }: { items: string[] }) {
  const line = items.join(" // ") + " // ";
  return (
    <div className="overflow-hidden border-y border-border py-2" aria-hidden="true">
      <div className="flex w-max whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.15em] text-muted animate-[ticker_40s_linear_infinite]">
        <span className="pe-6">{line}</span><span className="pe-6">{line}</span>
      </div>
    </div>
  );
}
