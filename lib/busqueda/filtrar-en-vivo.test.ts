import { describe, expect, it } from "vitest";

import { filtrarEnVivo } from "@/lib/busqueda/filtrar-en-vivo";

const ITEMS = [
  { id: "1", nombre: "Ana Pérez", servicio: "Corte" },
  { id: "2", nombre: "Bruno Díaz", servicio: "Color" },
] as const;

describe("filtrarEnVivo",
() =>
{
  it("debería devolver todos los items con una consulta vacía",
  () =>
  {
    expect(filtrarEnVivo(ITEMS, "  ", (item) => [item.nombre])).toEqual([...ITEMS]);
  });

  it("debería filtrar por los campos indicados",
  () =>
  {
    expect(filtrarEnVivo(ITEMS, "color", (item) => [item.nombre, item.servicio]))
      .toEqual([ITEMS[1]]);
  });

  it("debería devolver una lista vacía cuando no hay coincidencias",
  () =>
  {
    expect(filtrarEnVivo(ITEMS, "turno", (item) => [item.nombre])).toEqual([]);
  });

  it("debería no mutar la lista original",
  () =>
  {
    const original = [...ITEMS];

    filtrarEnVivo(ITEMS, "ana", (item) => [item.nombre]);

    expect(ITEMS).toEqual(original);
  });
});
