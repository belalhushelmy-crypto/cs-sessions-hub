"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { turnstileSiteKey } from "@/lib/env-client";

const getTurnstileSiteKey = () => turnstileSiteKey();

interface TurnstileWidgetProps {
  onVerify: (token: string | null) => void;
  theme?: "light" | "dark" | "auto";
  language?: string;
  disabled?: boolean;
}

interface TurnstileWindow extends Window {
  turnstile?: {
    render: (container: HTMLElement, options: {
      sitekey: string;
      theme?: string;
      language?: string;
      callback?: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: (error: unknown) => void;
    }) => number;
    remove: (widgetId: number) => void;
  };
}

export function TurnstileWidget({
  onVerify,
  theme = "auto",
  language,
  disabled = false,
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(false);

  // Determine theme based on dark mode
  const getTheme = useCallback(() => {
    if (theme !== "auto") return theme;
    if (typeof window === "undefined") return "light";
    return document.documentElement.classList.contains("dark") ? "dark" : "light";
  }, [theme]);

  // Determine language from locale
  const getLanguage = useCallback(() => {
    if (language) return language;
    if (typeof window === "undefined") return "en";
    const htmlLang = document.documentElement.lang;
    return htmlLang === "ar" ? "ar" : "en";
  }, [language]);

  const getWin = useCallback((): TurnstileWindow | undefined => {
    if (typeof window === "undefined") return undefined;
    return window as TurnstileWindow;
  }, []);

  const getThemeValue = useCallback(() => getTheme(), [theme]);
  const getLanguageValue = useCallback(() => getLanguage(), [language]);

  useEffect(() => {
    mountedRef.current = true;

    const siteKey = getTurnstileSiteKey();
    if (!siteKey || disabled) {
      if (siteKey) {
        console.warn("[Turnstile] Widget disabled");
      } else {
        console.warn("[Turnstile] Site key not configured, skipping widget (dev mode)");
      }
      return;
    }

    const win = getWin();
    if (!win || !win.turnstile) {
      console.warn("[Turnstile] Turnstile script not loaded");
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    // Clear any existing widget
    if (widgetIdRef.current !== null) {
      try {
        win.turnstile?.remove(widgetIdRef.current);
      } catch {
        // ignore
      }
      widgetIdRef.current = null;
    }

    // Render the widget explicitly
    try {
      widgetIdRef.current = win.turnstile?.render(container, {
        sitekey: siteKey,
        theme: getThemeValue(),
        language: getLanguageValue(),
        callback: (token: string) => {
          if (mountedRef.current) {
            setToken(token);
            setError(null);
            onVerify(token);
          }
        },
        "expired-callback": () => {
          if (mountedRef.current) {
            setToken(null);
            onVerify(null);
          }
        },
        "error-callback": (err: unknown) => {
          if (mountedRef.current) {
            const message = err instanceof Error ? err.message : "CAPTCHA error";
            setError(message);
            setToken(null);
            onVerify(null);
          }
        },
      });
    } catch (err) {
      console.error("[Turnstile] Render error:", err);
      setError(err instanceof Error ? err.message : "Failed to render CAPTCHA");
    }
  }, [turnstileSiteKey, disabled, theme, language, getTheme, getLanguage, onVerify, getWin]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      const win = getWin();
      if (widgetIdRef.current !== null && win?.turnstile) {
        try {
          win.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore
        }
        widgetIdRef.current = null;
      }
    };
  }, [getWin]);

  // Reset widget when theme changes
  useEffect(() => {
    const siteKey = getTurnstileSiteKey();
    if (!siteKey || disabled || widgetIdRef.current === null) return;
    const win = getWin();
    if (!win?.turnstile) return;

    try {
      win.turnstile.remove(widgetIdRef.current);
      widgetIdRef.current = win.turnstile.render(containerRef.current!, {
        sitekey: siteKey,
        theme: getThemeValue(),
        language: getLanguageValue(),
        callback: (token: string) => {
          if (mountedRef.current) {
            setToken(token);
            setError(null);
            onVerify(token);
          }
        },
        "expired-callback": () => {
          if (mountedRef.current) {
            setToken(null);
            onVerify(null);
          }
        },
        "error-callback": (err: unknown) => {
          if (mountedRef.current) {
            const message = err instanceof Error ? err.message : "CAPTCHA error";
            setError(message);
            setToken(null);
            onVerify(null);
          }
        },
      });
    } catch (err) {
      console.error("[Turnstile] Theme change re-render error:", err);
    }
  }, [theme, language]);

  const siteKey = getTurnstileSiteKey();
  if (!siteKey || disabled) {
    return (
      <div
        ref={containerRef}
        className="hidden"
        aria-hidden="true"
        style={{ width: 0, height: 0, overflow: "hidden" }}
      />
    );
  }

  return (
    <div>
      <div ref={containerRef} className="cf-turnstile" />
      {error && (
        <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

// Hook to load Turnstile script once
export function useTurnstileScript() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (document.getElementById("turnstile-script")) return;

    const script = document.createElement("script");
    script.id = "turnstile-script";
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    return () => {
      const existing = document.getElementById("turnstile-script");
      if (existing) existing.remove();
    };
  }, []);
}