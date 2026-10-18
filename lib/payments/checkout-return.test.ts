import { describe, expect, it } from "vitest";

import { esRetornoCheckout } from "./checkout-return";

describe("esRetornoCheckout",
  () =>
  {
    it("debería detectar el retorno con suscripcion=ok",
    () =>
    {
      expect(esRetornoCheckout({ suscripcion: "ok" })).toBe(true);
    });

    it("debería detectar el retorno con la URL malformada de MercadoPago",
    () =>
    {
      expect(esRetornoCheckout({
        suscripcion: "ok?preapproval_id=c9d413fe3d2a465f88d28b2be92993a4",
      })).toBe(true);
    });

    it("debería detectar el retorno con preapproval_id junto a suscripcion",
    () =>
    {
      expect(esRetornoCheckout({
        suscripcion: "ok",
        preapproval_id: "c9d413fe3d2a465f88d28b2be92993a4",
      })).toBe(true);
    });

    it("debería detectar el retorno sólo con preapproval_id",
    () =>
    {
      expect(esRetornoCheckout({
        preapproval_id: "c9d413fe3d2a465f88d28b2be92993a4",
      })).toBe(true);
    });

    it("no debería detectar retorno sin parámetros",
    () =>
    {
      expect(esRetornoCheckout({})).toBe(false);
    });

    it("no debería detectar retorno ante un error de activación",
    () =>
    {
      expect(esRetornoCheckout({ suscripcion: "error" })).toBe(false);
    });

    it("no debería detectar retorno con valores nulos o vacíos",
    () =>
    {
      expect(esRetornoCheckout({ suscripcion: null, preapproval_id: "" })).toBe(false);
    });
  });
