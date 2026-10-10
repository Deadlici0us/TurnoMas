import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import LossCalculator from "./loss-calculator";
import { estimateMonthlyLoss } from "@/lib/onboarding/loss-calculator";

vi.mock("next-intl", () =>
{
  return { useTranslations: () => (key: string) => key };
});

describe("LossCalculator",
() =>
{
  it("debería renderizar título y resultado inicial",
  () =>
  {
    render(<LossCalculator />);
    const esperado = estimateMonthlyLoss({
      turnosPorSemana: 20,
      valorPromedio: 15000,
      tasaAusencia: 0.2,
    }).toLocaleString("es-AR");

    expect(screen.getByText("calculator.title")).toBeDefined();
    expect(screen.getByText("calculator.subtitle")).toBeDefined();
    expect(screen.getByText(new RegExp(esperado.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))).toBeDefined();
  });

  it("debería recalcular al editar los turnos",
  async () =>
  {
    const user = userEvent.setup();

    render(<LossCalculator />);
    const input = screen.getAllByDisplayValue("20")[0] as HTMLInputElement;

    await user.clear(input);
    await user.type(input, "40");

    const esperado = estimateMonthlyLoss({
      turnosPorSemana: 40,
      valorPromedio: 15000,
      tasaAusencia: 0.2,
    }).toLocaleString("es-AR");

    expect(screen.getByText(new RegExp(esperado.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))).toBeDefined();
  });

  it("debería tolerar entradas no numéricas",
  async () =>
  {
    const user = userEvent.setup();

    render(<LossCalculator />);
    const input = screen.getAllByDisplayValue("20")[0] as HTMLInputElement;

    await user.clear(input);
    await user.type(input, "abc");

    const esperado = (0).toLocaleString("es-AR");

    expect(screen.getByText(new RegExp(esperado.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))).toBeDefined();
  });
});
