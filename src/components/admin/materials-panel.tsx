"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  deleteMaterial, prepareMaterialUpload, saveMaterial, updateMaterial,
} from "@/actions/materials";
import { createClient } from "@/lib/supabase/client";
import {
  Alert, Card, CardHeader, buttonSecondary, inputClass, labelClass,
} from "@/components/ui";

export type MaterialView = {
  id: string;
  title: string;
  kind: "file" | "link" | "note";
  url: string | null;
  note_body: string | null;
  position: number;
  published: boolean;
  file_name: string | null;
  size_bytes: number | null;
};

const ACCEPT = ".pdf,.pptx,.docx,.xlsx,.zip,.png,.jpg,.jpeg,.ipynb,.py,.csv,.txt";
const EXTENSIONS = [".pdf", ".pptx", ".docx", ".xlsx", ".zip", ".png", ".jpg", ".jpeg", ".ipynb", ".py", ".csv", ".txt"];
const MAX = 25 * 1024 * 1024;

export function MaterialsPanel({
  locale, sessionId, items,
}: {
  locale: string; sessionId: string; items: MaterialView[];
}) {
  const t = useTranslations("materials");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState<"file" | "link" | "note">("file");
  const [file, setFile] = useState<File | null>(null);

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.error ?? t("errors.save"));
      else router.refresh();
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    data.set("locale", locale);
    data.set("session_id", sessionId);
    data.set("kind", kind);
    data.set("published", data.get("published") ? "on" : "off");

    if (kind === "file") {
      if (!file || file.size > MAX || !EXTENSIONS.some((e) => file.name.toLowerCase().endsWith(e))) {
        setError(t("errors.invalid"));
        return;
      }
      startTransition(async () => {
        setError(null);
        const prepared = await prepareMaterialUpload(sessionId, file.name, file.size);
        if (!prepared.ok) {
          setError(prepared.error);
          return;
        }
        const supabase = createClient();
        const { error: uploadError } = await supabase.storage
          .from("materials")
          .uploadToSignedUrl(prepared.path, prepared.token, file, {
            contentType: prepared.contentType,
          });
        if (uploadError) {
          setError(t("errors.upload"));
          return;
        }
        data.set("storage_path", prepared.path);
        const saved = await saveMaterial(data);
        if (!saved.ok) setError(saved.error ?? t("errors.save"));
        else router.refresh();
      });
      return;
    }

    run(() => saveMaterial(data));
  }

  return (
    <Card>
      <CardHeader title={t("title")} description={t("subtitle")} />
      <div className="space-y-4 p-5">
        <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
          <div className="flex flex-wrap gap-2">
            {(["file", "link", "note"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setKind(value)}
                className={`${buttonSecondary} ${kind === value ? "ring-2 ring-primary-500" : ""}`}
              >
                {t(`kind.${value}`)}
              </button>
            ))}
          </div>

          <div>
            <label htmlFor="material-title" className={labelClass}>{t("titleLabel")}</label>
            <input id="material-title" name="title" required maxLength={160} className={inputClass} />
          </div>

          {kind === "file" ? (
            <div>
              <label htmlFor="material-file" className={labelClass}>{t("fileLabel")}</label>
              <input
                id="material-file" type="file" accept={ACCEPT}
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                className={inputClass}
              />
              <p className="mt-1 text-xs text-muted-foreground">{t("fileHint")}</p>
            </div>
          ) : null}
          {kind === "link" ? (
            <div>
              <label htmlFor="material-url" className={labelClass}>{t("urlLabel")}</label>
              <input id="material-url" name="url" type="url" required className={inputClass} />
            </div>
          ) : null}
          {kind === "note" ? (
            <div>
              <label htmlFor="material-note" className={labelClass}>{t("noteLabel")}</label>
              <textarea id="material-note" name="note_body" rows={3} required className={inputClass} />
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="number" name="position" min={0} max={999} defaultValue={items.length} className={`${inputClass} w-20`} />
              {t("position")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="published" defaultChecked /> {t("published")}
            </label>
            <button type="submit" disabled={pending} className={buttonSecondary}>{t("add")}</button>
          </div>
        </form>

        {error ? <Alert>{error}</Alert> : null}

        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center gap-2 py-3 text-sm">
              <span className="font-mono text-xs text-muted-foreground">{item.position}</span>
              <span className="min-w-0 flex-1 truncate font-medium">{item.title}</span>
              <span className="text-xs text-muted-foreground">{t(`kind.${item.kind}`)}</span>
              {!item.published ? <span className="text-xs text-amber-600">{t("draft")}</span> : null}
              <form onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                data.set("locale", locale);
                run(() => updateMaterial(data));
              }} className="flex items-center gap-2">
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="title" value={item.title} />
                <input type="hidden" name="position" value={item.position} />
                <input type="hidden" name="published" value={item.published ? "on" : "off"} />
                <button type="submit" disabled={pending} className={buttonSecondary}>
                  {item.published ? t("unpublish") : t("publish")}
                </button>
              </form>
              <form onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                data.set("locale", locale);
                run(() => deleteMaterial(data));
              }}>
                <input type="hidden" name="id" value={item.id} />
                <button type="submit" disabled={pending} className={buttonSecondary}>{t("delete")}</button>
              </form>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
