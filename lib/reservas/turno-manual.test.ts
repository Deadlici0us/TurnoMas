import { describe, expect, it } from "vitest";

import { parseTurnoManualInput } from "@/lib/reservas/turno-manual";

function base(overrides: Record<string, unknown> = {})
{
  return {
    staffId: "staff-1",
    servicioId: "serv-1",
    clienteId: "",
    nombre: "Juan Pérez",
    whatsapp: "+549110000001",
    email: "",
    fecha: "2026-10-06",
    hora: "10:30",
    estado: "confirmado",
    ...overrides,
  };
}

describe("parseTurnoManualInput",
() =>
{
  it("debería normalizar un turno confirmado sin email",
  () =>
  {
    expect(parseTurnoManualInput(base())).toEqual({
      staffId: "staff-1",
      servicioId: "serv-1",
      clienteId: null,
      nombre: "Juan Pérez",
      whatsapp: "+549110000001",
      email: null,
      fecha: "2026-10-06",
      hora: "10:30",
      estado: "confirmado",
    });
  });

  it("debería aceptar email y estado pagado",
  () =>
  {
    const resultado = parseTurnoManualInput(base({
      email: " Juan@Ejemplo.com ",
      estado: "pagado",
      clienteId: " cli-1 ",
    }));

    expect(resultado.email).toBe("juan@ejemplo.com");
    expect(resultado.estado).toBe("pagado");
    expect(resultado.clienteId).toBe("cli-1");
  });

  it("debería limpiar espacios y guiones del WhatsApp",
  () =>
  {
    expect(parseTurnoManualInput(base({ whatsapp: "+54 911 000-0001" })).whatsapp).toBe("+549110000001");
  });

  it("debería rechazar nombre, WhatsApp y email inválidos",
  () =>
  {
    expect(() => parseTurnoManualInput(base({ nombre: "J" }))).toThrow("entre 2 y 80");
    expect(() => parseTurnoManualInput(base({ whatsapp: "123" }))).toThrow("WhatsApp");
    expect(() => parseTurnoManualInput(base({ email: "no-es-email" }))).toThrow("email");
  });

  it("debería rechazar estado, fecha u hora inválidos",
  () =>
  {
    expect(() => parseTurnoManualInput(base({ estado: "pendiente" }))).toThrow("estado válido");
    expect(() => parseTurnoManualInput(base({ fecha: "06/10/2026" }))).toThrow("fecha válida");
    expect(() => parseTurnoManualInput(base({ hora: "10h" }))).toThrow("hora válida");
  });

  it("debería exigir profesional y servicio", () =>
  {
    expect(() => parseTurnoManualInput(base({ staffId: "" }))).toThrow("profesional");
    expect(() => parseTurnoManualInput(base({ servicioId: "  " }))).toThrow("servicio");
  });
});
