"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signInAction, signUpAction, type AuthActionState } from "@/src/app-actions/auth";
import { PageFrame } from "@/src/components/page-frame";

type AuthFormProps = {
  mode: "login" | "register";
};

const copy = {
  login: {
    title: "Welcome back",
    description: "Sign in to continue to your notes.",
    submit: "Sign in",
    switchPrompt: "Don't have an account?",
    switchLabel: "Create an account",
    switchHref: "/register",
    passwordAutocomplete: "current-password",
  },
  register: {
    title: "Create your account",
    description: "Use your email address and a password to get started.",
    submit: "Create account",
    switchPrompt: "Already have an account?",
    switchLabel: "Sign in",
    switchHref: "/login",
    passwordAutocomplete: "new-password",
  },
} as const;

export function AuthForm({ mode }: AuthFormProps) {
  const content = copy[mode];
  const action = mode === "login" ? signInAction : signUpAction;
  const [state, formAction, pending] = useActionState<AuthActionState, FormData>(action, {});

  return (
    <PageFrame area="PUBLIC AREA" className="auth-page-frame">
      <section className="page-card auth-card" aria-labelledby="auth-title">
        <h1 id="auth-title">{content.title}</h1>
        <p className="page-description">{content.description}</p>

        <form action={formAction} className="auth-form">
          <div className="auth-field">
            <label htmlFor="email">Email</label>
            <input autoComplete="email" id="email" name="email" required type="email" />
          </div>

          <div className="auth-field">
            <label htmlFor="password">Password</label>
            <input
              autoComplete={content.passwordAutocomplete}
              id="password"
              maxLength={128}
              minLength={8}
              name="password"
              required
              type="password"
            />
          </div>

          {state.error && (
            <p className="auth-error" id="auth-error" role="alert">
              {state.error}
            </p>
          )}

          <button className="auth-submit" disabled={pending} type="submit">
            {pending ? "Please wait…" : content.submit}
          </button>
        </form>

        <p className="auth-switch">
          {content.switchPrompt} <Link href={content.switchHref}>{content.switchLabel}</Link>
        </p>
      </section>
    </PageFrame>
  );
}
