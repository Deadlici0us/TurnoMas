import { describe, expect, it } from "vitest";

import { buildDemoSeed } from "./demo-rows";

describe("buildDemoSeed",
() =>
{
  it("debería armar la cuenta demo con negocio, agenda y clientes",
  () =>
  {
    const seed = buildDemoSeed("11111111-1111-4111-8111-111111111111");

    expect(seed.negocio.slug).toBe("barberia-diego");
    expect(seed.negocio.pais).toBe("ar");
    expect(seed.negocio.duenio_id).toBe("11111111-1111-4111-8111-111111111111");
    expect(seed.staff).toHaveLength(2);
    expect(seed.servicios).toHaveLength(3);
    expect(seed.clientes).toHaveLength(3);
    expect(seed.turnos).toHaveLength(3);
  });

  it("debería cablear las claves foráneas contra el negocio y el staff",
  () =>
  {
    const seed = buildDemoSeed("11111111-1111-4111-8111-111111111111");
    const staffIds = new Set(seed.staff.map((s) => s.id));
    const servicioIds = new Set(seed.servicios.map((s) => s.id));
    const clienteIds = new Set(seed.clientes.map((c) => c.id));

    for (const turno of seed.turnos)
    {
      expect(turno.negocio_id).toBe(seed.negocio.id);
      expect(staffIds.has(turno.staff_id)).toBe(true);
      expect(servicioIds.has(turno.servicio_id)).toBe(true);
      expect(clienteIds.has(turno.cliente_id)).toBe(true);
    }
  });

  it("debería incluir un cliente que dispare la lista negra con umbral 2",
  () =>
  {
    const seed = buildDemoSeed("11111111-1111-4111-8111-111111111111");

    expect(seed.clientes.some((c) => c.ausencias >= 2)).toBe(true);
  });

  it("debería rechazar un dueño vacío",
  () =>
  {
    expect(() => buildDemoSeed("")).toThrow(RangeError);
    expect(() => buildDemoSeed("   ")).toThrow(RangeError);
  });
});
