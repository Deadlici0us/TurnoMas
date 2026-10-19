import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  PromocionService,
  type GuardarPromocionInput,
  type NegocioPlan,
  type Promocion,
  type PromocionRepositorio,
} from "./promociones";

const AHORA = new Date("2026-10-19T12:00:00Z");

/** Repositorio en memoria para probar el servicio sin Supabase. */
class FakeRepositorio implements PromocionRepositorio
{
  public readonly negocios = new Map<string, NegocioPlan>();
  public readonly promociones = new Map<string, Promocion>();
  public readonly sincronizaciones: Array<{
    negocioId: string;
    sincronizadoEn: Date | null;
    ultimoError: string | null;
  }> = [];
  private contador = 0;

  agregarNegocio(negocio: NegocioPlan): void
  {
    this.negocios.set(negocio.id, negocio);
  }

  agregarPromocion(promocion: Promocion): void
  {
    this.promociones.set(promocion.negocioId, promocion);
  }

  async obtenerVigente(negocioId: string, ahora: Date): Promise<Promocion | null>
  {
    const promo = this.promociones.get(negocioId) ?? null;

    if (promo === null || !promo.activo)
    {
      return null;
    }

    const desde = new Date(promo.vigenteDesde).getTime();
    const hasta = new Date(promo.vigenteHasta).getTime();

    return ahora.getTime() >= desde && ahora.getTime() < hasta ? promo : null;
  }

  async obtenerPorNegocio(negocioId: string): Promise<Promocion | null>
  {
    return this.promociones.get(negocioId) ?? null;
  }

  async guardar(input: GuardarPromocionInput): Promise<Promocion>
  {
    const existente = this.promociones.get(input.negocioId);
    this.contador += 1;

    const promo: Promocion = {
      id: existente?.id ?? `promo-${this.contador}`,
      negocioId: input.negocioId,
      porcentaje: input.porcentaje,
      motivo: input.motivo,
      vigenteDesde: input.vigenteDesde,
      vigenteHasta: input.vigenteHasta,
      activo: input.activo,
      sincronizadoEn: null,
      ultimoError: null,
      createdBy: input.createdBy,
    };

    this.promociones.set(input.negocioId, promo);

    return promo;
  }

  async desactivar(negocioId: string): Promise<void>
  {
    const promo = this.promociones.get(negocioId);

    if (promo !== undefined)
    {
      this.promociones.set(negocioId, { ...promo, activo: false, sincronizadoEn: null });
    }
  }

  async marcarSincronizacion(
    negocioId: string,
    sincronizadoEn: Date | null,
    ultimoError: string | null,
  ): Promise<void>
  {
    this.sincronizaciones.push({ negocioId, sincronizadoEn, ultimoError });
    const promo = this.promociones.get(negocioId);

    if (promo !== undefined)
    {
      this.promociones.set(negocioId, {
        ...promo,
        sincronizadoEn: sincronizadoEn?.toISOString() ?? null,
        ultimoError,
      });
    }
  }

  async obtenerNegocio(negocioId: string): Promise<NegocioPlan | null>
  {
    return this.negocios.get(negocioId) ?? null;
  }

  async listarNegocios(): Promise<NegocioPlan[]>
  {
    return [...this.negocios.values()];
  }

  async listarPromociones(): Promise<Promocion[]>
  {
    return [...this.promociones.values()];
  }
}

/** Negocio base con suscripción activa en ARS. */
function negocio(overrides: Partial<NegocioPlan> = {}): NegocioPlan
{
  return {
    id: "neg-1",
    nombre: "Barbería",
    slug: "barberia",
    pais: "ar",
    duenioId: "duenio-1",
    suscripcionMpId: "pre-1",
    suscripcionEstado: "active",
    ...overrides,
  };
}

/** Promo base vigente. */
function promo(overrides: Partial<Promocion> = {}): Promocion
{
  return {
    id: "promo-1",
    negocioId: "neg-1",
    porcentaje: 20,
    motivo: "Lanzamiento",
    vigenteDesde: "2026-10-01T00:00:00.000Z",
    vigenteHasta: "2026-11-01T00:00:00.000Z",
    activo: true,
    sincronizadoEn: null,
    ultimoError: null,
    createdBy: "admin@turnomas.com",
    ...overrides,
  };
}

/** Actualizador de MP que registra las llamadas. */
function actualizador()
{
  const llamadas: Array<{ preapprovalId: string; monto: number; currency: string }> = [];
  const fn = vi.fn(async (input: { preapprovalId: string; monto: number; currency: string }) =>
  {
    llamadas.push(input);
  });

  return { fn, llamadas };
}

let repo: FakeRepositorio;

beforeEach(() =>
{
  repo = new FakeRepositorio();
  repo.agregarNegocio(negocio());
});

describe("PromocionService.precioParaNegocio",
() =>
{
  it("debería aplicar la promo vigente al precio base",
  async () =>
  {
    repo.agregarPromocion(promo());
    const service = new PromocionService(repo, actualizador().fn);

    const resultado = await service.precioParaNegocio("neg-1", 14999, AHORA);

    expect(resultado.precio).toMatchObject({
      montoBase: 14999,
      montoFinal: 11999,
      porcentaje: 20,
      aplicada: true,
    });
  });

  it("debería devolver el precio base sin promo",
  async () =>
  {
    const service = new PromocionService(repo, actualizador().fn);

    const resultado = await service.precioParaNegocio("neg-1", 14999, AHORA);

    expect(resultado.precio.montoFinal).toBe(14999);
    expect(resultado.promocion).toBeNull();
  });
});

describe("PromocionService.aplicar",
() =>
{
  it("debería crear una promo nueva y actualizar MP con el precio descontado",
  async () =>
  {
    const { fn, llamadas } = actualizador();
    const service = new PromocionService(repo, fn);

    const resultado = await service.aplicar({
      negocioId: "neg-1",
      porcentaje: 20,
      meses: 3,
      motivo: "  Lanzamiento  ",
      createdBy: "admin@turnomas.com",
      ahora: AHORA,
    });

    expect(resultado.promocion.vigenteHasta).toBe("2027-01-19T12:00:00.000Z");
    expect(resultado.promocion.motivo).toBe("Lanzamiento");
    expect(resultado.sincronizacion).toEqual({
      monto: 11999,
      sincronizada: true,
      error: null,
    });
    expect(llamadas).toEqual([{ preapprovalId: "pre-1", monto: 11999, currency: "ARS" }]);
  });

  it("debería extender desde el vencimiento actual si la promo sigue vigente",
  async () =>
  {
    repo.agregarPromocion(promo({ vigenteHasta: "2026-12-01T00:00:00.000Z" }));
    const { fn } = actualizador();
    const service = new PromocionService(repo, fn);

    const resultado = await service.aplicar({
      negocioId: "neg-1",
      porcentaje: 30,
      meses: 2,
      motivo: null,
      createdBy: "admin@turnomas.com",
      ahora: AHORA,
    });

    expect(resultado.promocion.vigenteDesde).toBe("2026-10-01T00:00:00.000Z");
    expect(resultado.promocion.vigenteHasta).toBe("2027-02-01T00:00:00.000Z");
    expect(resultado.promocion.porcentaje).toBe(30);
  });

  it("debería extender desde ahora si la promo ya venció",
  async () =>
  {
    repo.agregarPromocion(promo({ vigenteHasta: "2026-09-01T00:00:00.000Z", activo: false }));
    const service = new PromocionService(repo, actualizador().fn);

    const resultado = await service.aplicar({
      negocioId: "neg-1",
      porcentaje: 15,
      meses: 1,
      motivo: null,
      createdBy: "admin@turnomas.com",
      ahora: AHORA,
    });

    expect(resultado.promocion.vigenteDesde).toBe("2026-10-19T12:00:00.000Z");
    expect(resultado.promocion.vigenteHasta).toBe("2026-11-19T12:00:00.000Z");
  });

  it("debería rechazar porcentajes y duraciones inválidas",
  async () =>
  {
    const service = new PromocionService(repo, actualizador().fn);
    const base = {
      negocioId: "neg-1",
      meses: 1,
      motivo: null,
      createdBy: "admin@turnomas.com",
      ahora: AHORA,
    };

    await expect(service.aplicar({ ...base, porcentaje: 0 })).rejects.toThrow("entre 1 y 99");
    await expect(service.aplicar({ ...base, porcentaje: 50, meses: 0 })).rejects.toThrow("entre 1 y 24");
  });
});

describe("PromocionService.finalizar",
() =>
{
  it("debería desactivar la promo y restaurar el precio base en MP",
  async () =>
  {
    repo.agregarPromocion(promo());
    const { fn, llamadas } = actualizador();
    const service = new PromocionService(repo, fn);

    const resultado = await service.finalizar("neg-1", AHORA);

    expect(resultado).toEqual({ monto: 14999, sincronizada: true, error: null });
    expect(repo.promociones.get("neg-1")?.activo).toBe(false);
    expect(llamadas).toEqual([{ preapprovalId: "pre-1", monto: 14999, currency: "ARS" }]);
  });
});

describe("PromocionService.sincronizar",
() =>
{
  it("debería marcar sincronizada sin llamar a MP cuando no hay suscripción",
  async () =>
  {
    repo.agregarNegocio(negocio({ suscripcionMpId: null }));
    repo.agregarPromocion(promo());
    const { fn, llamadas } = actualizador();
    const service = new PromocionService(repo, fn, async () => []);

    const resultado = await service.sincronizar("neg-1", AHORA);

    expect(resultado).toEqual({ monto: 11999, sincronizada: true, error: null });
    expect(llamadas).toEqual([]);
    expect(repo.sincronizaciones.at(-1)?.sincronizadoEn).toEqual(AHORA);
  });

  it("debería actualizar el checkout pendiente aunque no haya mp_id persistido",
  async () =>
  {
    repo.agregarNegocio(negocio({ suscripcionMpId: null }));
    repo.agregarPromocion(promo());
    const { fn, llamadas } = actualizador();
    const service = new PromocionService(repo, fn, async () => ["pre-pending"]);

    const resultado = await service.sincronizar("neg-1", AHORA);

    expect(resultado).toEqual({ monto: 11999, sincronizada: true, error: null });
    expect(llamadas).toEqual([{ preapprovalId: "pre-pending", monto: 11999, currency: "ARS" }]);
  });

  it("debería registrar el error de MP sin lanzar",
  async () =>
  {
    repo.agregarPromocion(promo());
    const service = new PromocionService(repo, async () =>
    {
      throw new Error("MP caído");
    });

    const resultado = await service.sincronizar("neg-1", AHORA);

    expect(resultado).toEqual({ monto: 11999, sincronizada: false, error: "MP caído" });
    expect(repo.promociones.get("neg-1")?.ultimoError).toBe("MP caído");
  });
});

describe("PromocionService.sincronizarPendientes",
() =>
{
  it("debería vencer promos y reaplicar las vigentes",
  async () =>
  {
    repo.agregarNegocio(negocio({ id: "neg-2", suscripcionMpId: "pre-2" }));
    repo.agregarPromocion(promo());
    repo.agregarPromocion(promo({
      id: "promo-2",
      negocioId: "neg-2",
      porcentaje: 10,
      vigenteHasta: "2026-10-01T00:00:00.000Z",
    }));
    const { fn, llamadas } = actualizador();
    const service = new PromocionService(repo, fn);

    const resumen = await service.sincronizarPendientes(AHORA);

    expect(resumen).toEqual({ revisadas: 2, sincronizadas: 2, errores: 0 });
    expect(repo.promociones.get("neg-2")?.activo).toBe(false);
    expect(llamadas).toEqual([
      { preapprovalId: "pre-1", monto: 11999, currency: "ARS" },
      { preapprovalId: "pre-2", monto: 14999, currency: "ARS" },
    ]);
  });

  it("debería contar errores sin cortar el barrido",
  async () =>
  {
    repo.agregarPromocion(promo());
    let llamada = 0;
    const service = new PromocionService(repo, async () =>
    {
      llamada += 1;
      throw new Error(`fallo ${llamada}`);
    });

    const resumen = await service.sincronizarPendientes(AHORA);

    expect(resumen).toEqual({ revisadas: 1, sincronizadas: 0, errores: 1 });
  });
});

describe("PromocionService.listarParaAdmin",
() =>
{
  it("debería devolver precio base, promo y precio final",
  async () =>
  {
    repo.agregarPromocion(promo());
    const service = new PromocionService(repo, actualizador().fn);

    const filas = await service.listarParaAdmin(AHORA);

    expect(filas).toHaveLength(1);
    expect(filas[0]).toMatchObject({
      negocio: { id: "neg-1", nombre: "Barbería" },
      promocion: { porcentaje: 20 },
      plan: { currency: "ARS" },
      precio: { montoBase: 14999, montoFinal: 11999, aplicada: true },
    });
  });

  it("debería mostrar precio base si la promo venció",  async () =>
  {
    repo.agregarPromocion(promo({
      vigenteDesde: "2026-09-01T00:00:00.000Z",
      vigenteHasta: "2026-10-01T00:00:00.000Z",
    }));
    const service = new PromocionService(repo, actualizador().fn);

    const filas = await service.listarParaAdmin(AHORA);

    expect(filas[0]?.precio.aplicada).toBe(false);
    expect(filas[0]?.precio.montoFinal).toBe(14999);
  });
});
