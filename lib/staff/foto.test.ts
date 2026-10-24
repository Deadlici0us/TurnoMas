import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { esJpeg, normalizarFotoPerfil, rutaFotoDelBucket } from "./foto";
import { FOTO_LADO_SALIDA } from "./foto-limites";

/** Genera un JPEG sólido de las dimensiones indicadas. */
async function jpegDe(ancho: number, alto: number): Promise<Buffer>
{
  return sharp({
    create: {
      width: ancho,
      height: alto,
      channels: 3,
      background: { r: 20, g: 80, b: 140 },
    },
  }).jpeg().toBuffer();
}

describe("normalizarFotoPerfil",
() =>
{
  it("debería convertir la imagen a JPEG cuadrado de 512x512",
  async () =>
  {
    const salida = await normalizarFotoPerfil(await jpegDe(1200, 800));
    const meta = await sharp(salida).metadata();

    expect(meta.format).toBe("jpeg");
    expect(meta.width).toBe(FOTO_LADO_SALIDA);
    expect(meta.height).toBe(FOTO_LADO_SALIDA);
  });

  it("debería rechazar imágenes menores a 200x200",
  async () =>
  {
    await expect(normalizarFotoPerfil(await jpegDe(120, 120)))
      .rejects.toThrow(/al menos 200/);
  });

  it("debería rechazar imágenes que superan el lado máximo",
  async () =>
  {
    await expect(normalizarFotoPerfil(await jpegDe(8001, 200)))
      .rejects.toThrow(/más de 8000/);
  });

  it("debería rechazar formatos que no sean JPEG",
  async () =>
  {
    const png = await sharp({
      create: {
        width: 300,
        height: 300,
        channels: 3,
        background: { r: 200, g: 30, b: 60 },
      },
    }).png().toBuffer();

    await expect(normalizarFotoPerfil(png)).rejects.toThrow(/JPEG/);
  });

  it("debería rechazar archivos corruptos",
  async () =>
  {
    await expect(normalizarFotoPerfil(Buffer.from("no es una imagen")))
      .rejects.toThrow(/JPEG/);
  });
});

describe("esJpeg",
() =>
{
  it("debería reconocer los magic bytes de un JPEG",
  async () =>
  {
    expect(esJpeg(await jpegDe(300, 300))).toBe(true);
  });

  it("debería rechazar otros contenidos", () =>
  {
    expect(esJpeg(Buffer.from("PNG"))).toBe(false);
    expect(esJpeg(Buffer.from([0xff, 0xd8]))).toBe(false);
  });
});

describe("rutaFotoDelBucket",
() =>
{
  it("debería extraer la ruta pública del bucket logos",
  () =>
  {
    expect(rutaFotoDelBucket(
      "https://proyecto.supabase.co/storage/v1/object/public/logos/staff/s1/foto.jpg",
    )).toBe("staff/s1/foto.jpg");
  });

  it("debería devolver null para URLs externas o inválidas", () =>
  {
    expect(rutaFotoDelBucket("https://cdn.test/foto.jpg")).toBeNull();
    expect(rutaFotoDelBucket("no-es-url")).toBeNull();
    expect(rutaFotoDelBucket(null)).toBeNull();
  });
});
