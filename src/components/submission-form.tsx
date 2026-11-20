"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { submitAssignmentAction } from "@/actions/submissions";
import type { SubmitAssignmentState } from "@/lib/types";
import {
  Alert,
  Card,
  CardHeader,
  inputClass,
  labelClass,
  tabsClass,
  tabPanelClass,
} from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

const initialState: SubmitAssignmentState = { status: "idle" };

export function SubmissionForm({
  locale,
  assignmentId,
  hasAttempts,
  allowedTypes = "both",
}: {
  locale: string;
  assignmentId: string;
  hasAttempts: boolean;
  allowedTypes: "file" | "text" | "both";
}) {
  const t = useTranslations("assignments");
  const [state, formAction] = useActionState(submitAssignmentAction, initialState);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [activeTab, setActiveTab] = useState<"file" | "text">(allowedTypes === "text" ? "text" : "file");
  const [code, setCode] = useState("");
  const MAX_CHARS = 100_000;

  useEffect(() => {
    if (state.status === "success") {
      if (inputRef.current) inputRef.current.value = "";
      if (textareaRef.current) textareaRef.current.value = "";
      setFileName(null);
      setCode("");
    }
  }, [state]);

  const showFileTab = allowedTypes === "file" || allowedTypes === "both";
  const showTextTab = allowedTypes === "text" || allowedTypes === "both";

  const handleTabChange = (tab: "file" | "text") => {
    if ((tab === "file" && showFileTab) || (tab === "text" && showTextTab)) {
      setActiveTab(tab);
    }
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const value = e.currentTarget.value;
      e.currentTarget.value = value.substring(0, start) + "  " + value.substring(end);
      e.currentTarget.selectionStart = e.currentTarget.selectionEnd = start + 2;
      setCode(e.currentTarget.value);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCode(e.target.value);
  };

  return (
    <Card>
      <CardHeader
        title={t("uploadTitle")}
        description={t("uploadSubtitle")}
      />
      <form action={formAction} className="space-y-4 p-5">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="assignment_id" value={assignmentId} />

        {showFileTab || showTextTab ? (
          <div className={tabsClass} role="tablist" aria-label={t("submissionMethod")}>
            {showFileTab && (
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "file"}
                aria-controls="file-panel"
                id="file-tab"
                onClick={() => handleTabChange("file")}
                className={tabPanelClass(activeTab === "file")}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4 me-1.5" aria-hidden="true">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                  <path d="M14 2v6h6M9 13h6M9 17h6" />
                </svg>
                {t("tabFile")}
              </button>
            )}
            {showTextTab && (
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "text"}
                aria-controls="text-panel"
                id="text-tab"
                onClick={() => handleTabChange("text")}
                className={tabPanelClass(activeTab === "text")}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4 me-1.5" aria-hidden="true">
                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                  <path d="m15 5 4 4" />
                </svg>
                {t("tabPaste")}
              </button>
            )}
          </div>
        ) : null}

        <input type="hidden" name="submission_type" value={activeTab} />

        {activeTab === "file" && showFileTab ? (
          <div id="file-panel" role="tabpanel" aria-labelledby="file-tab" className="space-y-4">
            <div>
              <label htmlFor="submission-file" className={labelClass}>
                {t("chooseFile")}
              </label>
              <input
                ref={inputRef}
                id="submission-file"
                name="file"
                type="file"
                required
                accept=".cpp,text/x-c++src"
                onChange={(event) => setFileName(event.target.files?.[0]?.name ?? null)}
                className={`${inputClass} cursor-pointer file:me-3 file:rounded-lg file:border-0 file:bg-primary-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-primary-700 dark:file:bg-primary-500/10 dark:file:text-primary-300`}
              />
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                {t("fileHint")}
              </p>
              {fileName ? (
                <p className="mt-1.5 font-mono text-xs text-slate-600 dark:text-slate-300" dir="ltr">
                  {fileName}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {activeTab === "text" && showTextTab ? (
          <div id="text-panel" role="tabpanel" aria-labelledby="text-tab" className="space-y-4">
            <div>
              <label htmlFor="submission-code" className={labelClass}>
                {t("codeLabel")}
              </label>
              <textarea
                ref={textareaRef}
                id="submission-code"
                name="code_text"
                rows={20}
                spellCheck={false}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                dir="ltr"
                placeholder={t("codePlaceholder")}
                onKeyDown={handleTextareaKeyDown}
                onChange={handleCodeChange}
                className={`${inputClass} font-mono text-sm tab-size-2`}
                value={code}
              />
              <p className="mt-1.5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>{t("codeHint")}</span>
                <span className="font-mono">
                  {code.length.toLocaleString(locale)} / {MAX_CHARS.toLocaleString(locale)} {t("chars")}
                </span>
              </p>
            </div>
          </div>
        ) : null}

        {state.status === "error" ? <Alert>{state.error}</Alert> : null}
        {state.status === "success" ? <Alert tone="success">{state.message}</Alert> : null}

        <SubmitButton
          idle={hasAttempts ? t("resubmit") : t("submit")}
          pendingLabel={t("submitting")}
        />
      </form>
    </Card>
  );
}