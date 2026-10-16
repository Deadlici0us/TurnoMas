import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import PaywallPlanVencido from "./paywall-plan-vencido";

describe("PaywallPlanVencido",
  () =>
  {
    it("debería avisar que el plan venció",
    () =>
    {
      render(<PaywallPlanVencido etiquetaPlan="$ 14.999 ARS/mes" activar={vi.fn()} />);

      expect(screen.getByRole("heading", { name: "Tu plan venció" })).toBeDefined();
      expect(screen.getByText("Tu acceso está bloqueado por falta de pago. Activá el plan para seguir usando TurnoMas."))
        .toBeDefined();
    });

    it("debería ofrecer activar el plan con su etiqueta",
    () =>
    {
      render(<PaywallPlanVencido etiquetaPlan="U$S 15 USD/mes" activar={vi.fn()} />);

      expect(screen.getByRole("button", { name: "Activar plan U$S 15 USD/mes" })).toBeDefined();
    });
  });
