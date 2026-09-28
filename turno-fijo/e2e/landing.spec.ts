import { expect, test } from "@playwright/test";

test("landing muestra copy es-AR y pricing sin inglés",
async ({ page }) =>
{
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "TurnoFijo" })).toBeVisible();
  await expect(page.getByText("Eliminá las inasistencias en tu negocio")).toBeVisible();
  await expect(page.getByText("Reservas ilimitadas")).toBeVisible();
  await expect(page.getByText("Feature list")).toHaveCount(0);
});

test("CTA principal navega a la demo",
async ({ page }) =>
{
  await page.goto("/");

  await page.getByRole("link", { name: "Probar Demo Gratis" }).click();

  await expect(page).toHaveURL(/\/demo/);
});
