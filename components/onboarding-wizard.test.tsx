import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import OnboardingWizard from "./onboarding-wizard";
import { useSearchParams } from "next/navigation";

vi.mock("next-intl", () =>
{
  return { useTranslations: () => (key: string) => key };
});

vi.mock("next/navigation", () =>
{
  return { useSearchParams: vi.fn() };
});

vi.mock("@/app/onboarding/actions", () =>
{
  return { createBusiness: vi.fn(async () => undefined) };
});

const mockSearchParams = vi.mocked(useSearchParams);

/** Query params del wizard para cada render. */
function params(query = ""): void
{
  mockSearchParams.mockReturnValue(new URLSearchParams(query) as never);
}

describe("OnboardingWizard",
() =>
{
  it("debería mostrar el paso 1 con preview de URL",
  () =>
  {
    params();

    render(<OnboardingWizard />);

    expect(screen.getByText("onboarding.step1Title")).toBeDefined();
    expect(screen.getByText("/ar/barberia-diego")).toBeDefined();
  });

  it("debería actualizar el preview al cambiar el nombre",
  async () =>
  {
    const user = userEvent.setup();
    params();

    render(<OnboardingWizard />);
    const input = screen.getByDisplayValue("Barbería Diego");

    await user.clear(input);
    await user.type(input, "Peluquería Ana");

    expect(screen.getByText("/ar/peluqueria-ana")).toBeDefined();
  });

  it("debería crear el negocio en el paso 1",
  () =>
  {
    params();

    render(<OnboardingWizard />);

    expect(screen.getByRole("button", { name: "onboarding.crearNegocio" })).toBeDefined();
    expect(document.querySelector('input[name="nombre"]')).not.toBeNull();
    expect(document.querySelector('input[name="timezone"]')).not.toBeNull();
  });

  it("debería mostrar el editor visual de horarios en el paso 1",
  () =>
  {
    params();

    render(<OnboardingWizard />);

    expect(screen.getByRole("switch", { name: /Lunes abierto/ })).toHaveProperty("checked", true);
    expect(screen.getByRole("switch", { name: /Domingo abierto/ })).toHaveProperty("checked", false);
    expect(screen.getByRole("button", { name: /Corrido 9 a 19/ })).toBeDefined();
  });

  it("debería avanzar y retroceder entre pasos 1 y 2",
  async () =>
  {
    const user = userEvent.setup();
    params("paso=2");

    render(<OnboardingWizard />);

    expect(screen.getByText("onboarding.step2Title")).toBeDefined();

    await user.click(screen.getByRole("button", { name: "←" }));

    expect(screen.getByText("onboarding.step1Title")).toBeDefined();
  });

  it("debería linkear al OAuth real sin botón de omitir en el paso 2",
  () =>
  {
    params("paso=2");

    render(<OnboardingWizard />);

    expect(screen.getByRole("link", { name: "onboarding.connectMp" }))
      .toHaveAttribute("href", expect.stringContaining("/api/integrations/mercadopago/authorize"));
    expect(screen.getByText("onboarding.mpObligatorio")).toBeDefined();
    expect(screen.queryByRole("button", { name: "onboarding.continuar" })).toBeNull();
  });

  it("debería continuar al paso 3 con mp=ok",
  async () =>
  {
    const user = userEvent.setup();
    params("paso=2&mp=ok");

    render(<OnboardingWizard />);

    expect(screen.getByText(/onboarding.mpConectado/)).toBeDefined();

    await user.click(screen.getByRole("button", { name: "onboarding.continuar" }));

    expect(screen.getByText("onboarding.step3Title")).toBeDefined();

    await user.click(screen.getByRole("button", { name: "onboarding.skipWa" }));

    expect(screen.getByText("onboarding.step4Title")).toBeDefined();
    expect(screen.getByText("onboarding.trialNote")).toBeDefined();
  });

  it("debería usar la zona del país sin Intl disponible",
  () =>
  {
    const spy = vi.spyOn(Intl, "DateTimeFormat").mockImplementation(() =>
    {
      throw new Error("sin intl");
    });

    try
    {
      params();

      render(<OnboardingWizard />);

      expect(screen.getByText(/Zona horaria detectada:/)).toBeDefined();
      expect(screen.getByText(/America\/Argentina\/Buenos_Aires/)).toBeDefined();
    }
    finally
    {
      spy.mockRestore();
    }
  });

  it("debería terminar en el dashboard desde el paso 4",
  () =>
  {
    params("paso=4");

    render(<OnboardingWizard />);

    expect(screen.getByRole("link", { name: "onboarding.finish" }))
      .toHaveAttribute("href", "/dashboard");
  });
});
