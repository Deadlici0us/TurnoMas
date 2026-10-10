import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import CamposServicio from "./campos-servicio";

function promoInput(): HTMLInputElement
{
  return document.querySelector('input[name="precioPromocional"]') as HTMLInputElement;
}

function senaInput(): HTMLInputElement
{
  return document.querySelector('input[name="senaPorcentaje"]') as HTMLInputElement;
}

function remarketingInput(): HTMLInputElement
{
  return document.querySelector('input[name="remarketingDias"]') as HTMLInputElement;
}

describe("CamposServicio nuevo",
() =>
{
  it("debería iniciar con seña y sin promo",
  () =>
  {
    render(<CamposServicio />);

    expect(senaInput().disabled).toBe(false);
    expect(promoInput().disabled).toBe(true);
    expect(promoInput().placeholder).toBe("Activá el tilde para usar promo");
    expect(remarketingInput().disabled).toBe(false);
  });

  it("debería habilitar la promo al tildar",
  async () =>
  {
    const user = userEvent.setup();

    render(<CamposServicio />);
    await user.click(screen.getByRole("checkbox", { name: "Precio promo" }));

    expect(promoInput().disabled).toBe(false);
    expect(promoInput().placeholder).toBe("Ej: 12000");
  });

  it("debería deshabilitar la seña al destildar",
  async () =>
  {
    const user = userEvent.setup();

    render(<CamposServicio />);
    await user.click(screen.getByRole("checkbox", { name: "Exige seña" }));

    expect(senaInput().disabled).toBe(true);
    expect(senaInput().required).toBe(false);
    expect(senaInput().placeholder).toBe("Sin seña");
  });
});

describe("CamposServicio edición",
() =>
{
  it("debería reflejar un servicio sin seña ni remarketing",
  () =>
  {
    render(<CamposServicio servicio={{
      nombre: "Corte",
      duracion_min: 30,
      precio_base: 5000,
      precio_promocional: 4000,
      sena_requerida: false,
      sena_porcentaje: 0,
      remarketing: false,
      remarketing_dias: null,
    }} />);

    expect(senaInput().disabled).toBe(true);
    expect(promoInput().disabled).toBe(false);
    expect(remarketingInput().disabled).toBe(true);
    expect(remarketingInput().placeholder).toBe("Desactivado");
  });
});
