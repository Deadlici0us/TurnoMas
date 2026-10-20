import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  actualizarCliente,
  ajustarAusencia,
  cambiarBloqueoCliente,
  crearCliente,
  eliminarCliente,
} from "./actions";
import { assertModoEditable } from "@/lib/auth/demo-guard";
import { getNegocioIdDelDueno } from "@/lib/dashboard/negocio";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

vi.mock("next/cache", () =>
{
  return { revalidatePath: vi.fn() };
});

vi.mock("@/lib/auth/demo-guard", () =>
{
  return { assertModoEditable: vi.fn() };
});

vi.mock("@/lib/supabase/server", () =>
{
  return { getSupabaseServer: vi.fn() };
});

vi.mock("@/lib/supabase/admin", () =>
{
  return { getSupabaseAdmin: vi.fn() };
});

vi.mock("@/lib/dashboard/negocio", () =>
{
  return { getNegocioIdDelDueno: vi.fn() };
});

const mockRevalidate = vi.mocked(revalidatePath);
const mockAssert = vi.mocked(assertModoEditable);
const mockServer = vi.mocked(getSupabaseServer);
const mockAdmin = vi.mocked(getSupabaseAdmin);
const mockNegocio = vi.mocked(getNegocioIdDelDueno);

/** Sesión de dueño autenticado con negocio resuelto. */
function sesionDueno(): void
{
  mockAssert.mockResolvedValue(undefined);
  mockServer.mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: { id: "user-1" } } }) },
  } as never);
  mockNegocio.mockResolvedValue("neg-1");
}

/**
 * FormData con los campos del formulario de clientes.
 *
 * @param entries Pares clave/valor del formulario.
 */
function formulario(entries: Record<string, string>): FormData
{
  const formData = new FormData();

  for (const [key, value] of Object.entries(entries))
  {
    formData.append(key, value);
  }

  return formData;
}

/**
 * Stub completo: `.single()` resuelve `data`, escrituras capturan `filas`.
 *
 * @param data Fila para `.single()`.
 * @param error Error de escritura o null.
 * @param filas Filas capturadas por insert/update.
 */
function stubSingle(
  data: unknown,
  error: { code?: string; message?: string } | null = null,
  filas: unknown[] = [],
): void
{
  const admin = {
    from: vi.fn(() => ({
      insert: vi.fn(async (fila: unknown) =>
      {
        filas.push(fila);

        return { error };
      }),
      update: vi.fn((fila: unknown) =>
      {
        filas.push(fila);

        return {
          eq: vi.fn(() => ({
            eq: vi.fn(async () => ({ error })),
          })),
        };
      }),
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(async () => ({ error })),
        })),
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: async () => ({ data }),
          })),
        })),
      })),
    })),
  };

  mockAdmin.mockReturnValue(admin as never);
}

beforeEach(() =>
{
  vi.clearAllMocks();
});

describe("crearCliente",
() =>
{
  it("debería crear el cliente normalizando el WhatsApp",
  async () =>
  {
    sesionDueno();
    const filas: unknown[] = [];
    stubSingle(null, null, filas);

    await crearCliente(formulario({ nombre: "  Juan Pérez  ", whatsapp: "+54 9 11-1234-5678" }));

    expect(filas).toEqual([{
      negocio_id: "neg-1",
      nombre: "Juan Pérez",
      whatsapp: "+5491112345678",
      email: null,
    }]);
    expect(mockRevalidate).toHaveBeenCalledWith("/dashboard/clientes");
  });

  it("debería rechazar nombres cortos",
  async () =>
  {
    sesionDueno();
    stubSingle(null);

    await expect(crearCliente(formulario({ nombre: "x", whatsapp: "+5491112345678" })))
      .rejects.toThrow("El nombre tiene que tener entre 2 y 80 caracteres.");
  });

  it("debería rechazar WhatsApp inválidos",
  async () =>
  {
    sesionDueno();
    stubSingle(null);

    await expect(crearCliente(formulario({ nombre: "Juan", whatsapp: "abc" })))
      .rejects.toThrow("El WhatsApp solo puede tener números");
  });

  it("debería avisar duplicados por WhatsApp (23505)",
  async () =>
  {
    sesionDueno();
    stubSingle(null, { code: "23505" });

    await expect(crearCliente(formulario({ nombre: "Juan", whatsapp: "+5491112345678" })))
      .rejects.toThrow("Ya existe un cliente con ese WhatsApp.");
  });

  it("debería guardar el email normalizado",
  async () =>
  {
    sesionDueno();
    const filas: unknown[] = [];
    stubSingle(null, null, filas);

    await crearCliente(formulario({
      nombre: "Juan",
      whatsapp: "11 15 6453-4124",
      email: "  Juan@Ejemplo.COM ",
    }));

    expect(filas).toEqual([{
      negocio_id: "neg-1",
      nombre: "Juan",
      whatsapp: "+5491164534124",
      email: "juan@ejemplo.com",
    }]);
  });

  it("debería rechazar emails con caracteres inválidos",
  async () =>
  {
    sesionDueno();
    stubSingle(null);

    await expect(crearCliente(formulario({
      nombre: "Juan",
      whatsapp: "+5491112345678",
      email: "juan@ejemplo.com}",
    }))).rejects.toThrow("El email no puede tener espacios ni caracteres inválidos");
  });

  it("debería lanzar genérico ante otros errores",
  async () =>
  {
    sesionDueno();
    stubSingle(null, { code: "500" });

    await expect(crearCliente(formulario({ nombre: "Juan", whatsapp: "+5491112345678" })))
      .rejects.toThrow("No pudimos crear el cliente. Probá de nuevo.");
  });

  it("debería exigir sesión iniciada",
  async () =>
  {
    mockAssert.mockResolvedValue(undefined);
    mockServer.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null } }) },
    } as never);

    await expect(crearCliente(formulario({ nombre: "Juan", whatsapp: "+5491112345678" })))
      .rejects.toThrow("Tenés que iniciar sesión para modificar clientes.");
  });
});

describe("ajustarAusencia",
() =>
{
  it("debería sumar una ausencia",
  async () =>
  {
    sesionDueno();
    const filas: unknown[] = [];
    stubSingle({ ausencias: 2 }, null, filas);

    await ajustarAusencia("cli-1", 1);

    expect(filas).toEqual([{ ausencias: 3 }]);
  });

  it("debería no bajar de cero ausencias",
  async () =>
  {
    sesionDueno();
    const filas: unknown[] = [];
    stubSingle({ ausencias: 0 }, null, filas);

    await ajustarAusencia("cli-1", -1);

    expect(filas).toEqual([{ ausencias: 0 }]);
  });

  it("debería avisar cuando el cliente no existe",
  async () =>
  {
    sesionDueno();
    stubSingle(null);

    await expect(ajustarAusencia("missing", 1)).rejects.toThrow("No encontramos ese cliente.");
  });

  it("debería lanzar cuando la actualización falla",
  async () =>
  {
    sesionDueno();
    stubSingle({ ausencias: 2 }, { message: "db" });

    await expect(ajustarAusencia("cli-1", 1))
      .rejects.toThrow("No pudimos actualizar las ausencias. Probá de nuevo.");
  });
});

describe("cambiarBloqueoCliente",
() =>
{
  it("debería bloquear y desbloquear al cliente",
  async () =>
  {
    sesionDueno();
    const filas: unknown[] = [];
    stubSingle(null, null, filas);

    await cambiarBloqueoCliente("cli-1", true);

    expect(filas).toEqual([{ bloqueado: true }]);
  });

  it("debería lanzar cuando la actualización falla",
  async () =>
  {
    sesionDueno();
    stubSingle(null, {});

    await expect(cambiarBloqueoCliente("cli-1", false))
      .rejects.toThrow("No pudimos actualizar el cliente. Probá de nuevo.");
  });
});

describe("eliminarCliente",
() =>
{
  it("debería eliminar al cliente sin turnos",
  async () =>
  {
    sesionDueno();
    stubSingle(null);

    await expect(eliminarCliente("cli-1")).resolves.toBeUndefined();
  });

  it("debería sugerir bloquear con turnos asociados (23503)",
  async () =>
  {
    sesionDueno();
    stubSingle(null, { code: "23503" });

    await expect(eliminarCliente("cli-1"))
      .rejects.toThrow("No se puede eliminar porque tiene turnos. Bloquealo en su lugar.");
  });

  it("debería lanzar genérico ante otros errores",
  async () =>
  {
    sesionDueno();
    stubSingle(null, { code: "500" });

    await expect(eliminarCliente("cli-1"))
      .rejects.toThrow("No pudimos eliminar el cliente. Probá de nuevo.");
  });
});

describe("crearCliente integración",
() =>
{
  it("debería validar, persistir y revalidar punta a punta",
  async () =>
  {
    sesionDueno();
    const filas: unknown[] = [];
    stubSingle(null, null, filas);

    await crearCliente(formulario({ nombre: "Ana", whatsapp: "1155556666" }));

    expect(filas).toEqual([{
      negocio_id: "neg-1",
      nombre: "Ana",
      whatsapp: "+5491155556666",
      email: null,
    }]);
    expect(mockRevalidate).toHaveBeenCalledTimes(1);
  });
});

describe("actualizarCliente",
() =>
{
  it("debería actualizar nombre, WhatsApp canónico y email",
  async () =>
  {
    sesionDueno();
    const filas: unknown[] = [];
    stubSingle(null, null, filas);

    await actualizarCliente("cli-1", formulario({
      nombre: "  Juan Pérez  ",
      whatsapp: "+54 11 15 6453-4124",
      email: "  Juan@Ejemplo.COM ",
    }));

    expect(filas).toEqual([{
      nombre: "Juan Pérez",
      whatsapp: "+5491164534124",
      email: "juan@ejemplo.com",
    }]);
    expect(mockRevalidate).toHaveBeenCalledWith("/dashboard/clientes");
    expect(mockRevalidate).toHaveBeenCalledWith("/dashboard/clientes/cli-1");
  });

  it("debería aceptar email vacío como null", async () =>
  {
    sesionDueno();
    const filas: unknown[] = [];
    stubSingle(null, null, filas);

    await actualizarCliente("cli-1", formulario({
      nombre: "Juan",
      whatsapp: "1164534124",
      email: "   ",
    }));

    expect(filas).toEqual([{ nombre: "Juan", whatsapp: "+5491164534124", email: null }]);
  });

  it("debería avisar cuando el WhatsApp ya pertenece a otro cliente", async () =>
  {
    sesionDueno();
    stubSingle(null, { code: "23505" });

    await expect(actualizarCliente("cli-1", formulario({
      nombre: "Juan",
      whatsapp: "1164534124",
      email: "",
    }))).rejects.toThrow("Ese WhatsApp ya pertenece a otro cliente.");
  });

  it("debería rechazar un email inválido antes de escribir", async () =>
  {
    sesionDueno();
    const filas: unknown[] = [];
    stubSingle(null, null, filas);

    await expect(actualizarCliente("cli-1", formulario({
      nombre: "Juan",
      whatsapp: "1164534124",
      email: "juan@ejemplo",
    }))).rejects.toThrow("El email no puede tener espacios ni caracteres inválidos");

    expect(filas).toHaveLength(0);
  });

  it("debería lanzar genérico ante otros errores", async () =>
  {
    sesionDueno();
    stubSingle(null, { code: "500" });

    await expect(actualizarCliente("cli-1", formulario({
      nombre: "Juan",
      whatsapp: "1164534124",
      email: "",
    }))).rejects.toThrow("No pudimos actualizar el cliente. Probá de nuevo.");
  });
});
