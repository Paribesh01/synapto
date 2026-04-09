"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export async function loginWithEmailPassword(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) {
    return { ok: false, error: "Email and password are required." };
  }

  // Better Auth API call (email/password)
  await auth.api.signInEmail({
    headers: await headers(),
    body: { email, password },
  });

  redirect("/chat");
}

export async function registerWithEmailPassword(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "").trim();

  if (!email || !password) {
    return { ok: false, error: "Email and password are required." };
  }

  await auth.api.signUpEmail({
    headers: await headers(),
    body: { email, password, name: name ?? "" },
  });

  redirect("/chat");
}

export async function logout() {
  await auth.api.signOut({
    headers: await headers(),
  });
  redirect("/");
}


