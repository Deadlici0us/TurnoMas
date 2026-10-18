import { describe, expect, it } from "vitest";

import {
  evaluarRiesgo,
  filtrarBloqueos,
  parseReservaBody,
  requiereEmailObligatorio,
  retieneSlot,
} from "./helpers";

describe("requiereEmailObligatorio", () =>
{
  it("exige email por defecto (features activas)", () =>
  {
    expect(requiereEmailObligatorio(null)).toBe(true);
    expect(requiereEmailObligatorio({})).toBe(true);
    expect(requiereEmailObligatorio({ resena_activa: true })).toBe(true);
    expect(requiereEmailObligatorio({ recordatorio_activo: true })).toBe(true);
  });

  it("no lo exige si el negocio apagó reseñas y recordatorios", () =>
  {
    expect(requiereEmailObligatorio({ resena_activa: false, recordatorio_activo: false })).toBe(false);
  });
});

describe("parseReservaBody", () =>
{
  it("valida un cuerpo completo", () =>
  {
    const futuro = new Date(Date.now() + 60 * 60_000).toISOString();
    const result = parseReservaBody({
      pais: "AR",
      slug: "Demo",
      staffId: "staff-1",
      servicioId: "serv-1",
      inicio: futuro,
      nombre: "Juan Pérez",
      whatsapp: "+5491112345678",
      email: null,
    });

    expect(result.pais).toBe("ar");
    expect(result.slug).toBe("demo");
    expect(result.nombre).toBe("Juan Pérez");
  });

  it("rechaza nombre corto", () =>
  {
    const futuro = new Date(Date.now() + 60 * 60_000).toISOString();

    expect(() => parseReservaBody({
      pais: "AR",
      slug: "demo",
      staffId: "s",
      servicioId: "v",
      inicio: futuro,
      nombre: "x",
      whatsapp: "+5491112345678",
      email: null,
    })).toThrow();
  });
});

describe("retieneSlot", () =>
{
  it("retiene confirmado y pagado", () =>
  {
    const ahora = Date.now();

    expect(retieneSlot("confirmado", new Date(ahora - 3_600_000).toISOString(), ahora)).toBe(true);
    expect(retieneSlot("pagado", new Date(ahora - 3_600_000).toISOString(), ahora)).toBe(true);
  });

  it("libera pendiente vencido y otros estados", () =>
  {
    const ahora = Date.now();

    expect(retieneSlot("pendiente", new Date(ahora - 20 * 60_000).toISOString(), ahora)).toBe(false);
    expect(retieneSlot("pendiente", new Date(ahora - 5 * 60_000).toISOString(), ahora)).toBe(true);
    expect(retieneSlot("cancelado", new Date(ahora).toISOString(), ahora)).toBe(false);
  });
});

describe("filtrarBloqueos", () =>
{
  it("filtra solo bloqueantes", () =>
  {
    const ahora = Date.now();
    const bloqueos = filtrarBloqueos(
      [
        {
          inicio: new Date(ahora + 3_600_000).toISOString(),
          servicio_id: "s1",
          estado: "confirmado",
          created_at: new Date(ahora - 60_000).toISOString(),
        },
        {
          inicio: new Date(ahora + 3_600_000).toISOString(),
          servicio_id: "s1",
          estado: "cancelado",
          created_at: new Date(ahora - 60_000).toISOString(),
        },
      ],
      new Map([["s1", { duracion_min: 30 }]]),
      30,
      ahora,
    );

    expect(bloqueos).toHaveLength(1);
  });
});

describe("evaluarRiesgo", () =>
{
  it("calcula montos sin lista negra", () =>
  {
    const { outcome, montos } = evaluarRiesgo(null, 0, {
      sena_requerida: false,
      sena_porcentaje: 0,
      precio_base: 10000,
      precio_promocional: null,
    });

    expect(outcome.kind).not.toBe("rejected");
    expect(montos.montoTotal).toBe(10000);
  });
});
