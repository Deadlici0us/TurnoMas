import { expect, test } from "@playwright/test";

const preview = process.env.PREVIEW_URL;

// La demo es temporal y no tiene suscripción: nunca debe mostrar paywall.
test.skip(preview === undefined || preview.length === 0,
  "Requiere PREVIEW_URL con Supabase configurado para validar el login demo.");

test("la cuenta demo no tiene suscripción ni paywall",
async ({ page }) =>
{
  await page.goto("/login");
  await page.fill('input[name="email"]', "demo@turnomas.com");
  await page.fill('input[name="password"]', "demo123");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText(/cuenta demo: es de solo lectura/)).toBeVisible();

  await page.goto("/dashboard/agenda");
  await expect(page).toHaveURL(/\/dashboard\/agenda/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
