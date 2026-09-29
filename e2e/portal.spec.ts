import { expect, test } from "@playwright/test";

test("portal demo reserva sin seña hasta confirmación",
async ({ page }) =>
{
  await page.goto("/ar/barberia-diego");

  await expect(page.getByRole("heading", { name: "Barbería Diego" })).toBeVisible();

  await page.getByRole("button", { name: "Diego", exact: true }).click();
  await expect(page.getByRole("heading", { name: "2. Elegí tu servicio" })).toBeVisible();
  await page.getByRole("button", { name: /Perfilado de barba/ }).click();

  const slot = page.locator("section", { hasText: "3. Elegí el horario" }).getByRole("button").first();

  await expect(slot).toBeVisible();
  await slot.click();

  await page.getByPlaceholder("Ej: Juan Pérez").fill("Juan Pérez");
  await page.getByPlaceholder("Ej: +549110000001").fill("+549110000001");
  await page.getByRole("button", { name: "Confirmar reserva" }).click();

  await expect(page.getByRole("heading", { name: "¡Reserva confirmada!" })).toBeVisible();
  await expect(page.getByText("Te escribimos al +549110000001")).toBeVisible();
});
