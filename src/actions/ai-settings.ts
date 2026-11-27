"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/auth";
import { toLocale } from "@/lib/locale";
import { createAdminClient } from "@/lib/supabase/admin";
import { idSchema } from "@/lib/validation";
import { gradePendingForAssignment, gradeSubmissionById } from "@/lib/grading/service";

type ModelOption = { id: string; label: string };

async function isAdmin(): Promise<boolean> {
  const profile = await getCurrentProfile();
  return profile?.role === "admin";
}

const settingsSchema = z.object({
  auto_grade: z.boolean(),
  model: z.string().trim().min(1).max(120),
  mock_mode: z.boolean(),
  max_attempts: z.coerce.number().int().min(1).max(10),
  upload_rate_limit: z.coerce.number().int().min(1).max(100),
  timeout_seconds: z.coerce.number().int().min(5).max(120),
  retry_attempts: z.coerce.number().int().min(1).max(5),
  feedback_language: z.enum(["en", "ar", "both"]),
  default_instructions: z.string().trim().max(4000),
});

export async function getAiSettings() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("ai_settings")
    .select("*")
    .eq("id", true)
    .maybeSingle();
  return {
    ...(data ?? {}),
    apiKeyConfigured: Boolean((process.env.GEMINI_API_KEY ?? "").trim() || data?.api_key),
  };
}

export async function getAiHealth() {
  const admin = createAdminClient();
  const { data: submissions } = await admin
    .from("submissions")
    .select("id, status, grading_error, assignments(title)")
    .order("created_at", { ascending: false })
    .limit(200);
  const rows = submissions ?? [];
  const count = (status: string) => rows.filter((row) => row.status === status).length;
  const failed = rows.filter((row) => Boolean(row.grading_error)).slice(0, 8);
  const { data: overrides } = await admin
    .from("ai_assignment_overrides")
    .select("assignment_id, enabled, assignments(title)");
  return {
    queued: count("pending"),
    graded: count("graded"),
    failed: count("flagged"),
    failedReasons: failed.map((row) => row.grading_error ?? ""),
    failedSubmissions: failed.map((row) => ({
      id: row.id,
      assignment: (row.assignments as { title?: string } | null)?.title ?? row.id,
      reason: (row.grading_error ?? "").slice(0, 120),
    })),
    overrides: (overrides ?? []) as unknown as Array<{
      assignment_id: string;
      enabled: boolean;
      assignments: { title: string } | null;
    }>,
  };
}

/** Model list for the key the admin supplies; the key is never stored by this action. */
export async function fetchAiModels(
  apiKey: string,
): Promise<{ ok: true; models: ModelOption[] } | { ok: false; error: string }> {
  const t = await getTranslations("aiGrading");
  if (!(await isAdmin())) return { ok: false, error: t("errors.forbidden") };
  const key = apiKey.trim();
  if (!key) return { ok: false, error: t("errors.missingKey") };
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?pageSize=100&key=${encodeURIComponent(key)}`,
      { cache: "no-store", signal: AbortSignal.timeout(15_000) },
    );
    if (!response.ok) {
      return { ok: false, error: t("errors.fetchFailed", { status: response.status }) };
    }
    const data = (await response.json()) as {
      models?: Array<{ name?: string; displayName?: string; supportedGenerationMethods?: string[] }>;
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

export async function saveAiSettings(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const locale = toLocale(formData.get("locale"));
  const t = await getTranslations({ locale, namespace: "aiGrading" });
  const profile = await getCurrentProfile();
  if (profile?.role !== "admin") return { ok: false, error: t("errors.forbidden") };

  const parsed = settingsSchema.safeParse({
    auto_grade: formData.get("auto_grade") === "on",
    model: formData.get("model"),
    mock_mode: formData.get("mock_mode") === "on",
    max_attempts: formData.get("max_attempts") ?? 3,
    upload_rate_limit: formData.get("upload_rate_limit") ?? 5,
    timeout_seconds: formData.get("timeout_seconds") ?? 25,
    retry_attempts: formData.get("retry_attempts") ?? 3,
    feedback_language: formData.get("feedback_language") ?? "both",
    default_instructions: formData.get("default_instructions") ?? "",
  });
  if (!parsed.success) return { ok: false, error: t("errors.invalid") };

  const { error } = await createAdminClient()
    .from("ai_settings")
    .update({ ...parsed.data, updated_by: profile.id, updated_at: new Date().toISOString() })
    .eq("id", true);
  if (error) {
    console.error("AI settings save failed:", error.message);
    return { ok: false, error: t("errors.saveFailed") };
  }
  revalidatePath(`/${locale}/admin/ai-grading`);
  revalidatePath(`/${locale}/admin/assignments`);
  return { ok: true };
}

export async function setAssignmentAi(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const locale = toLocale(formData.get("locale"));
  const t = await getTranslations({ locale, namespace: "aiGrading" });
  if (!(await isAdmin())) return { ok: false, error: t("errors.forbidden") };
  const id = idSchema.safeParse(formData.get("assignment_id"));
  if (!id.success) return { ok: false, error: t("errors.invalid") };
  const { error } = await createAdminClient()
    .from("ai_assignment_overrides")
    .upsert({ assignment_id: id.data, enabled: formData.get("enabled") === "on", updated_at: new Date().toISOString() });
  if (error) return { ok: false, error: t("errors.saveFailed") };
  revalidatePath(`/${locale}/admin/ai-grading`);
  return { ok: true };
}

export async function gradeQueuedAction(formData: FormData): Promise<{ ok: boolean; error?: string; message?: string }> {
  const locale = toLocale(formData.get("locale"));
  const t = await getTranslations({ locale, namespace: "aiGrading" });
  if (!(await isAdmin())) return { ok: false, error: t("errors.forbidden") };
  const admin = createAdminClient();
  const { data: assignments } = await admin.from("assignments").select("id");
  let graded = 0;
  for (const assignment of assignments ?? []) {
    const result = await gradePendingForAssignment(assignment.id, 3);
    graded += result.graded;
  }
  revalidatePath(`/${locale}/admin/ai-grading`);
  revalidatePath(`/${locale}/admin/assignments`);
  return { ok: true, message: t("graded", { count: graded }) };
}

export async function regradeSubmissionAction(formData: FormData): Promise<{ ok: boolean; error?: string; message?: string }> {
  const locale = toLocale(formData.get("locale"));
  const t = await getTranslations({ locale, namespace: "aiGrading" });
  if (!(await isAdmin())) return { ok: false, error: t("errors.forbidden") };
  const id = idSchema.safeParse(formData.get("submission_id"));
  if (!id.success) return { ok: false, error: t("errors.invalid") };
  const result = await gradeSubmissionById(id.data, { force: true });
  revalidatePath(`/${locale}/admin/ai-grading`);
  return result.ok
    ? { ok: true, message: t("regraded") }
    : { ok: false, error: t("errors.saveFailed") };
}
