import { expect, test } from "@playwright/test";

test("onboarding muestra editor visual de horarios en el paso 1",
async ({ page }) =>
{
  await page.goto("/onboarding");

  await expect(page.getByRole("heading", { name: "Poné en marcha tu negocio" })).toBeVisible();
  await expect(page.getByText("Horarios del negocio")).toBeVisible();
  await expect(page.getByRole("switch", { name: /Lunes abierto/ })).toBeChecked();
  await expect(page.getByRole("switch", { name: /Domingo abierto/ })).not.toBeChecked();
  await expect(page.getByRole("button", { name: /Corrido 9 a 19/ })).toBeVisible();
});

test("onboarding permite cerrar un día con el interruptor",
async ({ page }) =>
{
  await page.goto("/onboarding");

  const lunes = page.getByRole("switch", { name: /Lunes abierto/ });

  await expect(lunes).toBeChecked();
  await lunes.click();
  await expect(lunes).not.toBeChecked();
  await expect(page.getByText(/Lun cerrado/)).toBeVisible();
});
