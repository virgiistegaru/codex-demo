import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

const password = "Valid-password-123";

function uniqueEmail(): string {
  return `playwright-${randomUUID()}@example.com`;
}

async function register(page: Page, email: string): Promise<void> {
  await page.goto("/register");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/notes$/);
}

test("registers, creates a note, autosaves edits, and signs out", async ({ page }) => {
  const email = uniqueEmail();
  await register(page, email);

  await expect(page.getByRole("heading", { name: "No notes yet" })).toBeVisible();
  await page.getByRole("link", { name: "New note" }).click();
  await expect(page.getByRole("heading", { name: "Create note" })).toBeVisible();

  await page.getByLabel("Title").fill("First draft");
  await page.getByRole("textbox", { name: "Note content" }).fill("A note that should persist.");
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page).toHaveURL(/\/notes$/);
  await expect(page.getByRole("link", { name: /First draft/ })).toBeVisible();

  await page.getByRole("link", { name: /First draft/ }).click();
  await expect(page.getByRole("heading", { name: "Edit note" })).toBeVisible();
  await page.getByLabel("Title").fill("Revised draft");
  await page.getByRole("textbox", { name: "Note content" }).fill("Autosaved note content.");
  await expect(page.getByRole("status")).toHaveText("Saved", { timeout: 10_000 });

  await page.reload();
  await expect(page.getByLabel("Title")).toHaveValue("Revised draft");
  await expect(page.getByRole("textbox", { name: "Note content" })).toContainText(
    "Autosaved note content.",
  );

  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/notes$/);
  await expect(page.getByRole("link", { name: /Revised draft/ })).toBeVisible();
});

test("redirects unauthenticated note routes and returns a custom 404", async ({ page }) => {
  await page.goto("/notes/new");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();

  const response = await page.goto("/this-route-does-not-exist");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
});

test("shows a generic error for invalid credentials", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("not-an-email");
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page).toHaveURL(/\/login$/);

  await page.getByLabel("Email").fill(uniqueEmail());
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByRole("alert")).toHaveText("We couldn't sign you in with those details.");
  await expect(page).toHaveURL(/\/login$/);
});
