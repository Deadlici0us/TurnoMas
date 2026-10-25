import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { subirLogoNegocio } from "./actions";
import { getNegocioIdDelDueno } from "@/lib/dashboard/negocio";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

vi.mock("next/cache", () =>
{
  return { revalidatePath: vi.fn() };
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
const mockServer = vi.mocked(getSupabaseServer);
const mockAdmin = vi.mocked(getSupabaseAdmin);
const mockNegocio = vi.mocked(getNegocioIdDelDueno);

interface Capturas
{
  readonly escrituras: unknown[];
  readonly subidas: Array<{
    readonly bucket: string;
    readonly path: string;
    readonly body: Buffer;
    readonly contentType: string | undefined;
  }>;
  readonly eliminaciones: Array<{ readonly bucket: string; readonly paths: readonly string[] }>;
}

interface StubOptions
{
  readonly logoActual?: string | null;
  readonly uploadError?: { readonly message: string } | null;
  readonly updateError?: { readonly message: string } | null;
  readonly readError?: { readonly message: string } | null;
}

/** Query encadenable y awaitable, suficiente para los stubs de Supabase. */
function chain(result: unknown)
{
  const query: Record<string, unknown> = {};
  query.eq = () => query;
  query.maybeSingle = () => query;
  query.single = () => query;
  query.then = (resolve: (value: unknown) => unknown) => resolve(result);

  return query;
}

/** Stub del admin con storage y escrituras observables. */
function stubAdmin(options: StubOptions = {}): Capturas
{
  const capturas: Capturas = { escrituras: [], subidas: [], eliminaciones: [] };

  mockAdmin.mockReturnValue({
    from: (tabla: string) => ({
      select: () => chain({
        data: tabla === "negocios" ? { logo_url: options.logoActual ?? null } : null,
        error: options.readError ?? null,
      }),
      update: (fila: unknown) =>
      {
        capturas.escrituras.push(fila);

        return {
          eq: async () => ({ error: options.updateError ?? null }),
        };
      },
    }),
    storage: {
      from: (bucket: string) => ({
        upload: async (
          path: string,
          body: Buffer,
          opciones: { readonly contentType?: string } = {},
        ) =>
        {
          capturas.subidas.push({
            bucket,
            path,
            body: Buffer.from(body),
            contentType: opciones.contentType,
          });

          return { error: options.uploadError ?? null };
        },
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://cdn.test/logos/${path}` },
        }),
        remove: async (paths: readonly string[]) =>
        {
          capturas.eliminaciones.push({ bucket, paths });

          return { error: null };
        },
      }),
    },
  } as never);

  return capturas;
}

/** Sesión de dueño autenticado con negocio resuelto. */
function sesionDueno(): void
{
  mockServer.mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: { id: "user-1" } } }) },
  } as never);
  mockNegocio.mockResolvedValue("neg-1");
}

/** Sesión sin usuario autenticado. */
function sinSesion(): void
{
  mockServer.mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: null } }) },
  } as never);
}

/** JPEG de prueba de 600×400. */
async function jpegDePrueba(): Promise<Buffer>
{
  return sharp({
    create: {
      width: 600,
      height: 400,
      channels: 3,
      background: { r: 30, g: 120, b: 200 },
    },
  }).jpeg().toBuffer();
}

/** Arma el FormData de la Server Action con un archivo. */
function formDataDeArchivo(buffer: Buffer, tipo = "image/jpeg"): FormData
{
  const formData = new FormData();

  formData.set("archivo", new File([new Uint8Array(buffer)], "logo.jpg", { type: tipo }));

  return formData;
}

beforeEach(() =>
{
  vi.clearAllMocks();
});

describe("subirLogoNegocio",
() =>
{
  it("debería normalizar, subir y persistir el logo como JPEG 512×512",
  async () =>
  {
    sesionDueno();
    const capturas = stubAdmin({ logoActual: null });

    const result = await subirLogoNegocio(formDataDeArchivo(await jpegDePrueba()));

    expect(result.url).toMatch(/^https:\/\/cdn\.test\/logos\/negocio\/neg-1\/.+\.jpg$/);
    expect(capturas.subidas[0]).toMatchObject({
      bucket: "logos",
      contentType: "image/jpeg",
    });
    expect(capturas.subidas[0]?.path).toMatch(/^negocio\/neg-1\/.+\.jpg$/);
    expect(capturas.escrituras[0]).toEqual({ logo_url: result.url });
    expect(mockRevalidate).toHaveBeenCalledWith("/dashboard/config");

    const meta = await sharp(capturas.subidas[0]?.body).metadata();

    expect(meta.format).toBe("jpeg");
    expect(meta.width).toBe(512);
    expect(meta.height).toBe(512);
  });

  it("debería borrar el logo anterior del mismo negocio",
  async () =>
  {
    sesionDueno();
    const capturas = stubAdmin({
      logoActual: "https://cdn.test/storage/v1/object/public/logos/negocio/neg-1/anterior.jpg",
    });

    await subirLogoNegocio(formDataDeArchivo(await jpegDePrueba()));

    expect(capturas.eliminaciones).toContainEqual({
      bucket: "logos",
      paths: ["negocio/neg-1/anterior.jpg"],
    });
  });

  it("debería rechazar un archivo que no es JPEG real",
  async () =>
  {
    sesionDueno();
    const capturas = stubAdmin();
    const png = await sharp({
      create: {
        width: 300,
        height: 300,
        channels: 3,
        background: { r: 200, g: 30, b: 60 },
      },
    }).png().toBuffer();

    await expect(subirLogoNegocio(formDataDeArchivo(png)))
      .rejects.toThrow(/JPEG/);
    expect(capturas.subidas).toHaveLength(0);
  });

  it("debería rechazar un archivo que no se declara JPEG",
  async () =>
  {
    sesionDueno();
    stubAdmin();

    await expect(subirLogoNegocio(formDataDeArchivo(await jpegDePrueba(), "image/png")))
      .rejects.toThrow(/JPEG/);
  });

  it("debería exigir sesión iniciada",
  async () =>
  {
    sinSesion();
    stubAdmin();

    await expect(subirLogoNegocio(formDataDeArchivo(await jpegDePrueba())))
      .rejects.toThrow("Tenés que iniciar sesión para cambiar el logo.");
  });

  it("debería limpiar el archivo subido si falla el guardado",
  async () =>
  {
    sesionDueno();
    const capturas = stubAdmin({ updateError: { message: "db caída" } });

    await expect(subirLogoNegocio(formDataDeArchivo(await jpegDePrueba())))
      .rejects.toThrow("No pudimos guardar el logo. Probá de nuevo.");
    expect(capturas.eliminaciones[0]?.paths[0]).toMatch(/^negocio\/neg-1\//);
  });

  it("debería fallar si no puede leer el logo anterior",
  async () =>
  {
    sesionDueno();
    stubAdmin({ readError: { message: "db caída" } });

    await expect(subirLogoNegocio(formDataDeArchivo(await jpegDePrueba())))
      .rejects.toThrow("No pudimos guardar el logo. Probá de nuevo.");
  });
});
