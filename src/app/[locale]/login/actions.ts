"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { safeRedirectPath, toLocale } from "@/lib/locale";
import { loginSchema, normalizeUsername } from "@/lib/validation";

export async function loginAction(
  _previous: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  const locale = toLocale(formData.get("locale"));
  const t = await getTranslations({ locale, namespace: "auth" });

  const parsed = loginSchema.safeParse({
    username: normalizeUsername(String(formData.get("username") ?? "")),
    password: String(formData.get("password") ?? ""),
  });

  if (!parsed.success) {
    return { error: t("invalidCredentials") };
  }

  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for") ?? "local";
  const ip = forwarded.split(",")[0]?.trim() || "local";

  const limit = rateLimit(`login:${ip}:${parsed.data.username}`, 10, 60_000);
  if (!limit.ok) {
    return { error: t("tooManyAttempts") };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: `${parsed.data.username}@cshub.local`,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    return { error: t("invalidCredentials") };
  }

  const role = data.user.app_metadata?.role === "admin" ? "admin" : "student";
  const requested = safeRedirectPath(formData.get("next"), locale);
  const fallback = role === "admin" ? `/${locale}/admin` : `/${locale}/dashboard`;

  redirect(requested ?? fallback);
}
