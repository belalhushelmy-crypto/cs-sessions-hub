#!/usr/bin/env node
/**
 * CS Sessions Hub — create the first staff account in a fresh database.
 *
 * Unlike scripts/seed.mjs this adds NO demo data: just one confirmed admin
 * with a real email address (so password reset and OTP email work).
 *
 * Usage:
 *   ADMIN_EMAIL=you@example.com ADMIN_USERNAME=admin ADMIN_PASSWORD='...' \
 *     node --env-file=.env.local scripts/create-admin.mjs
 *
 * Safe to re-run: if the email already exists it reports and exits.
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (server only).
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
const username = (process.env.ADMIN_USERNAME || "admin").trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD || "";
const fullName = (process.env.ADMIN_FULL_NAME || "CS Teacher").trim();

if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error("Set ADMIN_EMAIL to a real address (it receives password resets).");
  process.exit(1);
}
if (!/^[a-z0-9_]{3,20}$/.test(username)) {
  console.error("ADMIN_USERNAME must be 3-20 chars of a-z, 0-9 or _.");
  process.exit(1);
}
if (password.length < 8) {
  console.error("ADMIN_PASSWORD must be at least 8 characters.");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { data: existing, error: findError } = await admin
    .from("profiles")
    .select("id, username, role")
    .or(`email.eq.${email},username.eq.${username}`)
    .maybeSingle();

  if (findError) throw findError;
  if (existing) {
    console.log(`Account already exists: ${existing.username} (${existing.role}). Nothing to do.`);
    return;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: "admin" },
    user_metadata: { username, full_name: fullName, display_name: fullName },
  });
  if (error) throw new Error(`createUser: ${error.message}`);

  // Keep profiles.email in sync (login-by-email reads it).
  const { error: profileError } = await admin
    .from("profiles")
    .update({ role: "admin", email })
    .eq("id", data.user.id);
  if (profileError) throw profileError;

  const { data: profile } = await admin
    .from("profiles")
    .select("student_code")
    .eq("id", data.user.id)
    .single();

  console.log(`✓ admin created: ${username} (${email})${profile ? ` — ${profile.student_code}` : ""}`);
  console.log("Sign in at /en/login and change the password from Profile.");
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
