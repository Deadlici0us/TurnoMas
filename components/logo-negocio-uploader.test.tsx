import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import LogoNegocioUploader from "./logo-negocio-uploader";
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
    data: { url: "https://cdn.test/negocio/n1/logo.jpg" },
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

describe("LogoNegocioUploader",
() =>
{
  it("debería mostrar el texto completo cuando no hay archivo",
  () =>
  {
    render(
      <LogoNegocioUploader
        nombre="Barbería Diego"
        logoUrl={null}
        subir={subidaOk()}
        quitar={quitarOk()}
      />,
    );

    expect(screen.getByText("Sin archivo seleccionado")).toBeDefined();
    expect(screen.getByRole("button", { name: "Elegir imagen" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Quitar logo" })).toBeNull();
  });

  it("debería subir el JPEG convertido y persistir la URL",
  async () =>
  {
    const subir = subidaOk();

    render(
      <LogoNegocioUploader
        nombre="Barbería Diego"
        logoUrl={null}
        subir={subir}
        quitar={quitarOk()}
      />,
    );

    await act(async () =>
    {
      fireEvent.change(screen.getByLabelText("Logo del negocio"), {
        target: { files: [archivo("logo.png", "image/png")] },
      });
    });

    await vi.waitFor(() => expect(subir).toHaveBeenCalledOnce());

    const formData = subir.mock.calls[0]?.[0] as FormData;
    const enviado = formData.get("archivo");

    expect(enviado).toBeInstanceOf(File);
    expect((enviado as File).type).toBe("image/jpeg");
    expect(mockConvertir).toHaveBeenCalledOnce();
    expect(await screen.findByRole("img", { name: "Barbería Diego" })).toHaveAttribute(
      "src", "https://cdn.test/negocio/n1/logo.jpg");
  });

  it("debería rechazar archivos que no son imagen",
  async () =>
  {
    const subir = subidaOk();

    render(
      <LogoNegocioUploader
        nombre="Barbería Diego"
        logoUrl={null}
        subir={subir}
        quitar={quitarOk()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Logo del negocio"), {
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
      <LogoNegocioUploader
        nombre="Barbería Diego"
        logoUrl={null}
        subir={subir}
        quitar={quitarOk()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Logo del negocio"), {
      target: { files: [archivo("logo.jpg", "image/jpeg", 9 * 1024 * 1024)] },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent("8 MB");
    expect(subir).not.toHaveBeenCalled();
  });

  it("debería mostrar el error de conversión del cliente",
  async () =>
  {
    mockConvertir.mockRejectedValueOnce(new Error("La imagen tiene que medir al menos 200×200 px."));

    render(
      <LogoNegocioUploader
        nombre="Barbería Diego"
        logoUrl={null}
        subir={subidaOk()}
        quitar={quitarOk()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Logo del negocio"), {
      target: { files: [archivo("logo.jpg", "image/jpeg")] },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent("al menos 200");
  });

  it("debería quitar el logo existente",
  async () =>
  {
    const quitar = quitarOk();

    render(
      <LogoNegocioUploader
        nombre="Barbería Diego"
        logoUrl="https://cdn.test/a.jpg"
        subir={subidaOk()}
        quitar={quitar}
      />,
    );

    await act(async () =>
    {
      fireEvent.click(screen.getByRole("button", { name: "Quitar logo" }));
    });

    await vi.waitFor(() => expect(quitar).toHaveBeenCalledOnce());
    expect(screen.queryByRole("img", { name: "Barbería Diego" })).toBeNull();
    expect(screen.getByText("Sin archivo seleccionado")).toBeDefined();
  });
});
