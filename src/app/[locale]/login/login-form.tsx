"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { loginAction } from "./actions";
import { Alert, inputClass, labelClass } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export function LoginForm({ locale, next }: { locale: string; next?: string }) {
  const t = useTranslations("auth");
  const [state, formAction] = useActionState(loginAction, { error: null });

  return (
    <form action={formAction} className="mt-8 space-y-4">
      <input type="hidden" name="locale" value={locale} />
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <div>
        <label htmlFor="username" className={labelClass}>
          {t("username")}
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
          maxLength={64}
          placeholder={t("usernamePlaceholder")}
          className={inputClass}
        />
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

      {state.error ? <Alert>{state.error}</Alert> : null}

      <SubmitButton
        idle={t("signIn")}
        pendingLabel={t("signingIn")}
        className="w-full"
      />
    </form>
  );
}
