import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import ConfigSubnav from "./config-subnav";

describe("ConfigSubnav",
() =>
{
  it("debería marcar la sección activa y linkear las demás",
  () =>
  {
    render(<ConfigSubnav activa="mensajes" />);

    expect(screen.getByRole("link", { name: "Mensajes" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "General" }).getAttribute("href"))
      .toBe("/dashboard/config?seccion=general");
    expect(screen.getByRole("link", { name: "Cobros" }).getAttribute("aria-current")).toBeNull();
  });
});
