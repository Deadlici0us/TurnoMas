import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import PaywallPlanVencido from "./paywall-plan-vencido";

vi.mock("next/navigation", () =>
{
  return { useSearchParams: vi.fn(() => new URLSearchParams()) };
});

const FEATURES = [
  "Reservas ilimitadas",
  "Cobro de señas vía MercadoPago",
  "Recordatorios automáticos por email",
  "Lista negra automática",
  "Soporte prioritario",
];

describe("PaywallPlanVencido",
  () =>
  {
    it("debería mostrar un diálogo a pantalla completa con el aviso y el pago",
    () =>
    {
      render(
        <PaywallPlanVencido etiquetaPlan="$ 14.999 ARS/mes" logout={vi.fn()} />,
      );

      expect(screen.getByRole("dialog")).toBeDefined();
      expect(screen.getByRole("heading", { name: "Tu plan venció" })).toBeDefined();
      expect(screen.getByText("14 días gratis")).toBeDefined();
      expect(screen.getByLabelText("Email de tu cuenta de MercadoPago")).toBeDefined();
      expect(screen.getByRole("button", { name: "Pagar con MercadoPago" })).toBeDefined();
      expect(screen.getByRole("button", { name: "Ya pagué, verificar ahora" })).toBeDefined();
    });

    it("debería listar el precio y los beneficios del plan",
    () =>
    {
      render(
        <PaywallPlanVencido etiquetaPlan="U$S 15 USD/mes" logout={vi.fn()} />,
      );

      expect(screen.getByText("U$S 15 USD/mes")).toBeDefined();

      for (const feature of FEATURES)
      {
        expect(screen.getByText(feature)).toBeDefined();
      }
    });

    it("debería precargar el email de la cuenta en el pago",
    () =>
    {
      render(
        <PaywallPlanVencido
          etiquetaPlan="$ 14.999 ARS/mes"
          logout={vi.fn()}
          emailInicial="dueno@negocio.com"
        />,
      );

      const input = screen.getByLabelText("Email de tu cuenta de MercadoPago") as HTMLInputElement;

      expect(input.value).toBe("dueno@negocio.com");
    });

    it("debería ofrecer cerrar sesión",
    () =>
    {
      render(
        <PaywallPlanVencido etiquetaPlan="U$S 15 USD/mes" logout={vi.fn()} />,
      );

      expect(screen.getByRole("button", { name: "Cerrar sesión" })).toBeDefined();
    });
  });
