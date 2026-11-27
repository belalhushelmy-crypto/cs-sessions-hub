"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  deleteSessionFile,
  finalizeSessionUploads,
  prepareSessionUploads,
} from "@/actions/session-files";
import { Alert, Card, CardHeader, buttonSecondary, inputClass } from "@/components/ui";

export type SessionFileView = {
  id: string;
  name: string;
  size: number;
  contentType: string;
  url: string;
};

const ACCEPT = ".pptx,.pdf,.ipynb,.py,.png,.jpg,.jpeg,.webp";
const EXTENSIONS = [".pptx", ".pdf", ".ipynb", ".py", ".png", ".jpg", ".jpeg", ".webp"];
const MAX_BYTES = 100 * 1024 * 1024;

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function SessionFilesManager({
  locale,
  sessionId,
  files,
}: {
  locale: string;
  sessionId: string;
  files: SessionFileView[];
}) {
  const t = useTranslations("sessionFiles");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    if (selected.length === 0) return;
    setError(null);

    const invalid = selected.some((file) => {
      const dot = file.name.lastIndexOf(".");
      const extension = dot < 0 ? "" : file.name.slice(dot).toLowerCase();
      return !EXTENSIONS.includes(extension) || file.size <= 0 || file.size > MAX_BYTES;
    });
    if (invalid) {
      setError(t("errors.invalidFile"));
      return;
    }

    setBusy(true);
    try {
      const prepared = await prepareSessionUploads(
        locale,
        sessionId,
        selected.map((file) => ({ name: file.name, size: file.size })),
      );
      if (!prepared.ok) {
        setError(prepared.error);
        return;
      }

      const supabase = createClient();
      for (let index = 0; index < selected.length; index += 1) {
        const upload = prepared.data[index];
        const { error: uploadError } = await supabase.storage
          .from("session-materials")
          .uploadToSignedUrl(upload.path, upload.token, selected[index], {
            contentType: upload.contentType,
            upsert: false,
          });
        if (uploadError) throw uploadError;
      }

      const saved = await finalizeSessionUploads(locale, sessionId, prepared.data);
      if (!saved.ok) {
        setError(saved.error);
        return;
      }
      event.target.value = "";
      router.refresh();
    } catch (uploadError) {
      console.error("session upload failed:", uploadError);
      setError(t("errors.upload"));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(fileId: string) {
    setError(null);
    const result = await deleteSessionFile(locale, fileId);
    if (!result.ok) setError(result.error);
    else router.refresh();
  }

  return (
    <Card>
      <CardHeader title={t("title")} description={t("subtitle")} />
      <div className="space-y-4 p-5">
        <div>
          <label htmlFor="session-files" className="mb-1.5 block text-sm font-medium">
            {t("choose")}
          </label>
          <input
            id="session-files"
            type="file"
            multiple
            accept={ACCEPT}
            disabled={busy}
            onChange={handleUpload}
            className={`${inputClass} cursor-pointer`}
          />
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{t("hint")}</p>
        </div>

        {error ? <Alert>{error}</Alert> : null}

        {files.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">{t("empty")}</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {files.map((file) => (
              <li key={file.id} className="flex flex-wrap items-center gap-3 py-2.5">
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{file.name}</span>
                <span className="text-xs text-slate-500">{formatSize(file.size)}</span>
                <a
                  href={file.url}
                  download={file.name}
                  className="text-sm font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400"
                >
                  {t("download")}
                </a>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleDelete(file.id)}
                  className={`${buttonSecondary} px-2.5 py-1 text-xs`}
                >
                  {t("delete")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
