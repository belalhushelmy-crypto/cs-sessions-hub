"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { loginAction } from "./actions";
import { Alert, inputClass, labelClass } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { TurnstileWidget, useTurnstileScript } from "@/components/turnstile-widget";
import Link from "next/link";
import { turnstileSiteKey } from "@/lib/env-client";

export function LoginForm({ locale, next }: { locale: string; next?: string }) {
  const t = useTranslations("auth");
  const [state, formAction] = useActionState(loginAction, { error: null });
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileError, setTurnstileError] = useState<string | null>(null);

  useTurnstileScript();

  const handleTurnstileVerify = (token: string | null) => {
    setTurnstileToken(token);
    setTurnstileError(null);
  };

  return (
    <form action={formAction} className="mt-8 space-y-4">
      <input type="hidden" name="locale" value={locale} />
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <input type="hidden" name="turnstile_token" value={turnstileToken ?? ""} />

      <div>
        <label htmlFor="username" className={labelClass}>
          {t("usernameOrEmail")}
        </label>
        <input
          id="username"
          name="username"
          type="text"
          required
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          dir="ltr"
          maxLength={254}
          placeholder={t("usernameOrEmailPlaceholder")}
          className={inputClass}
        />
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
          {t("usernameOrEmailHint")}
        </p>
      </div>

      <div>
        <label htmlFor="password" className={labelClass}>
          {t("password")}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          dir="ltr"
          maxLength={200}
          placeholder={t("passwordPlaceholder")}
          className={inputClass}
        />
      </div>

      {/* Cloudflare Turnstile CAPTCHA */}
      <TurnstileWidget
        onVerify={handleTurnstileVerify}
        disabled={!turnstileSiteKey}
      />
      {turnstileError && (
        <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400" role="alert">
          {turnstileError}
        </p>
      )}

      {state.error ? <Alert>{state.error}</Alert> : null}

      <SubmitButton
        idle={t("signIn")}
        pendingLabel={t("signingIn")}
        className="w-full"
        disabled={Boolean(turnstileSiteKey) && !turnstileToken}
      />

      <p className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">
        {t("noAccount")}
        <Link href={`/${locale}/signup`} className="ml-1 font-semibold underline underline-offset-2 hover:no-underline">
          {t("signUp")}
        </Link>
      </p>
    </form>
  );
}
