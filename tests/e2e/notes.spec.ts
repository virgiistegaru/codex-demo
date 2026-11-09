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

async function createSavedNote(page: Page, title: string): Promise<string> {
  await page.goto("/notes/new");
  await page.getByLabel("Title").fill(title);
  await page.getByRole("textbox", { name: "Note content" }).fill("A private first draft.");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page).toHaveURL(/\/notes$/);
  await page.getByRole("link", { name: new RegExp(title) }).click();
  await expect(page.getByRole("heading", { name: "Edit note" })).toBeVisible();
  return page.url();
}

async function expectPublicNotFound(page: Page, url: string): Promise<void> {
  const response = await page.goto(url);
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
}

test("registers, saves and edits a note, and signs out", async ({ page }) => {
  const email = uniqueEmail();
  await register(page, email);

  await expect(page.getByRole("heading", { name: "No notes yet" })).toBeVisible();
  await page
    .getByRole("navigation", { name: "Account" })
    .getByRole("link", { name: "New note" })
    .click();
  await expect(page.getByRole("heading", { name: "Create note" })).toBeVisible();

  await page.getByLabel("Title").fill("First draft");
  await page.getByRole("textbox", { name: "Note content" }).fill("A note that should persist.");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page).toHaveURL(/\/notes$/);
  await expect(page.getByRole("link", { name: /First draft/ })).toBeVisible();

  await page.getByRole("link", { name: /First draft/ }).click();
  await expect(page.getByRole("heading", { name: "Edit note" })).toBeVisible();
  await page.getByLabel("Title").fill("Revised draft");
  await page.getByRole("textbox", { name: "Note content" }).fill("Updated note content.");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page).toHaveURL(/\/notes$/);
  await expect(page.getByRole("link", { name: /Revised draft/ })).toBeVisible();

  await page.getByRole("link", { name: /Revised draft/ }).click();
  await expect(page.getByRole("heading", { name: "Edit note" })).toBeVisible();

  await page.reload();
  await expect(page.getByLabel("Title")).toHaveValue("Revised draft");
  await expect(page.getByRole("textbox", { name: "Note content" })).toContainText(
    "Updated note content.",
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
  await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
  await expect(page).toHaveURL(/\/login$/);

  await page.getByLabel("Email").fill(uniqueEmail());
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByRole("main").getByRole("alert")).toHaveText(
    "We couldn't sign you in with those details.",
  );
  await expect(page).toHaveURL(/\/login$/);
});

test("shares the latest formatted draft publicly and revokes or replaces its link", async ({
  page,
  browser,
}) => {
  await register(page, uniqueEmail());
  await createSavedNote(page, "Shared draft");

  const title = "Latest shared title";
  const text = 'Latest draft: <script>alert("xss")</script> <img src=x onerror=alert(1)>';
  await page.getByLabel("Title").fill(title);
  const editor = page.getByRole("textbox", { name: "Note content" });
  await editor.fill(text);
  await editor.press("ControlOrMeta+A");
  await page.getByRole("button", { name: "Bold", exact: true }).click();
  page.once("dialog", (dialog) => dialog.accept("https://example.com/shared"));
  await page.getByRole("button", { name: "Add or remove link" }).click();

  // Sharing must flush this draft even when its autosave has not run yet.
  await page.getByRole("button", { name: "Share", exact: true }).click();
  const shareInput = page.getByLabel("Share link", { exact: true });
  await expect(shareInput).toHaveValue(/\/s\/[A-Za-z0-9_-]{43}$/);
  await expect(shareInput).toHaveAttribute("readonly", "");
  const firstShareUrl = await shareInput.inputValue();

  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: "Copy link", exact: true }).click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(firstShareUrl);

  const anonymousContext = await browser.newContext();
  try {
    const publicPage = await anonymousContext.newPage();
    const response = await publicPage.goto(firstShareUrl);
    expect(response?.status()).toBe(200);
    await expect(publicPage.getByRole("heading", { name: title, exact: true })).toBeVisible();
    const content = publicPage.locator(".shared-note-content");
    await expect(content).toHaveText(text);
    await expect(content.locator("strong")).toHaveText(text);
    await expect(content.getByRole("link")).toHaveAttribute("href", "https://example.com/shared");
    await expect(content.getByRole("link")).toHaveAttribute("target", "_blank");
    await expect(content.getByRole("link")).toHaveAttribute("rel", "noopener noreferrer");
    await expect(content.locator("script, img, [onerror]")).toHaveCount(0);
    await expect(publicPage.getByRole("button", { name: "Save", exact: true })).toHaveCount(0);

    await page.getByRole("button", { name: "Disable sharing", exact: true }).click();
    await expect(shareInput).toHaveCount(0);
    await expectPublicNotFound(publicPage, firstShareUrl);

    await page.getByRole("button", { name: "Share", exact: true }).click();
    await expect(shareInput).toHaveValue(/\/s\/[A-Za-z0-9_-]{43}$/);
    const secondShareUrl = await shareInput.inputValue();
    expect(secondShareUrl).not.toBe(firstShareUrl);
    await expectPublicNotFound(publicPage, firstShareUrl);
    expect((await publicPage.goto(secondShareUrl))?.status()).toBe(200);

    // Raw tokens are never stored, so a later visit can replace the active link.
    await page.reload();
    await page.getByRole("button", { name: "Replace share link", exact: true }).click();
    await expect(shareInput).toHaveValue(/\/s\/[A-Za-z0-9_-]{43}$/);
    const replacementShareUrl = await shareInput.inputValue();
    expect(replacementShareUrl).not.toBe(secondShareUrl);
    await expectPublicNotFound(publicPage, secondShareUrl);
    expect((await publicPage.goto(replacementShareUrl))?.status()).toBe(200);
    await expectPublicNotFound(
      publicPage,
      new URL("/s/not-a-valid-token", firstShareUrl).toString(),
    );
  } finally {
    await anonymousContext.close();
  }
});

test("confirms deletion and removes the note and its public link despite pending edits", async ({
  page,
  browser,
}) => {
  await register(page, uniqueEmail());
  const noteUrl = await createSavedNote(page, "Disposable note");
  await page.getByRole("button", { name: "Share", exact: true }).click();
  const shareInput = page.getByLabel("Share link", { exact: true });
  await expect(shareInput).toHaveValue(/\/s\/[A-Za-z0-9_-]{43}$/);
  const shareUrl = await shareInput.inputValue();

  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Delete note", exact: true }).click();
  await expect(page).toHaveURL(noteUrl);
  await expect(page.getByLabel("Title")).toHaveValue("Disposable note");

  await page.getByLabel("Title").fill("Pending edit before deletion");
  await page.getByRole("textbox", { name: "Note content" }).fill("This draft must not return.");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete note", exact: true }).click();
  await expect(page).toHaveURL(/\/notes$/);
  await expect(page.getByRole("heading", { name: "No notes yet" })).toBeVisible();
  // Wait past the autosave debounce to catch a deleted draft being recreated on unmount.
  await page.waitForTimeout(1_200);
  await page.reload();
  await expect(page.getByRole("heading", { name: "No notes yet" })).toBeVisible();
  await expectPublicNotFound(page, noteUrl);

  const anonymousContext = await browser.newContext();
  try {
    const publicPage = await anonymousContext.newPage();
    await expectPublicNotFound(publicPage, shareUrl);
  } finally {
    await anonymousContext.close();
  }
});

test("does not expose another user's private note or its sharing and delete controls", async ({
  page,
  browser,
}) => {
  await register(page, uniqueEmail());
  const noteUrl = await createSavedNote(page, "Owner only note");
  const otherUserContext = await browser.newContext({ baseURL: new URL(noteUrl).origin });
  try {
    const otherUserPage = await otherUserContext.newPage();
    await register(otherUserPage, uniqueEmail());
    await expectPublicNotFound(otherUserPage, noteUrl);
    await expect(otherUserPage.getByRole("button", { name: "Delete note" })).toHaveCount(0);
    await expect(otherUserPage.getByRole("button", { name: "Share" })).toHaveCount(0);
    await expect(page.getByLabel("Title")).toHaveValue("Owner only note");
  } finally {
    await otherUserContext.close();
  }
});
