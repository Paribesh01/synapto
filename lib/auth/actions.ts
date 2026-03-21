"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export async function loginWithEmailPassword(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  console.log("Login started", email, password);
  if (!email || !password) {
    console.log("Email or password is empty");
    return { ok: false, error: "Email and password are required." };
  }
  console.log("Calling Better Auth API");
  // Better Auth API call (email/password)
  const result = await auth.api.signInEmail({
    headers: await headers(),
    body: { email, password },
  });
  
  console.log("Better Auth result:", result);

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


