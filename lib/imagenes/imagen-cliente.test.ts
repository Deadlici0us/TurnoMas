import { afterEach, describe, expect, it, vi } from "vitest";

import {
  calcularRecorteCuadrado,
  convertirImagenCuadrada,
  validarArchivoImagen,
} from "./imagen-cliente";
import { IMAGEN_LADO_SALIDA } from "./imagen-limites";

/** Crea un archivo de prueba con el tipo y tamaño indicados. */
function archivo(nombre: string, tipo: string, bytes = 16): File
{
  return new File([new Uint8Array(bytes)], nombre, { type: tipo });
}

afterEach(() =>
{
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("calcularRecorteCuadrado",
() =>
{
  it("debería recortar el ancho de una imagen horizontal",
  () =>
  {
    expect(calcularRecorteCuadrado(1200, 800)).toEqual({ sx: 200, sy: 0, lado: 800 });
  });

  it("debería recortar el alto de una imagen vertical",
  () =>
  {
    expect(calcularRecorteCuadrado(800, 1200)).toEqual({ sx: 0, sy: 200, lado: 800 });
  });

  it("debería dejar intacta una imagen cuadrada",
  () =>
  {
    expect(calcularRecorteCuadrado(600, 600)).toEqual({ sx: 0, sy: 0, lado: 600 });
  });
});

describe("validarArchivoImagen",
() =>
{
  it("debería aceptar JPG, PNG y WebP",
  () =>
  {
    expect(() => validarArchivoImagen(archivo("foto.jpg", "image/jpeg"))).not.toThrow();
    expect(() => validarArchivoImagen(archivo("foto.png", "image/png"))).not.toThrow();
    expect(() => validarArchivoImagen(archivo("foto.webp", "image/webp"))).not.toThrow();
  });

  it("debería rechazar archivos que no son imagen",
  () =>
  {
    expect(() => validarArchivoImagen(archivo("doc.pdf", "application/pdf")))
      .toThrow(/JPG, PNG o WebP/);
  });

  it("debería rechazar archivos de más de 8 MB",
  () =>
  {
    expect(() => validarArchivoImagen(archivo("foto.jpg", "image/jpeg", 9 * 1024 * 1024)))
      .toThrow(/8 MB/);
  });
});

describe("convertirImagenCuadrada",
() =>
{
  /** Prepara canvas y decodificación simulados para el entorno jsdom. */
  function prepararNavegador(ancho: number, alto: number): { drawImage: ReturnType<typeof vi.fn> }
  {
    const drawImage = vi.fn();
    const contexto = {
      fillStyle: "",
      fillRect: vi.fn(),
      drawImage,
      imageSmoothingEnabled: false,
      imageSmoothingQuality: "low",
    };

    vi.spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockReturnValue(contexto as never);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob")
      .mockImplementation((callback: BlobCallback) =>
      {
        callback(new Blob(["jpeg"], { type: "image/jpeg" }));
      });
    vi.stubGlobal("createImageBitmap", vi.fn(async () => ({
      width: ancho,
      height: alto,
      close: vi.fn(),
    })));

    return { drawImage };
  }

  it("debería recortar, redimensionar y exportar como JPEG",
  async () =>
  {
    const { drawImage } = prepararNavegador(1000, 600);

    const blob = await convertirImagenCuadrada(archivo("foto.jpg", "image/jpeg"));

    expect(blob.type).toBe("image/jpeg");
    expect(drawImage).toHaveBeenCalledWith(
      expect.anything(), 200, 0, 600, 600, 0, 0, IMAGEN_LADO_SALIDA, IMAGEN_LADO_SALIDA,
    );
  });

  it("debería rechazar imágenes menores a 200x200",
  async () =>
  {
    prepararNavegador(120, 120);

    await expect(convertirImagenCuadrada(archivo("foto.jpg", "image/jpeg")))
      .rejects.toThrow(/al menos 200/);
  });

  it("debería rechazar imágenes que superan el lado máximo",
  async () =>
  {
    prepararNavegador(9000, 300);

    await expect(convertirImagenCuadrada(archivo("foto.jpg", "image/jpeg")))
      .rejects.toThrow(/más de 8000/);
  });

  it("debería informar cuando el navegador no puede decodificar",
  async () =>
  {
    vi.stubGlobal("createImageBitmap", vi.fn(async () =>
    {
      throw new Error("decode error");
    }));

    await expect(convertirImagenCuadrada(archivo("foto.jpg", "image/jpeg")))
      .rejects.toThrow(/No pudimos procesar/);
  });
});
