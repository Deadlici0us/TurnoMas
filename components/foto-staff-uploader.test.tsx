import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import FotoStaffUploader from "./foto-staff-uploader";
import { convertirImagenCuadrada } from "@/lib/imagenes/imagen-cliente";

vi.mock("@/lib/imagenes/imagen-cliente", async (importOriginal) =>
{
  const actual = await importOriginal<typeof import("@/lib/imagenes/imagen-cliente")>();

  return {
    ...actual,
    convertirImagenCuadrada: vi.fn(async () => new Blob(["jpeg"], { type: "image/jpeg" })),
  };
});

const mockConvertir = vi.mocked(convertirImagenCuadrada);

function archivo(nombre: string, tipo: string, bytes = 16): File
{
  return new File([new Uint8Array(bytes)], nombre, { type: tipo });
}

function subidaOk()
{
  return vi.fn<(formData: FormData) => Promise<{
    readonly ok: true;
    readonly data: { readonly url: string };
  }>>(async () => ({
    ok: true as const,
    data: { url: "https://cdn.test/staff/s1/x.jpg" },
  }));
}

function quitarOk()
{
  return vi.fn(async () => ({ ok: true as const, data: undefined }));
}

beforeEach(() =>
{
  vi.clearAllMocks();
  mockConvertir.mockResolvedValue(new Blob(["jpeg"], { type: "image/jpeg" }));
});

describe("FotoStaffUploader",
() =>
{
  it("debería mostrar el texto completo cuando no hay archivo",
  () =>
  {
    render(
      <FotoStaffUploader
        staffId="s1"
        nombre="Diego"
        fotoUrl={null}
        subir={subidaOk()}
        quitar={quitarOk()}
      />,
    );

    expect(screen.getByText("Sin archivo seleccionado")).toBeDefined();
    expect(screen.getByRole("button", { name: "Elegir imagen" })).toBeDefined();
  });

  it("debería subir el JPEG convertido y persistir la URL",
  async () =>
  {
    const subir = subidaOk();

    render(
      <FotoStaffUploader
        staffId="s1"
        nombre="Diego"
        fotoUrl={null}
        subir={subir}
        quitar={quitarOk()}
      />,
    );

    await act(async () =>
    {
      fireEvent.change(screen.getByLabelText("Foto de Diego"), {
        target: { files: [archivo("foto.png", "image/png")] },
      });
    });

    await vi.waitFor(() => expect(subir).toHaveBeenCalledOnce());

    const formData = subir.mock.calls[0]?.[0] as FormData;
    const enviado = formData.get("archivo");

    expect(enviado).toBeInstanceOf(File);
    expect((enviado as File).type).toBe("image/jpeg");
    expect(mockConvertir).toHaveBeenCalledOnce();
    expect(await screen.findByRole("img", { name: "Diego" })).toHaveAttribute(
      "src", "https://cdn.test/staff/s1/x.jpg");
  });

  it("debería rechazar archivos que no son imagen",
  async () =>
  {
    const subir = subidaOk();

    render(
      <FotoStaffUploader
        staffId="s1"
        nombre="Diego"
        fotoUrl={null}
        subir={subir}
        quitar={quitarOk()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Foto de Diego"), {
      target: { files: [archivo("doc.pdf", "application/pdf")] },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent("Elegí una imagen");
    expect(subir).not.toHaveBeenCalled();
    expect(mockConvertir).not.toHaveBeenCalled();
  });

  it("debería rechazar archivos de más de 8 MB",
  async () =>
  {
    const subir = subidaOk();

    render(
      <FotoStaffUploader
        staffId="s1"
        nombre="Diego"
        fotoUrl={null}
        subir={subir}
        quitar={quitarOk()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Foto de Diego"), {
      target: { files: [archivo("foto.jpg", "image/jpeg", 9 * 1024 * 1024)] },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent("8 MB");
    expect(subir).not.toHaveBeenCalled();
  });

  it("debería mostrar el error de conversión del cliente",
  async () =>
  {
    mockConvertir.mockRejectedValueOnce(new Error("La imagen tiene que medir al menos 200×200 px."));

    render(
      <FotoStaffUploader
        staffId="s1"
        nombre="Diego"
        fotoUrl={null}
        subir={subidaOk()}
        quitar={quitarOk()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Foto de Diego"), {
      target: { files: [archivo("foto.jpg", "image/jpeg")] },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent("al menos 200");
  });

  it("debería quitar la foto existente",
  async () =>
  {
    const quitar = quitarOk();

    render(
      <FotoStaffUploader
        staffId="s1"
        nombre="Diego"
        fotoUrl="https://cdn.test/a.jpg"
        subir={subidaOk()}
        quitar={quitar}
      />,
    );

    await act(async () =>
    {
      fireEvent.click(screen.getByRole("button", { name: "Quitar foto" }));
    });

    await vi.waitFor(() => expect(quitar).toHaveBeenCalledOnce());
  });
});
