"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { getCurrentProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

type ModelOption = { id: string; label: string };

async function isAdmin(): Promise<boolean> {
  const profile = await getCurrentProfile();
  return profile?.role === "admin";
}

/** Fetches the generateContent-capable models available to the given key. */
export async function fetchAiModels(
  apiKey: string,
): Promise<{ ok: true; models: ModelOption[] } | { ok: false; error: string }> {
  const t = await getTranslations("aiGrading");
  if (!(await isAdmin())) return { ok: false, error: t("errors.forbidden") };
  const key = apiKey.trim();
  if (!key) return { ok: false, error: t("errors.missingKey") };

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models?pageSize=100",
      {
        headers: { "x-goog-api-key": key },
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      },
    );
    if (!response.ok) {
      return { ok: false, error: t("errors.fetchFailed", { status: response.status }) };
    }
    const data = (await response.json()) as {
      models?: Array<{
        name?: string;
        displayName?: string;
        supportedGenerationMethods?: string[];
      }>;
    };
    const models = (data.models ?? [])
      .filter(
        (model) =>
          model.name?.startsWith("models/") &&
          model.supportedGenerationMethods?.includes("generateContent"),
      )
      .map((model) => ({
        id: (model.name ?? "").replace(/^models\//, ""),
        label: model.displayName || (model.name ?? "").replace(/^models\//, ""),
      }));
    if (models.length === 0) return { ok: false, error: t("errors.noModels") };
    return { ok: true, models };
  } catch (error) {
    console.error("model list failed:", error);
    return { ok: false, error: t("errors.fetchFailed", { status: "network" }) };
  }
}

export async function saveAiGradingSettings(payload: {
  locale: string;
  apiKey: string;
  model: string;
}): Promise<{ ok: boolean; error?: string }> {
  const t = await getTranslations({ locale: payload.locale, namespace: "aiGrading" });
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    return { ok: false, error: t("errors.forbidden") };
  }

  const model = payload.model.trim();
  const apiKey = payload.apiKey.trim();
  if (!model) return { ok: false, error: t("errors.missingModel") };

  const admin = createAdminClient();
  const { data: current } = await admin
    .from("ai_grading_settings")
    .select("api_key")
    .eq("id", true)
    .maybeSingle();

  const { error } = await admin
    .from("ai_grading_settings")
    .upsert({
      id: true,
      api_key: apiKey || current?.api_key || null,
      model,
      updated_by: profile.id,
      updated_at: new Date().toISOString(),
    });
  if (error) {
    console.error("AI settings save failed:", error.message);
    return { ok: false, error: t("errors.saveFailed") };
  }

  revalidatePath(`/${payload.locale}/admin/assignments`);
  revalidatePath(`/${payload.locale}/admin`);
  return { ok: true };
}
