"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { getCurrentProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  idSchema,
  isAllowedFile,
  MAX_SESSION_FILE_BYTES,
  mimeForExtension,
  SESSION_FILE_EXTENSIONS,
  fileExtension,
} from "@/lib/validation";

export type SessionFileMeta = { name: string; size: number };
export type PreparedSessionUpload = SessionFileMeta & {
  path: string;
  token: string;
  contentType: string;
};

type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { data: T }))
  | { ok: false; error: string };

async function staffProfile() {
  const profile = await getCurrentProfile();
  return profile && (profile.role === "admin" || profile.role === "teacher")
    ? profile
    : null;
}

/** Creates signed upload URLs so large files go straight to Supabase Storage. */
export async function prepareSessionUploads(
  locale: string,
  sessionId: string,
  files: SessionFileMeta[],
): Promise<ActionResult<PreparedSessionUpload[]>> {
  const t = await getTranslations({ locale, namespace: "sessionFiles" });
  if (!(await staffProfile())) return { ok: false, error: t("errors.forbidden") };
  if (!idSchema.safeParse(sessionId).success || files.length === 0) {
    return { ok: false, error: t("errors.invalid") };
  }

  const admin = createAdminClient();
  const { data: session } = await admin
    .from("sessions")
    .select("id")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) return { ok: false, error: t("errors.notFound") };

  const uploads: PreparedSessionUpload[] = [];
  for (const file of files) {
    if (
      !isAllowedFile(file.name, SESSION_FILE_EXTENSIONS) ||
      !Number.isFinite(file.size) ||
      file.size <= 0 ||
      file.size > MAX_SESSION_FILE_BYTES
    ) {
      return { ok: false, error: t("errors.invalidFile") };
    }

    const name = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 150);
    const path = `${sessionId}/${crypto.randomUUID()}-${name}`;
    const { data, error } = await admin.storage
      .from("session-materials")
      .createSignedUploadUrl(path);
    if (error || !data) {
      console.error("session upload url failed:", error?.message);
      return { ok: false, error: t("errors.upload") };
    }
    uploads.push({
      path,
      token: data.token,
      name,
      size: file.size,
      contentType: mimeForExtension(fileExtension(file.name)),
    });
  }

  return { ok: true, data: uploads };
}

/** Records uploaded files against the session once the upload succeeded. */
export async function finalizeSessionUploads(
  locale: string,
  sessionId: string,
  files: PreparedSessionUpload[],
): Promise<ActionResult> {
  const t = await getTranslations({ locale, namespace: "sessionFiles" });
  const profile = await staffProfile();
  if (!profile) return { ok: false, error: t("errors.forbidden") };
  if (!idSchema.safeParse(sessionId).success || files.length === 0) {
    return { ok: false, error: t("errors.invalid") };
  }

  const admin = createAdminClient();
  const rows = files
    .filter(
      (file) =>
        file.path.startsWith(`${sessionId}/`) &&
        isAllowedFile(file.name, SESSION_FILE_EXTENSIONS) &&
        file.size > 0 &&
        file.size <= MAX_SESSION_FILE_BYTES,
    )
    .map((file) => ({
      session_id: sessionId,
      file_path: file.path,
      file_name: file.name,
      content_type: file.contentType,
      size_bytes: file.size,
      uploaded_by: profile.id,
    }));

  if (rows.length === 0) return { ok: false, error: t("errors.invalidFile") };

  const { error } = await admin
    .from("session_files")
    .upsert(rows, { onConflict: "file_path" });
  if (error) {
    console.error("session file save failed:", error.message);
    return { ok: false, error: t("errors.save") };
  }

  revalidatePath(`/${locale}/admin/sessions/${sessionId}`);
  revalidatePath(`/${locale}/attendance`);
  return { ok: true };
}

export async function deleteSessionFile(
  locale: string,
  fileId: string,
): Promise<ActionResult> {
  const t = await getTranslations({ locale, namespace: "sessionFiles" });
  if (!(await staffProfile())) return { ok: false, error: t("errors.forbidden") };
  if (!idSchema.safeParse(fileId).success) {
    return { ok: false, error: t("errors.invalid") };
  }

  const admin = createAdminClient();
  const { data: file } = await admin
    .from("session_files")
    .select("id, file_path, session_id")
    .eq("id", fileId)
    .maybeSingle();
  if (!file) return { ok: false, error: t("errors.notFound") };

  const { error: storageError } = await admin.storage
    .from("session-materials")
    .remove([file.file_path]);
  if (storageError) {
    console.error("session file delete failed:", storageError.message);
    return { ok: false, error: t("errors.upload") };
  }

  const { error } = await admin.from("session_files").delete().eq("id", fileId);
  if (error) {
    console.error("session file row delete failed:", error.message);
    return { ok: false, error: t("errors.save") };
  }

  revalidatePath(`/${locale}/admin/sessions/${file.session_id}`);
  revalidatePath(`/${locale}/attendance`);
  return { ok: true };
}
