 import "server-only";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/src/lib/db";

function resolveAuthSecret() {
  const authSecret = process.env.AUTH_SECRET?.trim() || process.env.BETTER_AUTH_SECRET?.trim();

  if (!authSecret) {
    throw new Error(
      "Missing AUTH_SECRET (or BETTER_AUTH_SECRET). Set AUTH_SECRET in your environment.",
    );
  }

  return authSecret;
}

function resolveBaseUrl() {
  return (
    process.env.APP_URL?.trim() || process.env.BETTER_AUTH_URL?.trim() || "http://localhost:3000"
  );
}

const baseURL = resolveBaseUrl();

export const auth = betterAuth({
  database: db,
  secret: resolveAuthSecret(),
  baseURL,
  trustedOrigins: [baseURL],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
    autoSignIn: true,
  },
  plugins: [nextCookies()],
});
