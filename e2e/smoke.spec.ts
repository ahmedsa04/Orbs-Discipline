import { test, expect } from "@playwright/test";

test("login page is mobile friendly", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Discipline" })).toBeVisible();
  await expect(page.getByPlaceholder("Email")).toBeVisible();
  await expect(page.getByPlaceholder("Password")).toBeVisible();
});

test("signup page loads", async ({ page }) => {
  await page.goto("/signup");
  await expect(page.getByRole("heading", { name: "Create account" })).toBeVisible();
});

test("manifest is installable shape", async ({ request }) => {
  const res = await request.get("/manifest.webmanifest");
  expect(res.ok()).toBeTruthy();
  const json = await res.json();
  expect(json.display).toBe("standalone");
  expect(json.icons?.length).toBeGreaterThan(0);
});

test("service worker is served", async ({ request }) => {
  const res = await request.get("/sw.js");
  expect(res.ok()).toBeTruthy();
  const text = await res.text();
  expect(text).toContain("addEventListener(\"push\"");
});
