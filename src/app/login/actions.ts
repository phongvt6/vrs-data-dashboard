"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, signSession } from "@/lib/session";

export type LoginState = { error?: string };

// Chỉ cho phép điều hướng nội bộ (chặn open-redirect).
function safeNext(next: string): string {
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  const next = safeNext(String(formData.get("next") ?? ""));

  const APP_PASSWORD = process.env.APP_PASSWORD;
  const AUTH_SECRET = process.env.AUTH_SECRET;
  if (!APP_PASSWORD || !AUTH_SECRET) {
    return { error: "Server chưa cấu hình APP_PASSWORD / AUTH_SECRET (xem .env.example)." };
  }
  if (password !== APP_PASSWORD) {
    return { error: "Mật khẩu không đúng." };
  }

  const token = await signSession(AUTH_SECRET);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 30 * 24 * 60 * 60, // 30 ngày
  });
  redirect(next);
}

export async function logoutAction(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/login");
}
