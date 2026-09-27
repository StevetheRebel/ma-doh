import { test, expect } from "@playwright/test";

test("signup explains the required email confirmation", async ({ page }) => {
  await page.route("http://127.0.0.1:54321/auth/v1/signup**", async (route) => {
    await route.fulfill({
      json: {
        user: {
          id: "22222222-2222-4222-8222-222222222222",
          email: "new@example.com",
          aud: "authenticated",
          role: "authenticated",
          identities: [{ provider: "email" }],
          user_metadata: { display_name: "New User" },
          app_metadata: { provider: "email" },
          created_at: new Date().toISOString(),
        },
        session: null,
      },
    });
  });

  await page.goto("/sign-in");
  await page.getByRole("button", { name: "Create an account" }).click();
  await page.getByLabel("Name", { exact: true }).fill("New User");
  await page.getByLabel("Email", { exact: true }).fill("new@example.com");
  await page.getByLabel("Password", { exact: true }).fill("test-password");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByRole("status")).toHaveText(
    "Account created. Check new@example.com for the confirmation link, then sign in.",
  );
});

test("sign in, create account, review, edit, ask, delete, and sign out using real FastAPI", async ({
  page,
}) => {
  await page.route("http://127.0.0.1:54321/auth/v1/**", async (route) => {
    const user = {
      id: "11111111-1111-4111-8111-111111111111",
      email: "test@example.com",
      aud: "authenticated",
      role: "authenticated",
      user_metadata: { display_name: "Test User" },
      app_metadata: { provider: "email" },
      created_at: new Date().toISOString(),
    };
    await route.fulfill({
      json: route.request().url().includes("/token")
        ? {
            access_token: "browser-test-token",
            token_type: "bearer",
            expires_in: 3600,
            refresh_token: "test-refresh",
            user,
          }
        : user,
    });
  });
  await page.goto("/sign-in");
  await page.getByLabel("Email", { exact: true }).fill("test@example.com");
  await page.getByLabel("Password", { exact: true }).fill("test-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.goto("/settings");
  await page.getByLabel("Account name", { exact: true }).fill("Test Cash");
  await page.getByLabel("Opening balance (KES)").fill("1000");
  await page.getByLabel("Opening date").fill("2020-01-01");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(
    page.getByText("Test Cash (mpesa)", { exact: false }),
  ).toBeVisible();
  await page.goto("/transactions/add/manual");
  await page
    .getByRole("combobox", { name: "Category", exact: true })
    .selectOption("transport");
  await page.getByLabel("Amount (KES)").fill("125.50");
  await page
    .getByLabel("Description", { exact: true })
    .fill("Browser test bus fare");
  await page
    .getByRole("button", { name: "Review transaction", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Review manual transaction" }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Amount (KES)")).toHaveValue("125.50");
  await page.getByRole("button", { name: "Confirm and save" }).click();
  await expect(
    page.getByRole("heading", { name: "No pending drafts" }),
  ).toBeVisible();
  await page.goto("/dashboard");
  await expect(page.getByText("KES 874.50", { exact: true })).toBeVisible();
  await page.goto("/ask");
  await page
    .getByLabel("Your question")
    .fill("How much did I spend on transport this month?");
  await page.getByRole("button", { name: "Ask", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: /You recorded KES 125.50/ }),
  ).toBeVisible();
  await page.getByRole("link", { name: /Browser test bus fare/ }).click();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByLabel("Amount (KES)").fill("150.25");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(
    page.getByRole("button", { name: "Save changes" }),
  ).not.toBeVisible();
  await expect(page.getByText(/KES 150.25/)).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page).toHaveURL(/\/transactions$/);
  await page.goto("/dashboard");
  await expect(page.getByText("KES 1,000.00", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Open profile menu" }).click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/sign-in/);
});
