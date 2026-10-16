import { expect, test } from "@playwright/test";

// El run local (Supabase vacío) corre en auth-mode demo y nunca bloquea: el
// caso sólo es reproducible contra el preview, con Supabase y la cuenta demo
// con la prueba vencida.
const preview = process.env.PREVIEW_URL;

test.skip(preview === undefined || preview.length === 0,
  "Requiere PREVIEW_URL con Supabase y la cuenta demo vencida.");

test("la cuenta demo con el plan vencido ve el overlay de paywall",
async ({ page }) =>
{
  await page.goto("/login");
  await page.fill('input[name="email"]', "demo@turnomas.com");
  await page.fill('input[name="password"]', "demo123");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();

  await expect(page).toHaveURL(/\/dashboard\/facturacion/);
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tu plan venció" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Activar plan/ })).toBeVisible();
});
