import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import VerificarPago from "./verificar-pago";

const navegacion = vi.hoisted(() => ({ params: new URLSearchParams() }));

vi.mock("next/navigation", () =>
{
  return { useSearchParams: () => navegacion.params };
});

/** Instala fetch global mockeado y devuelve el mock. */
function instalarFetch(respuesta: unknown)
{
  const fetchMock = vi.fn(async () => respuesta);
  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

beforeEach(() =>
{
  navegacion.params = new URLSearchParams();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("VerificarPago",
  () =>
  {
    it("debería ofrecer el botón de verificación",
    () =>
    {
      render(<VerificarPago />);

      expect(screen.getByRole("button", { name: "Ya pagué, verificar ahora" })).toBeDefined();
    });

    it("debería recargar el dashboard cuando el pago quedó activo",
    async () =>
    {
      const user = userEvent.setup();
      const recargar = vi.fn();
      const fetchMock = instalarFetch({ ok: true, json: async () => ({ activado: true, estado: "active" }) });

      render(<VerificarPago recargar={recargar} />);
      await user.click(screen.getByRole("button", { name: "Ya pagué, verificar ahora" }));

      expect(fetchMock).toHaveBeenCalledWith("/api/suscripcion/verificar", { method: "POST" });
      await waitFor(() => expect(recargar).toHaveBeenCalledWith("/dashboard/facturacion"));
    });

    it("debería avisar cuando MercadoPago todavía no confirmó",
    async () =>
    {
      const user = userEvent.setup();
      instalarFetch({ ok: true, json: async () => ({ activado: false, estado: "pending" }) });

      render(<VerificarPago recargar={vi.fn()} />);
      await user.click(screen.getByRole("button", { name: "Ya pagué, verificar ahora" }));

      expect(await screen.findByRole("status")).toBeDefined();
      expect(screen.getByText(/todavía no confirmó el pago/)).toBeDefined();
    });

    it("debería avisar ante fallas de red",
    async () =>
    {
      const user = userEvent.setup();
      vi.stubGlobal("fetch", vi.fn(async () =>
      {
        throw new Error("red caída");
      }));

      render(<VerificarPago recargar={vi.fn()} />);
      await user.click(screen.getByRole("button", { name: "Ya pagué, verificar ahora" }));

      expect(await screen.findByText("No pudimos verificar el pago. Probá de nuevo.")).toBeDefined();
    });

    it("debería verificar automáticamente al volver del checkout",
    async () =>
    {
      navegacion.params = new URLSearchParams({ suscripcion: "ok" });
      const recargar = vi.fn();
      const fetchMock = instalarFetch({ ok: true, json: async () => ({ activado: true, estado: "active" }) });

      render(<VerificarPago recargar={recargar} />);

      await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/suscripcion/verificar", { method: "POST" }));
      await waitFor(() => expect(recargar).toHaveBeenCalledWith("/dashboard/facturacion"));
    });
  });
