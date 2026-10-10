import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import OnboardingWizard from "./onboarding-wizard";

vi.mock("next-intl", () =>
{
  return { useTranslations: () => (key: string) => key };
});

vi.mock("@/app/onboarding/actions", () =>
{
  return { createBusiness: vi.fn(async () => undefined) };
});

describe("OnboardingWizard",
() =>
{
  it("debería mostrar el paso 1 con preview de URL",
  () =>
  {
    render(<OnboardingWizard />);

    expect(screen.getByText("onboarding.step1Title")).toBeDefined();
    expect(screen.getByText("/ar/barberia-diego")).toBeDefined();
  });

  it("debería actualizar el preview al cambiar el nombre",
  async () =>
  {
    const user = userEvent.setup();

    render(<OnboardingWizard />);
    const input = screen.getByDisplayValue("Barbería Diego");

    await user.clear(input);
    await user.type(input, "Peluquería Ana");

    expect(screen.getByText("/ar/peluqueria-ana")).toBeDefined();
  });

  it("debería avanzar y retroceder entre pasos",
  async () =>
  {
    const user = userEvent.setup();

    render(<OnboardingWizard />);
    await user.click(screen.getByRole("button", { name: "onboarding.step2Title" }));

    expect(screen.getByText("onboarding.step2Title")).toBeDefined();

    await user.click(screen.getByRole("button", { name: "←" }));

    expect(screen.getByText("onboarding.step1Title")).toBeDefined();
  });

  it("debería tildar MercadoPago y llegar al paso 4",
  async () =>
  {
    const user = userEvent.setup();

    render(<OnboardingWizard />);
    await user.click(screen.getByRole("button", { name: "onboarding.step2Title" }));
    await user.click(screen.getByRole("button", { name: "onboarding.connectMp" }));

    expect(screen.getByRole("button", { name: /✓.*onboarding.connectMp/ })).toBeDefined();

    await user.click(screen.getByRole("button", { name: "onboarding.skipMp" }));

    expect(screen.getByText("onboarding.step3Title")).toBeDefined();

    await user.click(screen.getByRole("button", { name: "onboarding.skipWa" }));

    expect(screen.getByText("onboarding.step4Title")).toBeDefined();
    expect(screen.getByText("onboarding.trialNote")).toBeDefined();
  });

  it("debería usar la zona del país sin Intl disponible",
  async () =>
  {
    const user = userEvent.setup();
    const spy = vi.spyOn(Intl, "DateTimeFormat").mockImplementation(() =>
    {
      throw new Error("sin intl");
    });

    try
    {
      render(<OnboardingWizard />);
      await user.click(screen.getByRole("button", { name: "onboarding.step2Title" }));
      await user.click(screen.getByRole("button", { name: "onboarding.skipMp" }));
      await user.click(screen.getByRole("button", { name: "onboarding.skipWa" }));

      expect(screen.getByText(/Zona horaria detectada:/)).toBeDefined();
      expect(screen.getByText(/America\/Argentina\/Buenos_Aires/)).toBeDefined();
    }
    finally
    {
      spy.mockRestore();
    }
  });

  it("debería exponer la zona detectada y el submit final",
  async () =>
  {
    const user = userEvent.setup();

    render(<OnboardingWizard />);
    await user.click(screen.getByRole("button", { name: "onboarding.step2Title" }));
    await user.click(screen.getByRole("button", { name: "onboarding.skipMp" }));
    await user.click(screen.getByRole("button", { name: "onboarding.skipWa" }));

    expect(screen.getByRole("button", { name: "onboarding.finish" })).toBeDefined();
    expect(document.querySelector('input[name="timezone"]')).not.toBeNull();
  });
});
