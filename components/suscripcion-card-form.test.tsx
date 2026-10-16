import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, waitFor } from "@testing-library/react";

import SuscripcionCardForm from "./suscripcion-card-form";

const { mockPush } = vi.hoisted(() => ({ mockPush: vi.fn() }));

vi.mock("next/navigation", () =>
{
  return { useRouter: () => ({ push: mockPush }) };
});

interface CapturedSettings
{
  initialization: { amount: number };
  callbacks: {
    onReady: () => void;
    onSubmit: (formData: { token?: string; payer?: { email?: string } }) => Promise<void>;
    onError: (error: unknown) => void;
  };
}

let settings: CapturedSettings | null = null;

beforeEach(() =>
{
  settings = null;
  mockPush.mockClear();
  (window as unknown as { MercadoPago: unknown }).MercadoPago = class
  {
    bricks()
    {
      return {
        create: async (_type: string, _container: string, config: CapturedSettings) =>
        {
          settings = config;

          return { unmount: vi.fn() };
        },
      };
    }
  } as never;
});

afterEach(() =>
{
  delete (window as unknown as { MercadoPago?: unknown }).MercadoPago;
  vi.unstubAllGlobals();
});

describe("SuscripcionCardForm",
  () =>
  {
    it("debería inicializar el Brick con el monto del plan",
    async () =>
    {
      render(<SuscripcionCardForm publicKey="pk-test" monto={14999} emailPagador="sess@b.com" />);

      await waitFor(() => expect(settings).not.toBeNull());
      expect(settings?.initialization).toEqual({ amount: 14999 });
      expect(document.getElementById("suscripcion-card-brick")).not.toBeNull();
    });

    it("debería crear la suscripción con el token y el email del Brick",
    async () =>
    {
      const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ success: true }) }));
      vi.stubGlobal("fetch", fetchMock);

      render(<SuscripcionCardForm publicKey="pk-test" monto={14999} emailPagador="sess@b.com" />);

      await waitFor(() => expect(settings).not.toBeNull());
      act(() => settings?.callbacks.onReady());
      await settings?.callbacks.onSubmit({ token: "tok-1", payer: { email: "pagador@mp.com" } });

      expect(fetchMock).toHaveBeenCalledWith("/api/suscripcion/crear", expect.objectContaining({ method: "POST" }));
      const [, init] = fetchMock.mock.calls[0] as unknown as [string, { body: string }];
      expect(JSON.parse(init.body)).toEqual({ cardTokenId: "tok-1", payerEmail: "pagador@mp.com" });
      expect(mockPush).toHaveBeenCalledWith("/dashboard/facturacion?suscripcion=ok");
    });

    it("debería usar el email de sesión si el Brick no trae uno",
    async () =>
    {
      const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ success: true }) }));
      vi.stubGlobal("fetch", fetchMock);

      render(<SuscripcionCardForm publicKey="pk-test" monto={14999} emailPagador="sess@b.com" />);

      await waitFor(() => expect(settings).not.toBeNull());
      await settings?.callbacks.onSubmit({ token: "tok-2" });

      const [, init] = fetchMock.mock.calls[0] as unknown as [string, { body: string }];
      expect(JSON.parse(init.body)).toEqual({ cardTokenId: "tok-2", payerEmail: "sess@b.com" });
    });

    it("debería mostrar el error del servidor",
    async () =>
    {
      const fetchMock = vi.fn(async () => ({ ok: false, json: async () => ({ error: "Falta el token." }) }));
      vi.stubGlobal("fetch", fetchMock);

      render(<SuscripcionCardForm publicKey="pk-test" monto={14999} emailPagador="sess@b.com" />);

      await waitFor(() => expect(settings).not.toBeNull());
      await expect(settings?.callbacks.onSubmit({ token: "" })).rejects.toThrow("Falta el token.");
    });
  });
