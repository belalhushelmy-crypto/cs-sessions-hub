# HANDOFF — CS Sessions Hub (student self-signup work)

Generated 2026-11-20. Branch `feature/self-signup`, working tree **clean**.
Last commit `fa008d3 wip: self-signup, verification, turnstile fixes`; previous `24d5eac`.
`npx tsc --noEmit` passes; no dev server was running. **No secret values are included here.**

---
## 1. PROJECT

CS Sessions Hub is a bilingual (EN/AR, full RTL) class hub for C++ fundamentals:
attendance, assignments, AI feedback, points, badges and a privacy-safe leaderboard.

Stack: Next.js 15.5.29 (App Router, React 19.3, TypeScript strict), Supabase
(`@supabase/ssr` + Postgres/RLS/Storage), `next-intl` 4.15 (cookie locale, RTL),
Tailwind 4, zod, Google Gemini grading (`src/lib/grading/`), qrcode, sharp.

Layout:
```
src/app/[locale]/login | signup | verify-email   # public auth screens
src/app/[locale]/(app)/...                       # authenticated shell + pages
src/app/api/auth/resend-otp/route.ts             # only API route
src/actions/*                                    # server actions
src/components/                                  # UI, incl. turnstile-widget.tsx
src/lib/{auth,validation,rate-limit,turnstile,env,env-client,types}.ts
src/lib/supabase/{client,server,admin}.ts
src/middleware.ts                                # locale + role + verification gate
messages/{en,ar}.json (851 keys each) · supabase/migrations/ (9 files) · scripts/
```
I run `npm run dev` myself on port 3000. Do not start/restart it.

---
## 2. DECISIONS I MADE (must never be undone)

1. Teachers/admins record attendance by entering student IDs per session. Students
   cannot record attendance; they only see read-only attendance and points.
2. Roles come from `profiles.role` (`student`/`teacher`/`admin`) loaded on the server;
   nav differs per role; teacher routes are protected; teachers are excluded from the
   leaderboard.
3. Theme: Students for Egypt navy `#0B3C6F` and bronze `#B58A5B`, dark and light. No purple.
4. Logos: `public/brand/logo-dark-*` in dark mode, `logo-light-*` in light mode.
5. Assignments accept file upload, pasted code text, or both; one shared Gemini grading
   function; student code is treated as data, never executed.
6. Students self-register with a 6-digit email code; `student_code` (CS-XXXX) is
   auto-generated; role is always `student`; teachers/admins are created only by an admin;
   username login still works for old `@cshub.local` accounts.
7. i18n: no "." inside key names (nested objects only); every key in BOTH en.json and ar.json.

---
## 3. CURRENT STATE

Implemented (code present, typechecks):
- `/signup`: full name, username, email, password, confirm, show/hide password, honeypot
  `website`, hidden `turnstile_token`.
- `/verify-email`: six single-digit boxes, paste support, resend with 60 s client cooldown.
- Login accepts username OR email (looks up `profiles.email`), blocks unconfirmed emails
  except `@cshub.local`, redirects by role.
- `src/lib/turnstile.ts` server siteverify; reusable widget with explicit render,
  theme/language sync, script loader.
- Middleware gates unverified students; allows login/signup/verify.
- Existing screens untouched except `submit-button.tsx` gained a `disabled` prop.
- Messages parity: 851 EN keys, 851 AR keys, zero one-sided keys.

Half-done / unverified:
- Migration not confirmed applied (table below); Turnstile keys look like placeholders.
- End-to-end signup → code → login → dashboard never run; Supabase email template/SMTP
  not confirmed, so the OTP may not contain a code.
- Rate limiting for signup/verify/resend is **not implemented** (login only, in-memory).
- Teacher-role access is inconsistent (bugs §4.6).

Files in the last commit (`git status` empty; this is the WIP surface):
- `messages/en.json`, `messages/ar.json` — signup/verify/CAPTCHA/login copy (+62 each).
- `scripts/check-i18n-usage.cjs`, `.mjs` — i18n checkers; both fail `node --check`.
- `src/app/[locale]/login/actions.ts` — username-or-email login, rate limit, Turnstile, verification check.
- `src/app/[locale]/login/login-form.tsx` — Turnstile widget, hidden token, signup link.
- `src/app/[locale]/signup/actions.ts` — zod validation, honeypot, Turnstile, uniqueness checks, `signUp`, redirect.
- `src/app/[locale]/signup/page.tsx` — split-screen signup page.
- `src/app/[locale]/signup/signup-form.tsx` — form, honeypot, password toggle, Turnstile.
- `src/app/[locale]/verify-email/actions.ts` — `verifyOtp(type: 'signup')`, email sync, redirect to login.
- `src/app/[locale]/verify-email/page.tsx` — verify page shell.
- `src/app/[locale]/verify-email/verify-email-form.tsx` — OTP boxes, paste, resend cooldown.
- `src/app/api/auth/resend-otp/route.ts` — POST resend (no rate limit/CAPTCHA).
- `src/components/submit-button.tsx` — added `disabled` prop.
- `src/components/turnstile-widget.tsx` — explicit-render widget + script loader.
- `src/lib/env-client.ts` — client `turnstileSiteKey()` **function**.
- `src/lib/env.ts` — added server `turnstileSiteKey()` (buggy, §4.4).
- `src/lib/turnstile.ts` — Cloudflare siteverify; skips when secret absent.
- `src/lib/types.ts` — `SignupState`, `VerifyOtpState`, `SubmissionType`, `AllowedSubmissionTypes`.
- `src/lib/validation.ts` — `signupSchema`, `verifyOtpSchema`, `textSubmissionSchema`.
- `src/middleware.ts` — verification gate, allow signup/verify, teacher-aware role.
- `supabase/migrations/20260615000000_self_signup.sql` — email column, `rate_limits`, profile grants, teacher enum.

Migrations:

| File | Purpose | Run instruction |
|---|---|---|
| `20260101000000_init.sql` | schema, RLS, storage, `handle_new_user` | README: first |
| `20260101000100_reference_data.sql` | reference rows | README #2 |
| `20260201000000_phase2.sql` | sessions/attendance | README #3 |
| `20260301000000_phase3.sql` | grading queue/review | README #4 |
| `20260401000000_phase4.sql` | points/leaderboard/badges | README #5 |
| `20260501000000_phase5.sql` | announcements/analytics/similarity | README #6 |
| `20260601000000_phase6_attendance_teacher_role.sql` | teacher enum, attendance RLS | not in README — **confirm** |
| `20260615000000_text_submission.sql` | text/paste submissions | not in README — **confirm** |
| `20260615000000_self_signup.sql` | email, `rate_limits`, grants | I was told to run it — **not confirmed** |

`self_signup` and `text_submission` share version `20260615000000`; `supabase db push`
may reject duplicate versions or order them unpredictably. Confirm actual state in Supabase.

---
## 4. KNOWN BUGS / OPEN ISSUES

1. **Turnstile gating blocks buttons.** `env-client.ts` exports a *function*
   `turnstileSiteKey()`, used as a value: `login-form.tsx:74` / `signup-form.tsx:171`
   `disabled={!turnstileSiteKey}` is always false; `login-form.tsx:88`
   `Boolean(turnstileSiteKey) && !turnstileToken` and `signup-form.tsx:185`
   `disabled={!turnstileToken}` stay gated on a token that never arrives without a key.
   Fix: call once (`const siteKey = turnstileSiteKey();`), gate on `Boolean(siteKey) && !token`.
2. **Widget re-render loop risk.** The render effect depends on `onVerify`, and both forms
   pass a fresh inline `handleTurnstileVerify` (token callback → render → new function →
   widget re-rendered). Wrap in `useCallback` or drop from deps.
3. **No real Turnstile keys.** `.env.local` (gitignored) holds placeholder-looking
   `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`. `.env.example` lists
   neither, nor `NEXT_PUBLIC_SITE_URL` (used by signup and resend).
4. **`src/lib/env.ts` `turnstileSiteKey()` always undefined**: `publicSchema.safeParse`
   never receives `NEXT_PUBLIC_TURNSTILE_SITE_KEY`. Latent, since the widget uses the
   client helper.
5. **Missing i18n keys**: `auth.verified` and `auth.errors.invalidOrExpiredCode`
   (all other statically used keys exist in both locales). `auth.verified` is unreachable
   anyway because `redirect()` precedes the return.
6. **Teacher role inconsistent.** Middleware/nav treat `teacher` as staff, but every admin
   page except `/admin/attendance` calls `requireAdmin()` (redirects teachers to
   `/dashboard`). Login picks the redirect role from `app_metadata.role`, not `profiles.role`.
7. **Dead `/check-in`.** `src/app/[locale]/(app)/check-in/` is empty → 404, yet
   `admin/sessions/[id]/page.tsx` still builds a check-in URL + QR to it; the
   `checkInAction`, `mark_attendance` and `checkIn` messages remain. Conflicts with
   decision #1; choose remove or restore.
8. **Security gaps vs. plan**: signup has no rate limit; verify and `/api/auth/resend-otp`
   have neither rate limit nor Turnstile. `public.rate_limits` is created but **unused**.
9. **Verification depends on dashboard settings**: "Confirm email" ON, template must include
   `{{ .Token }}`, SMTP configured. README says sign-ups OFF (opposite of self-signup) and
   omits migrations 7–9 and the whole flow.
10. **Stale seed**: `scripts/seed.mjs` still says the username "was given to you by your
    teacher"; it seeds the teacher with `role: "admin"` (no teacher-role seed). Both i18n
    checkers (`.cjs`, `.mjs`) fail `node --check` with duplicate declarations — keep one, fix it.
11. **Supabase Auth CAPTCHA** should stay **off** because Turnstile is verified server-side;
    otherwise users face a second, unrendered challenge. Confirm.
12. `Profile` omits the new `profiles.email`, and login reads it via an untyped select; the
    signup duplicate check uses `profiles.email`, which is null until verification, so a
    duplicate in `auth.users` only surfaces as Supabase's generic `signUp` error.

---
## 5. ENVIRONMENT

Names only (never commit values; `.env.local` is gitignored):

| Name | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (client + server) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public key, RLS enforced |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only**: admin user creation/reset, grading writes |
| `GEMINI_API_KEY` | **server only**: assignment grading |
| `GEMINI_MODEL` | Gemini model id (default `gemini-2.5-flash`) |
| `GEMINI_MOCK` | dev-only deterministic grader |
| `SEED_ADMIN_PASSWORD` / `SEED_STUDENT_PASSWORD` | `npm run seed` only |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | browser Turnstile widget |
| `TURNSTILE_SECRET_KEY` | **server only**: Cloudflare siteverify |
| `NEXT_PUBLIC_SITE_URL` | absolute URL for OTP/resend redirects (undocumented) |

Supabase dashboard:
- Email provider: **Confirm email ON**, **Allow new users to sign up ON** (reverses README).
- Email template must include `{{ .Token }}`; configure custom SMTP for real delivery.
- URL Configuration: Site URL = production; redirect URLs incl. `http://localhost:3000/**`
  and Vercel domains.
- Auth → Attack Protection: sensible signup/OTP/resend limits.
- Auth CAPTCHA: **OFF** (Turnstile is ours, server-side).
- Storage: private `submissions` bucket (100 KB) from the init migration.

---
## 6. WORKING RULES FOR THE NEXT AGENT

- Do **not** start or restart the dev server; I run `npm run dev` myself.
- Do **not** run `npm run build` while it runs.
- Verify with `npx tsc --noEmit`; there is no lint script.
- Every DB change goes in a migration file **and** is shown to me as SQL.
- Never expose the service role or Gemini key to client code (no `NEXT_PUBLIC_`, no client imports).
- Touch only what the task needs; keep changes small, one feature at a time.
- Preserve EN/AR parity and the nested-key (no ".") rule.
- List every changed file at the end.

---
## 7. NEXT STEPS (prioritized)

1. Fix Turnstile gating (call `turnstileSiteKey()` once; allow submit when no key;
   stabilize `onVerify` with `useCallback`; reset widget after a failed submit).
2. Add real Turnstile keys, document them + `NEXT_PUBLIC_SITE_URL` in `.env.example`,
   set them in Vercel.
3. Apply/confirm `self_signup`, and confirm `phase6` + `text_submission`; resolve the
   duplicate `20260615000000` version.
4. Add `auth.verified` and `auth.errors.invalidOrExpiredCode` to both message files.
5. Add rate limiting + Turnstile to signup/verify/resend (DB table vs Upstash; `rate_limits` exists).
6. Make teacher access consistent (`requireAdmin` → `requireTeacher` on staff pages) and
   take the post-login role from `profiles.role`.
7. Decide `/check-in`: remove the dead URL/QR/action/messages, or restore the page
   (decision #1 says students must not record attendance).
8. Update README (self-signup, Turnstile, migrations, sign-ups ON), stale seed copy, and
   fix or delete one i18n checker; re-run and confirm parity.
9. E2E test: signup → code → verify → login (username and email) → dashboard; repeat in
    Arabic/RTL and as teacher/admin; confirm legacy `@cshub.local` accounts skip verification.
