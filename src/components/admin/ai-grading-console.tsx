"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  fetchAiModels, gradeQueuedAction, regradeSubmissionAction, saveAiSettings, setAssignmentAi,
} from "@/actions/ai-settings";
import {
  Alert, Card, CardHeader, buttonPrimary, buttonSecondary, inputClass, labelClass,
} from "@/components/ui";

type Settings = {
  auto_grade: boolean; model: string; mock_mode: boolean; max_attempts: number;
  upload_rate_limit: number; timeout_seconds: number; retry_attempts: number;
  feedback_language: "en" | "ar" | "both"; default_instructions: string;
  apiKeyConfigured: boolean;
};

type Health = {
  queued: number; graded: number; failed: number; failedReasons: string[];
  overrides: Array<{
    assignment_id: string;
    enabled: boolean;
    assignments: { title: string } | null;
  }>;
  failedSubmissions: Array<{ id: string; assignment: string; reason: string }>;
};

export function AiGradingConsole({
  locale, settings, health,
}: {
  locale: string; settings: Settings; health: Health;
}) {
  const t = useTranslations("aiGrading");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [models, setModels] = useState<Array<{ id: string; label: string }>>([]);

  function act(task: () => Promise<{ ok: boolean; error?: string; message?: string }>) {
    setNotice(null); setError(null);
    startTransition(async () => {
      const result = await task();
      if (!result.ok) setError(result.error ?? t("errors.saveFailed"));
      else {
        setNotice(result.message ?? t("saved"));
        router.refresh();
      }
    });
  }

  function saveSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    data.set("locale", locale);
    act(() => saveAiSettings(data));
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title={t("master")} description={t("masterHint")} />
        <form onSubmit={saveSettings} className="space-y-4 p-5">
          <div className="flex flex-wrap gap-5">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="auto_grade" defaultChecked={settings.auto_grade} /> {t("autoGrade")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="mock_mode" defaultChecked={settings.mock_mode} /> {t("mockMode")}
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            {settings.apiKeyConfigured ? t("envConfigured") : t("envMissing")}
          </p>

          <div>
            <label htmlFor="ai-model" className={labelClass}>{t("model")}</label>
            <input id="ai-model" name="model" defaultValue={settings.model} className={inputClass} />
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)}
              placeholder={t("apiKeyLabel")} className={`${inputClass} max-w-sm`}
            />
            <button
              type="button" disabled={pending || !apiKey.trim()} className={buttonSecondary}
              onClick={() => {
                setError(null);
                startTransition(async () => {
                  const result = await fetchAiModels(apiKey);
                  if (!result.ok) setError(result.error);
                  else setModels(result.models);
                });
              }}
            >
              {t("fetchModels")}
            </button>
            {models.length > 0 ? (
              <select className={inputClass} onChange={(event) => setApiKey(event.target.value)}>
                {models.map((model) => <option key={model.id} value={model.id}>{model.label}</option>)}
              </select>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {([
              ["max_attempts", settings.max_attempts, t("maxAttempts")],
              ["upload_rate_limit", settings.upload_rate_limit, t("uploadRateLimit")],
              ["timeout_seconds", settings.timeout_seconds, t("timeout")],
              ["retry_attempts", settings.retry_attempts, t("retries")],
            ] as const).map(([name, value, label]) => (
              <div key={name}>
                <label htmlFor={name} className={labelClass}>{label}</label>
                <input id={name} name={name} type="number" defaultValue={value} className={inputClass} />
              </div>
            ))}
          </div>

          <div>
            <label htmlFor="feedback_language" className={labelClass}>{t("feedbackLanguage")}</label>
            <select id="feedback_language" name="feedback_language" defaultValue={settings.feedback_language} className={inputClass}>
              <option value="en">English</option>
              <option value="ar">العربية</option>
              <option value="both">{t("both")}</option>
            </select>
          </div>

          <div>
            <label htmlFor="instructions" className={labelClass}>{t("instructions")}</label>
            <textarea id="instructions" name="default_instructions" rows={4} defaultValue={settings.default_instructions} className={inputClass} />
            <p className="mt-1 text-xs text-muted-foreground">{t("guardNote")}</p>
          </div>

          <button type="submit" disabled={pending} className={buttonPrimary}>{t("save")}</button>
        </form>
      </Card>

      <Card>
        <CardHeader title={t("queue")} description={t("queueHint")} />
        <div className="space-y-4 p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            {(["queued", "graded", "failed"] as const).map((key) => (
              <div key={key} className="rounded-xl border border-border p-4">
                <p className="font-mono text-xs uppercase text-muted-foreground">{t(`${key}Label`)}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{health[key]}</p>
              </div>
            ))}
          </div>
          <form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); data.set("locale", locale); act(() => gradeQueuedAction(data)); }}>
            <button type="submit" disabled={pending || health.queued === 0} className={buttonSecondary}>{t("gradeQueued")}</button>
          </form>
          {health.failedSubmissions.length > 0 ? (
            <ul className="divide-y divide-border">
              {health.failedSubmissions.map((row) => (
                <li key={row.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                  <span className="min-w-0 flex-1 truncate">{row.assignment}</span>
                  <span className="truncate text-xs text-muted-foreground">{row.reason}</span>
                  <form onSubmit={(event) => {
                    event.preventDefault();
                    const data = new FormData(event.currentTarget);
                    data.set("locale", locale);
                    act(() => regradeSubmissionAction(data));
                  }}>
                    <input type="hidden" name="submission_id" value={row.id} />
                    <button type="submit" disabled={pending} className={buttonSecondary}>{t("regrade")}</button>
                  </form>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-foreground">{t("noFailures")}</p>}
        </div>
      </Card>

      <Card>
        <CardHeader title={t("overrides")} description={t("overridesHint")} />
        <div className="p-5">
          {health.overrides.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noOverrides")}</p>
          ) : (
            <ul className="divide-y divide-border">
              {health.overrides.map((row) => (
                <li key={row.assignment_id} className="flex flex-wrap items-center gap-3 py-2">
                  <span className="min-w-0 flex-1 truncate text-sm">{row.assignments?.title ?? row.assignment_id}</span>
                  <form onSubmit={(event) => {
                    event.preventDefault();
                    const data = new FormData(event.currentTarget);
                    data.set("locale", locale);
                    act(() => setAssignmentAi(data));
                  }}>
                    <input type="hidden" name="assignment_id" value={row.assignment_id} />
                    <input type="hidden" name="enabled" value={row.enabled ? "off" : "on"} />
                    <button type="submit" disabled={pending} className={buttonSecondary}>
                      {row.enabled ? t("disable") : t("enable")}
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      {error ? <Alert>{error}</Alert> : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}
    </div>
  );
}
