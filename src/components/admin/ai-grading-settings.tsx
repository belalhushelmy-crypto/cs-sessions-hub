"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { fetchAiModels, saveAiGradingSettings } from "@/actions/ai-settings";
import {
  Alert,
  Card,
  CardHeader,
  buttonPrimary,
  buttonSecondary,
  inputClass,
  labelClass,
} from "@/components/ui";

type ModelOption = { id: string; label: string };

export function AiGradingSettings({
  locale,
  currentModel,
  hasKey,
}: {
  locale: string;
  currentModel: string;
  hasKey: boolean;
}) {
  const t = useTranslations("aiGrading");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [apiKey, setApiKey] = useState("");
  const [models, setModels] = useState<ModelOption[]>([]);
  const [selected, setSelected] = useState(currentModel);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function loadModels() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await fetchAiModels(apiKey);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setModels(result.models);
      if (!result.models.some((model) => model.id === currentModel)) {
        setSelected(result.models[0]?.id ?? "");
      }
    });
  }

  function save() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await saveAiGradingSettings({ locale, apiKey, model: selected });
      if (!result.ok) {
        setError(result.error ?? t("errors.saveFailed"));
        return;
      }
      setApiKey("");
      setMessage(t("saved"));
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader title={t("title")} description={t("subtitle")} />
      <div className="space-y-4 p-5">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {hasKey ? t("keyConfigured", { model: currentModel }) : t("keyMissing")}
        </p>

        <div>
          <label htmlFor="ai-api-key" className={labelClass}>
            {t("apiKeyLabel")}
          </label>
          <input
            id="ai-api-key"
            type="password"
            autoComplete="off"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder={hasKey ? t("apiKeyKeep") : t("apiKeyPlaceholder")}
            className={inputClass}
          />
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            {t("apiKeyHint")}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={loadModels}
            disabled={pending || !apiKey.trim()}
            className={buttonSecondary}
          >
            {t("fetchModels")}
          </button>
        </div>

        <div>
          <label htmlFor="ai-model" className={labelClass}>
            {t("modelLabel")}
          </label>
          <select
            id="ai-model"
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
            className={inputClass}
          >
            {models.length === 0 ? (
              <option value={currentModel}>{currentModel || t("noModel")}</option>
            ) : (
              models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.label} ({model.id})
                </option>
              ))
            )}
          </select>
        </div>

        {error ? <Alert>{error}</Alert> : null}
        {message ? <Alert tone="success">{message}</Alert> : null}

        <button
          type="button"
          onClick={save}
          disabled={pending || !selected}
          className={buttonPrimary}
        >
          {t("save")}
        </button>
      </div>
    </Card>
  );
}
