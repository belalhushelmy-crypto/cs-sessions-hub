"use client";

import { useActionState, useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { verifyOtpAction } from "./actions";
import type { VerifyOtpState } from "@/lib/types";
import { Alert, inputClass } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import Link from "next/link";

const initialState: VerifyOtpState = { status: "idle" };

export function VerifyEmailForm({ locale, email }: { locale: string; email: string }) {
  const t = useTranslations("auth");
  const [state, formAction] = useActionState(verifyOtpAction, initialState);
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendError, setResendError] = useState<string | null>(null);

  function handleChange(index: number, value: string) {
    const newOtp = [...otp];
    newOtp[index] = value.slice(0, 1);
    setOtp(newOtp);

    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`) as HTMLInputElement | null;
      nextInput?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`) as HTMLInputElement | null;
      prevInput?.focus();
    } else if (e.key === "ArrowLeft" && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`) as HTMLInputElement | null;
      prevInput?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`) as HTMLInputElement | null;
      nextInput?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").slice(0, 6);
    if (/^\d{6}$/.test(pasted)) {
      const newOtp = pasted.split("");
      setOtp(newOtp);
      const lastInput = document.getElementById("otp-5") as HTMLInputElement | null;
      lastInput?.focus();
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const token = otp.join("");
    if (token.length !== 6) return;
    const formData = new FormData();
    formData.append("token", token);
    formData.append("email", email);
    formData.append("locale", locale);
    formAction(formData);
  }

  async function handleResend() {
    if (resendCooldown > 0) return;
    setResendError(null);
    try {
      const response = await fetch(`/api/auth/resend-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, locale }),
      });
      const data = await response.json();
      if (!response.ok) {
        setResendError(data.error ?? "Failed to resend code");
        return;
      }
      setResendCooldown(60);
      const interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch {
      setResendError("Failed to resend code");
    }
  }

  // Start cooldown on mount if needed
  useEffect(() => {
    const saved = sessionStorage.getItem(`resend_cooldown_${email}`);
    if (saved) {
      const remaining = Math.max(0, parseInt(saved, 10) - Math.floor((Date.now() - parseInt(sessionStorage.getItem(`resend_time_${email}`) ?? "0", 10)) / 1000));
      if (remaining > 0) {
        setResendCooldown(remaining);
        const interval = setInterval(() => {
          setResendCooldown((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    }
  }, [email]);

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="email" value={email} />

      <div className="flex gap-2" role="group" aria-label={t("otpLabel")}>
        {Array.from({ length: 6 }, (_, i) => (
          <input
            key={i}
            id={`otp-${i}`}
            type="text"
            inputMode="numeric"
            maxLength={1}
            pattern="[0-9]"
            autoComplete="one-time-code"
            value={otp[i]}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            onFocus={() => setFocusedIndex(i)}
            className={`${inputClass} w-10 h-12 text-center text-2xl font-mono`}
            aria-label={`${t("digit")} ${i + 1}`}
            required
          />
        ))}
      </div>

      {state.status === "error" ? <Alert>{state.error}</Alert> : null}

      <SubmitButton
        idle={t("verify")}
        pendingLabel={t("verifying")}
        className="w-full"
        disabled={otp.some((d) => !d)}
      />

      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={handleResend}
          disabled={resendCooldown > 0}
          className="text-sm font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 disabled:text-slate-400 dark:disabled:text-slate-500"
        >
          {resendCooldown > 0 ? t("resendCooldown", { seconds: resendCooldown }) : t("resendCode")}
        </button>
        {resendError && (
          <p className="mt-2 text-xs text-rose-600 dark:text-rose-400" role="alert">
            {resendError}
          </p>
        )}
      </div>

      <p className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">
        {t("verifyHelp")}
        <Link href={`/${locale}/login`} className="ml-1 font-semibold underline underline-offset-2 hover:no-underline">
          {t("backToLogin")}
        </Link>
      </p>
    </form>
  );
}