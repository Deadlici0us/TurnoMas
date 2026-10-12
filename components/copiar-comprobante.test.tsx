import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import CopiarComprobante from "@/components/copiar-comprobante";

describe("CopiarComprobante",
() =>
{
  it("debería mostrar el nro con botón para copiar",
  () =>
  {
    render(<CopiarComprobante comprobanteId="1234567890" />);

    expect(screen.getByText("1234567890")).toBeDefined();
    expect(screen.getByRole("button", { name: "Copiar nro de comprobante" })).toBeDefined();
  });

  it("debería confirmar el copiado al hacer click",
  async () =>
  {
    const user = userEvent.setup();

    render(<CopiarComprobante comprobanteId="1234567890" />);

    await user.click(screen.getByRole("button", { name: "Copiar nro de comprobante" }));

    expect(await screen.findByText("¡Copiado!")).toBeDefined();
  });

  it("debería mostrar guion sin comprobante",
  () =>
  {
    render(<CopiarComprobante comprobanteId={null} />);

    expect(screen.getByText("—")).toBeDefined();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("debería mostrar guion con comprobante indefinido (seed sin clave)",
  () =>
  {
    render(<CopiarComprobante comprobanteId={undefined} />);

    expect(screen.getByText("—")).toBeDefined();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("debería mostrar guion con comprobante vacío",
  () =>
  {
    render(<CopiarComprobante comprobanteId="   " />);

    expect(screen.getByText("—")).toBeDefined();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
