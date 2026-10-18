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
      .toHaveAttribute("href", "/dashboard/suscripcion");
  });
});
