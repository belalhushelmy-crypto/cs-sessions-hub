"use client";

import * as SwitchPrimitive from "@radix-ui/react-switch";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Tone = "success" | "warning" | "danger" | "info" | "neutral";

export function StatusPill({ children, tone = "neutral", className }: { children: ReactNode; tone?: Tone; className?: string }) {
  const classes = {
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
    danger: "bg-danger/15 text-danger",
    info: "bg-accent/15 text-accent",
    neutral: "bg-surface-2 text-muted",
  }[tone];
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", classes, className)}>{children}</span>;
}

export function SegmentedButtons({ options, value, onChange, labels }: {
  options: string[]; value?: string; onChange?: (value: string) => void; labels: Record<string, string>;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const selected = value === option;
        const tone = option === "present" ? "border-success/40 bg-success/15 text-success"
          : option === "late" ? "border-warning/40 bg-warning/15 text-warning"
          : option === "absent" ? "border-danger/40 bg-danger/15 text-danger"
          : "border-accent/40 bg-accent/15 text-accent";
        return (
          <button key={option} type="button" onClick={() => onChange?.(option)} aria-pressed={selected}
            className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${selected ? tone : "border-border text-muted hover:bg-surface-2"}`}>
            {labels[option]}
          </button>
        );
      })}
    </div>
  );
}

export function ToggleRow({ title, description, checked, onCheckedChange }: {
  title: string; description?: string; checked: boolean; onCheckedChange?: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-text">{title}</p>
        {description ? <p className="mt-0.5 text-xs text-muted">{description}</p> : null}
      </div>
      <SwitchPrimitive.Root checked={checked} onCheckedChange={onCheckedChange} aria-label={title}
        className="relative h-5 w-9 shrink-0 rounded-full bg-surface-2 transition data-[state=checked]:bg-accent">
        <SwitchPrimitive.Thumb className="block size-4 translate-x-0.5 rounded-full bg-text transition-transform data-[state=checked]:translate-x-[18px]" />
      </SwitchPrimitive.Root>
    </div>
  );
}
