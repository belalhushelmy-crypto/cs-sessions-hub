"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  fileExtension,
  idSchema,
  isAllowedFile,
  MATERIAL_EXTENSIONS,
  MAX_MATERIAL_BYTES,
  mimeForExtension,
} from "@/lib/validation";

const materialSchema = z.object({
  session_id: idSchema,
  title: z.string().trim().min(1).max(160),
  kind: z.enum(["file", "link", "note"]),
  url: z.string().trim().url().max(2000).optional().nullable(),
  note_body: z.string().trim().max(4000).optional().nullable(),
  storage_path: z.string().trim().max(500).optional().nullable(),
  position: z.coerce.number().int().min(0).max(999).default(0),
  published: z.boolean().default(true),
});

const updateSchema = z.object({
  id: idSchema,
  title: z.string().trim().min(1).max(160),
  position: z.coerce.number().int().min(0).max(999),
  published: z.boolean(),
});

type Result = { ok: true } | { ok: false; error: string };
type PrepareResult =
  | { ok: true; path: string; token: string; contentType: string }
  | { ok: false; error: string };

async function staff() {
  const profile = await getCurrentProfile();
  return profile && (profile.role === "admin" || profile.role === "teacher")
    ? profile
    : null;
}

/** Signed URL so a 25 MB file goes straight to Supabase, not through Vercel. */
export async function prepareMaterialUpload(
  sessionId: string,
  name: string,
  size: number,
): Promise<PrepareResult> {
  const t = await getTranslations("materials");
  if (!(await staff())) return { ok: false, error: t("errors.forbidden") };
  if (
    !idSchema.safeParse(sessionId).success ||
    !isAllowedFile(name, MATERIAL_EXTENSIONS) ||
    !Number.isFinite(size) ||
    size <= 0 ||
    size > MAX_MATERIAL_BYTES
  ) {
    return { ok: false, error: t("errors.invalid") };
  }

  const safeName = name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 150);
  const path = `${sessionId}/${crypto.randomUUID()}-${safeName}`;
  const { data, error } = await createAdminClient()
    .storage.from("materials")
    .createSignedUploadUrl(path);
  if (error || !data) return { ok: false, error: t("errors.upload") };
  return {
    ok: true,
    path,
    token: data.token,
    contentType: mimeForExtension(fileExtension(name)),
  };
}

export async function saveMaterial(formData: FormData): Promise<Result> {
  const locale = String(formData.get("locale") ?? "en");
  const t = await getTranslations({ locale, namespace: "materials" });
  const profile = await staff();
  if (!profile) return { ok: false, error: t("errors.forbidden") };

  const parsed = materialSchema.safeParse({
    session_id: formData.get("session_id"),
    title: formData.get("title"),
    kind: formData.get("kind"),
    url: formData.get("url") || null,
    note_body: formData.get("note_body") || null,
    storage_path: formData.get("storage_path") || null,
    position: formData.get("position") ?? 0,
    published: formData.get("published") === "on",
  });
  if (!parsed.success) return { ok: false, error: t("errors.invalid") };
  const data = parsed.data;
  if (
    (data.kind === "link" && !data.url) ||
    (data.kind === "note" && !data.note_body) ||
    (data.kind === "file" && !data.storage_path?.startsWith(`${data.session_id}/`))
  ) {
    return { ok: false, error: t("errors.invalid") };
  }

  const { error } = await createAdminClient().from("session_materials").insert({
    session_id: data.session_id,
    title: data.title,
    kind: data.kind,
    url: data.url,
    storage_path: data.storage_path,
    storage_bucket: "materials",
    note_body: data.note_body,
    position: data.position,
    published: data.published,
    created_by: profile.id,
  });
  if (error) return { ok: false, error: t("errors.save") };

  revalidatePath(`/${locale}/admin/sessions/${data.session_id}`);
  revalidatePath(`/${locale}/sessions/${data.session_id}`);
  revalidatePath(`/${locale}/sessions`);
  return { ok: true };
}

export async function updateMaterial(formData: FormData): Promise<Result> {
  const locale = String(formData.get("locale") ?? "en");
  const t = await getTranslations({ locale, namespace: "materials" });
  if (!(await staff())) return { ok: false, error: t("errors.forbidden") };

  const parsed = updateSchema.safeParse({
    id: formData.get("id"),
    title: formData.get("title"),
    position: formData.get("position") ?? 0,
    published: formData.get("published") === "on",
  });
  if (!parsed.success) return { ok: false, error: t("errors.invalid") };

  const { data: row } = await createAdminClient()
    .from("session_materials")
    .select("session_id")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (!row) return { ok: false, error: t("errors.notFound") };

  const { error } = await createAdminClient()
    .from("session_materials")
    .update({
      title: parsed.data.title,
      position: parsed.data.position,
      published: parsed.data.published,
    })
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: t("errors.save") };

  revalidatePath(`/${locale}/admin/sessions/${row.session_id}`);
  revalidatePath(`/${locale}/sessions/${row.session_id}`);
  revalidatePath(`/${locale}/sessions`);
  return { ok: true };
}

export async function deleteMaterial(formData: FormData): Promise<Result> {
  const locale = String(formData.get("locale") ?? "en");
  const t = await getTranslations({ locale, namespace: "materials" });
  if (!(await staff())) return { ok: false, error: t("errors.forbidden") };
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { ok: false, error: t("errors.invalid") };

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("session_materials")
    .select("session_id, storage_path, storage_bucket")
    .eq("id", id.data)
    .maybeSingle();
  if (!row) return { ok: false, error: t("errors.notFound") };

  if (row.storage_path) {
    await admin.storage.from(row.storage_bucket).remove([row.storage_path]);
  }
  const { error } = await admin.from("session_materials").delete().eq("id", id.data);
  if (error) return { ok: false, error: t("errors.save") };

  revalidatePath(`/${locale}/admin/sessions/${row.session_id}`);
  revalidatePath(`/${locale}/sessions/${row.session_id}`);
  return { ok: true };
}

/** Students only get a signed URL for a published material, server-checked. */
export async function getMaterialUrl(
  materialId: string,
): Promise<Result & { url?: string; kind?: "file" | "link" | "note"; title?: string }> {
  const t = await getTranslations("materials");
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false, error: t("errors.forbidden") };
  if (!idSchema.safeParse(materialId).success) {
    return { ok: false, error: t("errors.notFound") };
  }

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("session_materials")
    .select("id, title, kind, url, storage_path, storage_bucket, published")
    .eq("id", materialId)
    .maybeSingle();
  if (!row) return { ok: false, error: t("errors.notFound") };

  const isStaffUser = profile.role === "admin" || profile.role === "teacher";
  if (!row.published && !isStaffUser) {
    return { ok: false, error: t("errors.notFound") };
  }

  if (row.kind === "link") {
    return { ok: true, url: row.url ?? undefined, kind: "link", title: row.title };
  }
  if (row.kind === "file" && row.storage_path) {
    const { data, error } = await admin.storage
      .from(row.storage_bucket)
      .createSignedUrl(row.storage_path, 600);
    if (error || !data) return { ok: false, error: t("errors.upload") };
    return { ok: true, url: data.signedUrl, kind: "file", title: row.title };
  }
  return { ok: true, kind: "note", title: row.title };
}
