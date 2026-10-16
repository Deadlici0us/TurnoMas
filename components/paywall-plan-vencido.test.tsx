import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import PaywallPlanVencido from "./paywall-plan-vencido";

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
    it("debería mostrar un diálogo a pantalla completa con el aviso",
    () =>
    {
      render(<PaywallPlanVencido etiquetaPlan="$ 14.999 ARS/mes" activar={vi.fn()} logout={vi.fn()} />);

      expect(screen.getByRole("dialog")).toBeDefined();
      expect(screen.getByRole("heading", { name: "Tu plan venció" })).toBeDefined();
      expect(screen.getByText("14 días gratis")).toBeDefined();
    });

    it("debería listar el precio y los beneficios del plan",
    () =>
    {
      render(<PaywallPlanVencido etiquetaPlan="U$S 15 USD/mes" activar={vi.fn()} logout={vi.fn()} />);

      expect(screen.getByText("U$S 15 USD/mes")).toBeDefined();

      for (const feature of FEATURES)
      {
        expect(screen.getByText(feature)).toBeDefined();
      }
    });

    it("debería ofrecer activar el plan y cerrar sesión",
    () =>
    {
      render(<PaywallPlanVencido etiquetaPlan="U$S 15 USD/mes" activar={vi.fn()} logout={vi.fn()} />);

      expect(screen.getByRole("button", { name: "Activar plan U$S 15 USD/mes" })).toBeDefined();
      expect(screen.getByRole("button", { name: "Cerrar sesión" })).toBeDefined();
    });
  });
