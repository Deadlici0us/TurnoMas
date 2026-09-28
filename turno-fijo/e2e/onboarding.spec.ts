import { expect, test } from "@playwright/test";

test("register muestra copy es-AR y navega al onboarding",
async ({ page }) =>
{
  await page.goto("/register");

  await expect(page.getByRole("heading", { name: "Creá tu cuenta gratis" })).toBeVisible();
  await expect(page.getByText("14 días gratis, sin tarjeta")).toBeVisible();
  await expect(page.getByText("Create your account")).toHaveCount(0);
});

test("login muestra copy es-AR con enlace a registro",
async ({ page }) =>
{
  await page.goto("/login");

  await expect(page.getByRole("heading", { name: "Entrá a tu cuenta" })).toBeVisible();
  await expect(page.getByRole("link", { name: "¿No tenés cuenta? Registrate gratis" })).toBeVisible();
});

test("onboarding genera preview de URL pública /:pais/:slug",
async ({ page }) =>
{
  await page.goto("/onboarding");

  await expect(page.getByRole("heading", { name: "Poné en marcha tu negocio" })).toBeVisible();
  await expect(page.getByText("/ar/barberia-diego")).toBeVisible();
});
