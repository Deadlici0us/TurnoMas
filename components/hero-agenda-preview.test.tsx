import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import HeroAgendaPreview from "./hero-agenda-preview";

describe("HeroAgendaPreview",
() =>
{
  it("debería mostrar seis turnos y el total en el encabezado",
  () =>
  {
    render(<HeroAgendaPreview />);

    expect(screen.getByText("Agenda de hoy")).toBeDefined();
    expect(screen.getByText("6 turnos")).toBeDefined();
    expect(screen.getAllByTestId("hero-agenda-turno")).toHaveLength(6);
  });

  it("debería mostrar cada bloque con cliente, servicio, hora y profesional",
  () =>
  {
    render(<HeroAgendaPreview />);

    expect(screen.getByTitle("Juan · Corte · 08:00 · Diego")).toBeDefined();
    expect(screen.getByText("Juan · Corte")).toBeDefined();
    expect(screen.getByText("08:00 · Diego")).toBeDefined();
  });

  it("debería usar la paleta real para los estados",
  () =>
  {
    render(<HeroAgendaPreview />);

    expect(screen.getByTitle("Leo · Barba · 10:30 · Diego").className).toContain("bg-warning-soft");
    expect(screen.getByTitle("Ana · Color · 09:00 · Camila").className).toContain("bg-success-soft");
    expect(screen.getByText("Pendiente")).toBeDefined();
    expect(screen.getByText("Seña pagada")).toBeDefined();
  });

  it("debería marcar Día como vista activa",
  () =>
  {
    render(<HeroAgendaPreview />);

    expect(screen.getByTestId("hero-agenda-vista-dia")).toHaveClass("ui-tab-active");
    expect(screen.getByTestId("hero-agenda-vista-semana")).not.toHaveClass("ui-tab-active");
    expect(screen.getByTestId("hero-agenda-vista-mes")).not.toHaveClass("ui-tab-active");
  });

  it("no debería contradecir los estados con un resumen falso",
  () =>
  {
    render(<HeroAgendaPreview />);

    expect(screen.queryByText("Todo confirmado")).toBeNull();
    expect(screen.queryByText("Seña pendiente")).toBeNull();
    expect(screen.getByText("2 señas cobradas")).toBeDefined();
  });
});
