import { expect, test } from "@playwright/test";

test("landing muestra copy es-AR y pricing sin inglés",
async ({ page }) =>
{
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "TurnoMas" })).toBeVisible();
  await expect(page.getByText("Eliminá las inasistencias en tu negocio")).toBeVisible();
  await expect(page.getByText("Reservas ilimitadas")).toBeVisible();
  await expect(page.getByText("Feature list")).toHaveCount(0);
});

test("CTA principal navega al login",
async ({ page }) =>
{
  await page.goto("/");

  await page.getByRole("link", { name: "Iniciar sesión" }).first().click();

  await expect(page).toHaveURL(/\/login/);
});

test("las secciones se revelan al scrollear",
async ({ page }) =>
{
  await page.goto("/");

  const pricing = page.locator('[data-reveal="true"]')
    .filter({ hasText: "Precios simples y transparentes" });

  await expect(pricing).not.toHaveAttribute("data-visible", "true");
  await expect(pricing).toHaveCSS("opacity", "0");

  await pricing.scrollIntoViewIfNeeded();

  await expect(pricing).toHaveAttribute("data-visible", "true");
  await expect(pricing).toHaveCSS("opacity", "1");
});
