import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/lib/types";
import type { AppLocale } from "@/i18n/routing";

export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, username, student_code, full_name, display_name, role, opted_out_of_leaderboard, created_at",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) return null;
  return data as Profile;
});

export async function requireProfile(locale: AppLocale): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect(`/${locale}/login`);
  return profile;
}

export async function requireAdmin(locale: AppLocale): Promise<Profile> {
  const profile = await requireProfile(locale);
  if (profile.role !== "admin") redirect(`/${locale}/dashboard`);
  return profile;
}

/** Admin OR teacher. Use for all teaching/staff areas. */
export async function requireStaff(locale: AppLocale): Promise<Profile> {
  const profile = await requireProfile(locale);
  if (profile.role === "student") redirect(`/${locale}/dashboard`);
  return profile;
}

/** Backwards-compatible alias for callers that used requireTeacher. */
export async function requireTeacher(locale: AppLocale): Promise<Profile> {
  return requireStaff(locale);
}

export function homePath(locale: AppLocale, role: UserRole): string {
  if (role === "admin") return `/${locale}/admin`;
  if (role === "teacher") return `/${locale}/admin`;
  return `/${locale}/dashboard`;
}
