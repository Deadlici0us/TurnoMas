import { describe, expect, it } from "vitest";

import { coincideBusquedaCliente } from "@/lib/clientes/busqueda-clientes";

const CLIENTE = {
  nombre: "Ana Pérez",
  whatsapp: "+5491164534124",
  email: "ana@ejemplo.com",
} as const;

describe("coincideBusquedaCliente",
() =>
{
  it("debería devolver true con una consulta vacía",
  () =>
  {
    expect(coincideBusquedaCliente(CLIENTE, "   ")).toBe(true);
  });

  it("debería coincidir por nombre ignorando acentos y mayúsculas",
  () =>
  {
    expect(coincideBusquedaCliente(CLIENTE, "perez")).toBe(true);
    expect(coincideBusquedaCliente(CLIENTE, "ANA")).toBe(true);
  });

  it("debería coincidir por email",
  () =>
  {
    expect(coincideBusquedaCliente(CLIENTE, "ana@ejemplo")).toBe(true);
  });

  it("debería coincidir por WhatsApp en formatos argentinos",
  () =>
  {
    expect(coincideBusquedaCliente(CLIENTE, "11 6453-4124")).toBe(true);
    expect(coincideBusquedaCliente(CLIENTE, "1164534124")).toBe(true);
    expect(coincideBusquedaCliente(CLIENTE, "+54 9 11 6453 4124")).toBe(true);
  });

  it("debería coincidir por fragmento de WhatsApp",
  () =>
  {
    expect(coincideBusquedaCliente(CLIENTE, "6453")).toBe(true);
  });

  it("debería devolver false cuando no coincide ningún campo",
  () =>
  {
    expect(coincideBusquedaCliente(CLIENTE, "Bruno")).toBe(false);
  });

  it("debería tolerar clientes sin email",
  () =>
  {
    expect(coincideBusquedaCliente({ ...CLIENTE, email: null }, "ana")).toBe(true);
  });
});
