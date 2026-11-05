"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/src/lib/auth";

export type AuthActionState = {
  error?: string;
};

function getFormString(formData: FormData, field: string) {
  const value = formData.get(field);
  return typeof value === "string" ? value.trim() : "";
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function signInAction(
  previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  void previousState;
  const email = getFormString(formData, "email").toLowerCase();
  const passwordValue = formData.get("password");
  const password = typeof passwordValue === "string" ? passwordValue : "";

  if (!isValidEmail(email) || password.length < 8 || password.length > 128) {
    return { error: "Enter a valid email address and password." };
  }

  try {
    await auth.api.signInEmail({
      body: { email, password },
    });
  } catch (error) {
    console.error("Better Auth sign-in failed", error);
    return { error: "We couldn't sign you in with those details." };
  }

  redirect("/notes");
}

export async function signUpAction(
  previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  void previousState;
  const email = getFormString(formData, "email").toLowerCase();
  const passwordValue = formData.get("password");
  const password = typeof passwordValue === "string" ? passwordValue : "";

  if (!isValidEmail(email) || password.length < 8 || password.length > 128) {
    return { error: "Enter a valid email address and a password of at least 8 characters." };
  }

  try {
    await auth.api.signUpEmail({
      body: { name: "", email, password },
    });
  } catch (error) {
    console.error("Better Auth sign-up failed", error);
    return { error: "We couldn't create your account. Check your details or try signing in." };
  }

  redirect("/notes");
}

export async function signOutAction() {
  await auth.api.signOut({
    headers: await headers(),
  });
  redirect("/login");
}
