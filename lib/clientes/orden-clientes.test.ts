import { describe, expect, it } from "vitest";

import { ordenarClientesPorNombre } from "@/lib/clientes/orden-clientes";

describe("ordenarClientesPorNombre",
() =>
{
  it("debería ordenar alfabéticamente ignorando mayúsculas y acentos",
  () =>
  {
    const clientes = [
      { id: "1", nombre: "Zoe" },
      { id: "2", nombre: "Álvaro" },
      { id: "3", nombre: "benito" },
      { id: "4", nombre: "Ana" },
    ];

    expect(ordenarClientesPorNombre(clientes).map((cliente) => cliente.nombre))
      .toEqual(["Álvaro", "Ana", "benito", "Zoe"]);
  });

  it("debería no mutar la lista original",
  () =>
  {
    const clientes = [
      { id: "1", nombre: "Zoe" },
      { id: "2", nombre: "Ana" },
    ];

    ordenarClientesPorNombre(clientes);

    expect(clientes.map((cliente) => cliente.nombre)).toEqual(["Zoe", "Ana"]);
  });
});
