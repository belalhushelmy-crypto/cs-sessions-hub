import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { toLocale } from "@/lib/locale";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, locale } = body;
    const localeStr = toLocale(locale);

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const supabase = await createClient();

    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/${localeStr}/verify-email`,
      },
    });

    if (error) {
      console.error("resend-otp error:", error.message);
      return NextResponse.json({ error: "Failed to resend code" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("resend-otp error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}