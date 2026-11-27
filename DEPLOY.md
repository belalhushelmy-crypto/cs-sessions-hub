# Deploy runbook — Vercel + Supabase + Brevo

This is the exact order that works for this app. The app has no email code of
its own: **every email (signup code, password reset) is sent by Supabase Auth**,
so Brevo is wired in as Supabase's SMTP provider, not into Next.js.

```
Browser → Vercel (Next.js) → Supabase (Postgres + Auth + Storage)
                                   └─ SMTP → Brevo → student inbox
```

Accounts you need: GitHub, Vercel, Supabase, Brevo, Cloudflare (Turnstile).

---

## 1. Supabase project

1. <https://supabase.com/dashboard> → **New project**.
2. Name `cs-sessions-hub`, region **Frankfurt (eu-central-1)** (lowest latency
   to Egypt), generate a strong DB password and store it.
3. **Project Settings → API** — copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (**server only**)
4. **Project Settings → Database** — copy the connection string / password
   (needed only for CLI migrations).

## 2. Apply the database migrations

Nine files in `supabase/migrations/`, in filename order. They are idempotent, so
re-running is safe. Two options:

**A. Supabase CLI (recommended, repeatable)**

```bash
npx supabase login
npx supabase link --project-ref <project-ref>      # ref is in the project URL
npx supabase db push                                # applies all 9 in order
```

**B. SQL Editor** — paste and run each file in this order:

```
20260101000000_init.sql
20260101000100_reference_data.sql
20260201000000_phase2.sql
20260301000000_phase3.sql
20260401000000_phase4.sql
20260501000000_phase5.sql
20260601000000_phase6_attendance_teacher_role.sql
20260615000000_self_signup.sql
20260615000100_text_submission.sql
```

Then confirm **Storage** has a private bucket `submissions` (100 KB limit, created
by `init.sql`).

## 3. Auth settings (Supabase dashboard)

**Authentication → Providers → Email**

| Setting | Value | Why |
|---|---|---|
| Enable Email provider | ON | login + signup |
| Confirm email | **ON** | students must verify with the code |
| Allow new users to sign up | **ON** | self-signup is the point (README's "off" is outdated) |
| **Email OTP Length** | **8** | the verify screen has 8 boxes — 6 makes verification impossible |
| Secure email change | ON | default |

**Authentication → Providers → Email → SMTP Settings** → enable **Custom SMTP**
(see §4 for the values).

**Authentication → URL Configuration**

- Site URL: `https://<your-domain>` (production)
- Redirect URLs:
  ```
  http://localhost:3000/**
  https://*-<team>.vercel.app/**
  https://<your-domain>/**
  ```

**Authentication → Attack Protection** — keep the defaults (or tighten):
signup/OTP/resend limits. Turnstile already protects the forms.

**Authentication → Providers → Email → CAPTCHA** — **OFF**. Turnstile is
verified server-side by the app; enabling Supabase's own CAPTCHA would show a
second, unrendered challenge.

### Email templates

`Authentication → Emails`. The **Confirm signup** template *must* contain
`{{ .Token }}` — the default `{{ .ConfirmationURL }}` link cannot be typed into
the 8-box code screen.

Confirm signup (EN/AR):

```html
<div style="font-family:system-ui,sans-serif;max-width:520px;margin:auto;padding:24px">
  <h2 style="color:#0B3C6F;margin:0 0 8px">CS Sessions Hub</h2>
  <p style="margin:0 0 16px">كود تفعيل حسابك / Your verification code:</p>
  <p style="font-size:34px;letter-spacing:10px;font-weight:700;color:#0B3C6F;margin:0 0 16px">
    {{ .Token }}
  </p>
  <p style="margin:0 0 8px">الكود صالح لمدة ساعة. لو مش انت اللي طلبته، تجاهل الرسالة.</p>
  <p style="margin:0;color:#666">This code expires in one hour. If you didn't request it, ignore this email.</p>
</div>
```

Leave **Reset password** on `{{ .ConfirmationURL }}` (it is a link flow).
Set the sender name to `CS Sessions Hub` and reply-to to a mailbox you read.

## 4. Brevo as the SMTP sender

1. Create an account at <https://www.brevo.com> (free plan: **300 emails/day**).
2. **Senders, Domains & Dedicated IPs → Domains** → add your domain (e.g.
   `cshub.example.com`). Brevo gives you **DKIM** (and optionally DMARC/SPF)
   records — add them at your DNS provider and click **Authenticate**.
   - Without a custom domain you can only verify a single sender address
     (click the link Brevo emails you). Deliverability is much worse and some
     providers reject `@gmail.com` senders, so a domain is strongly preferred.
   - A `*.vercel.app` domain cannot be authenticated — buy/point a real domain
     (Vercel sells them, or use Cloudflare) if you want reliable delivery.
3. **Transactional → SMTP & API → SMTP** tab → note:
   - Host `smtp-relay.brevo.com`
   - Port `587` (STARTTLS) or `465` (SSL)
   - Login: the SMTP login shown there (often `xxxxxx@smtp-brevo.com`)
   - Password: generate an **SMTP key** (not your account password)
4. Paste those into Supabase **SMTP Settings**:

   | Supabase field | Value |
   |---|---|
   | Host | `smtp-relay.brevo.com` |
   | Port | `587` |
   | Username | Brevo SMTP login |
   | Password | Brevo SMTP key |
   | Sender email | an address on the authenticated domain |
   | Sender name | `CS Sessions Hub` |

5. Supabase caps auth emails at ~30/hour by default; raise it under
   **Authentication → Rate Limits** only if you expect a big signup burst.

## 5. Cloudflare Turnstile (required in production)

`verifyTurnstile()` **fails closed** in production: without keys, signup and
login are rejected.

1. <https://dash.cloudflare.com> → **Turnstile** → **Add widget**.
2. Hostnames: your production domain + `localhost` (for local dev).
3. Copy the **site key** → `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, **secret key** →
   `TURNSTILE_SECRET_KEY`.

## 6. Vercel

1. <https://vercel.com/new> → import `belalhushelmy-crypto/cs-sessions-hub`.
   Framework preset: **Next.js** (auto-detected). Node 20+ is fine.
2. **Environment Variables** (Production + Preview):

   | Name | Value | Notes |
   |---|---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` | public |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | public, RLS enforced |
   | `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | **sensitive** |
   | `NEXT_PUBLIC_SITE_URL` | `https://<domain>` | used in OTP redirect |
   | `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | `0x4AAA...` | public |
   | `TURNSTILE_SECRET_KEY` | `0x4AAA...` | **sensitive** |
   | `GEMINI_API_KEY` | `AIza...` | **sensitive**, optional |
   | `GEMINI_MODEL` | `gemini-2.5-flash` | optional |

3. **Deploy**. Then add the domain under **Settings → Domains** and set
   `NEXT_PUBLIC_SITE_URL` to that exact `https://` URL (redeploy after changing
   it, because `NEXT_PUBLIC_*` is baked in at build time).
4. Copy the production URL into Supabase **Site URL** + **Redirect URLs** (§3).

No `vercel.json` is needed.

## 7. Create the first admin

Never seed demo students into production. Create one confirmed admin:

```bash
cp .env.example .env.local        # fill URL + service role key
ADMIN_EMAIL=you@yourdomain.com \
ADMIN_USERNAME=admin \
ADMIN_PASSWORD='a-strong-password' \
node --env-file=.env.local scripts/create-admin.mjs
```

`ADMIN_EMAIL` must be a real mailbox: it is the only way to reset the password.
Sign in at `/en/login`, then change the password from **Profile**.

Students create their own accounts at `/en/signup` (or `/ar/signup`).

## 8. Smoke test (production)

1. `/en/signup` → real email → 8-digit code arrives from Brevo → verify → login.
2. Same in `/ar` (RTL).
3. Admin: create a session, open attendance, add a student ID.
4. Student: upload a `.cpp`, admin grades it (or leave `GEMINI_API_KEY` empty
   and grade manually).
5. `POST` a wrong code 5× — confirm rate limits and Turnstile behave.

## 9. Common failures

| Symptom | Cause |
|---|---|
| Code email never arrives | Brevo SMTP not saved, sender not authenticated, or Supabase email rate limit |
| Code is 6 digits but form has 8 boxes | **Email OTP Length** not set to 8 |
| Email links go to `localhost:3000` | `NEXT_PUBLIC_SITE_URL` wrong / not redeployed; Supabase Site URL wrong |
| Signup says "captcha not configured" | Turnstile keys missing in Vercel (production fails closed) |
| Redirect loop on `/login` | Supabase URL/anon key wrong, or cookies blocked by a proxy |
| `db push` rejects migrations | duplicate timestamps — already fixed (`..._text_submission` is now `20260615000100`) |

## 10. Ongoing edits

The repo is the source of truth: Vercel redeploys on every push to `main`.
Ask for a change, it gets made in this working copy, committed and pushed, and
Vercel builds it. Database changes ship as a new file in `supabase/migrations/`
and are applied with `npx supabase db push`.

Supabase free projects pause after ~7 days of inactivity — open the dashboard
occasionally, or upgrade to Pro for a class that runs all term.
