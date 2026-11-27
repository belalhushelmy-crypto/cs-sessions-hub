"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/auth";
import { toLocale } from "@/lib/locale";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ChangeRoleState } from "@/lib/types";

const changeRoleSchema = z.object({
  student_id: z.string().uuid(),
  role: z.enum(["student", "teacher", "admin"]),
});

export async function changeRoleAction(
  _previous: ChangeRoleState,
  formData: FormData,
): Promise<ChangeRoleState> {
  const locale = toLocale(formData.get("locale"));
  const t = await getTranslations({ locale, namespace: "admin.roles" });

  const current = await getCurrentProfile();
  if (current?.role !== "admin") {
    return { status: "error", error: t("errors.forbidden") };
  }

  const parsed = changeRoleSchema.safeParse({
    student_id: String(formData.get("student_id") ?? ""),
    role: String(formData.get("role") ?? ""),
  });
  if (!parsed.success) {
    return { status: "error", error: t("errors.invalid") };
  }

  const { student_id, role } = parsed.data;
  if (student_id === current.id) {
    return { status: "error", error: t("errors.self") };
  }

  const admin = createAdminClient();
  const { data: lookup, error: userError } = await admin.auth.admin.getUserById(student_id);
  const user = lookup?.user;
  if (userError || !user) {
    return { status: "error", error: t("errors.generic") };
  }

  // Keep app_metadata.role in sync: login uses it to pick the landing page.
  const { error: authError } = await admin.auth.admin.updateUserById(student_id, {
    app_metadata: { ...(user.app_metadata ?? {}), role },
  });
  if (authError) {
    return { status: "error", error: t("errors.generic") };
  }

  // profiles.role is the source of truth for middleware, nav and RLS helpers.
  const { error: profileError } = await admin
    .from("profiles")
    .update({ role })
    .eq("id", student_id);
  if (profileError) {
    return { status: "error", error: t("errors.generic") };
  }

  revalidatePath(`/${locale}/admin/roles`);
  revalidatePath(`/${locale}/admin/students`);
  revalidatePath(`/${locale}/dashboard`);
  return { status: "success", message: t("saved") };
}
