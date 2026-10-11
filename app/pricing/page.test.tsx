import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import PricingPage from "./page";

vi.mock("next-intl/server", () =>
{
  return { getTranslations: async () => (key: string) => key };
});

describe("PricingPage",
() =>
{
  it("debería mostrar el plan con CTA a facturación",
  async () =>
  {
    render(await PricingPage());

    expect(screen.getByRole("heading", { name: "pricing.title" })).toBeDefined();
    expect(screen.getByRole("link", { name: "pricing.cta" }))
      .toHaveAttribute("href", "/dashboard/facturacion");
  });

  it("debería avisar bloqueo con ?blocked=1",
  async () =>
  {
    render(await PricingPage({ searchParams: Promise.resolve({ blocked: "1" }) }));

    expect(screen.getByText("Tu acceso está bloqueado por falta de pago. Activá el plan para continuar."))
      .toBeDefined();
  });

  it("debería callar sin blocked",
  async () =>
  {
    render(await PricingPage());

    expect(screen.queryByText("Tu acceso está bloqueado por falta de pago. Activá el plan para continuar."))
      .toBeNull();
  });
});
