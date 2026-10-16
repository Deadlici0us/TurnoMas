import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import PaywallPlanVencido from "./paywall-plan-vencido";

vi.mock("@/components/suscripcion-card-form", () =>
{
  return { default: () => <div data-testid="card-form" /> };
});

const FEATURES = [
  "Reservas ilimitadas",
  "Cobro de señas vía MercadoPago",
  "Recordatorios por WhatsApp y email",
  "Lista negra automática",
  "Agenda sincronizada con Google Calendar",
  "Soporte prioritario",
];

describe("PaywallPlanVencido",
  () =>
  {
    it("debería mostrar un diálogo a pantalla completa con el aviso y el pago",
    () =>
    {
      render(<PaywallPlanVencido etiquetaPlan="$ 14.999 ARS/mes" monto={14999} publicKey="pk-test" logout={vi.fn()} />);

      expect(screen.getByRole("dialog")).toBeDefined();
      expect(screen.getByRole("heading", { name: "Tu plan venció" })).toBeDefined();
      expect(screen.getByText("14 días gratis")).toBeDefined();
      expect(screen.getByTestId("card-form")).toBeDefined();
    });

    it("debería listar el precio y los beneficios del plan",
    () =>
    {
      render(<PaywallPlanVencido etiquetaPlan="U$S 15 USD/mes" monto={15} publicKey="pk-test" logout={vi.fn()} />);

      expect(screen.getByText("U$S 15 USD/mes")).toBeDefined();

      for (const feature of FEATURES)
      {
        expect(screen.getByText(feature)).toBeDefined();
      }
    });

    it("debería avisar si el pago no está disponible y ofrecer cerrar sesión",
    () =>
    {
      render(<PaywallPlanVencido etiquetaPlan="U$S 15 USD/mes" monto={15} publicKey={null} logout={vi.fn()} />);

      expect(screen.getByRole("button", { name: "Cerrar sesión" })).toBeDefined();
      expect(screen.getByText("El pago con tarjeta no está disponible en este momento.")).toBeDefined();
      expect(screen.queryByTestId("card-form")).toBeNull();
    });
  });
