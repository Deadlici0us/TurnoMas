import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import SuscripcionForm from "./suscripcion-form";

/** Instala fetch global mockeado y devuelve el mock. */
function instalarFetch(respuesta: unknown)
{
  const fetchMock = vi.fn(async () => respuesta);
  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

function respuestaOk(json: unknown)
{
  return { ok: true, status: 200, json: async () => json };
}

beforeEach(() =>
{
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("SuscripcionForm",
  () =>
  {
    it("debería pedir el email con un id propio del contexto",
    () =>
    {
      render(<SuscripcionForm idPrefix="paywall" />);

      const input = screen.getByLabelText("Email de tu cuenta de MercadoPago");

      expect(input.getAttribute("id")).toBe("paywall-payer-email");
      expect(screen.getByRole("button", { name: "Pagar con MercadoPago" })).toBeDefined();
    });

    it("debería precargar el email de la cuenta",
    () =>
    {
      render(<SuscripcionForm idPrefix="paywall" emailInicial="dueno@negocio.com" />);

      const input = screen.getByLabelText("Email de tu cuenta de MercadoPago") as HTMLInputElement;

      expect(input.value).toBe("dueno@negocio.com");
    });

    it("debería enviar el email y navegar al checkout de MercadoPago",
    async () =>
    {
      const user = userEvent.setup();
      const navegar = vi.fn();
      const fetchMock = instalarFetch(
        respuestaOk({ success: true, initPoint: "https://mp/checkout/1" }));

      render(<SuscripcionForm idPrefix="suscripcion" navegar={navegar} />);
      await user.type(
        screen.getByLabelText("Email de tu cuenta de MercadoPago"),
        "pagador@mp.com",
      );
      await user.click(screen.getByRole("button", { name: "Pagar con MercadoPago" }));

      expect(fetchMock).toHaveBeenCalledWith(
        "/api/suscripcion/crear",
        expect.objectContaining({ method: "POST" }),
      );
      const body = JSON.parse(
        ((fetchMock.mock.calls[0] as unknown[])[1] as { body: string }).body,
      ) as { payerEmail: string };

      expect(body).toEqual({ payerEmail: "pagador@mp.com" });
      await waitFor(() => expect(navegar).toHaveBeenCalledWith("https://mp/checkout/1"));
    });

    it("debería mostrar el error y conservar el email si el servidor rechaza",
    async () =>
    {
      const user = userEvent.setup();
      instalarFetch({
        ok: false,
        status: 502,
        json: async () => ({
          error: "Usá el email de la misma cuenta de MercadoPago con la que vas a pagar.",
          detalle: "payer email mismatch",
        }),
      });

      render(<SuscripcionForm idPrefix="paywall" navegar={vi.fn()} />);
      const input = screen.getByLabelText("Email de tu cuenta de MercadoPago");
      await user.type(input, "otro@mail.com");
      await user.click(screen.getByRole("button", { name: "Pagar con MercadoPago" }));

      expect(await screen.findByRole("alert")).toBeDefined();
      expect(screen.getByText(/Usá el email de la misma cuenta de MercadoPago/)).toBeDefined();
      expect(screen.getByText(/payer email mismatch/)).toBeDefined();
      expect((input as HTMLInputElement).value).toBe("otro@mail.com");
    });

    it("debería mostrar un mensaje genérico ante fallas de red",
    async () =>
    {
      const user = userEvent.setup();
      vi.stubGlobal("fetch", vi.fn(async () =>
      {
        throw new Error("red caída");
      }));

      render(<SuscripcionForm idPrefix="paywall" navegar={vi.fn()} />);
      await user.type(
        screen.getByLabelText("Email de tu cuenta de MercadoPago"),
        "pagador@mp.com",
      );
      await user.click(screen.getByRole("button", { name: "Pagar con MercadoPago" }));

      expect(await screen.findByText("No pudimos activar el plan. Probá de nuevo.")).toBeDefined();
    });
  });
