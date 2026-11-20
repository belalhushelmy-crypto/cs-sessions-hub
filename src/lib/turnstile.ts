import "server-only";

const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY;
const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstile(token: string | null): Promise<{ ok: boolean; error?: string }> {
  // If no secret key is configured, skip verification (dev mode)
  if (!TURNSTILE_SECRET_KEY) {
    console.warn("[Turnstile] Secret key not configured, skipping verification (dev mode)");
    return { ok: true };
  }

  if (!token) {
    return { ok: false, error: "Missing CAPTCHA token" };
  }

  try {
    const formData = new FormData();
    formData.append("secret", TURNSTILE_SECRET_KEY);
    formData.append("response", token);

    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      return { ok: true };
    }

    console.error("[Turnstile] Verification failed:", data["error-codes"]);
    return { ok: false, error: "CAPTCHA verification failed" };
  } catch (error) {
    console.error("[Turnstile] Verification error:", error);
    return { ok: false, error: "CAPTCHA verification error" };
  }
}

export function getTurnstileSiteKey(): string | undefined {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
}