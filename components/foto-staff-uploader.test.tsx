import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import FotoStaffUploader from "./foto-staff-uploader";
import { getSupabaseBrowser } from "@/lib/supabase/client";

vi.mock("@/lib/supabase/client", () =>
{
  return { getSupabaseBrowser: vi.fn() };
});

const mockSupabase = vi.mocked(getSupabaseBrowser);
const upload = vi.fn(async () => ({ error: null }));
const getPublicUrl = vi.fn(() => ({ data: { publicUrl: "https://cdn.test/staff/s1/x.jpg" } }));

beforeEach(() =>
{
  vi.clearAllMocks();
  mockSupabase.mockReturnValue({
    storage: { from: () => ({ upload, getPublicUrl }) },
  } as never);
});

function archivo(nombre: string, tipo: string, bytes = 16): File
{
  return new File([new Uint8Array(bytes)], nombre, { type: tipo });
}

describe("FotoStaffUploader",
() =>
{
  it("debería subir la imagen y persistir la URL pública",
  async () =>
  {
    const action = vi.fn(async () => undefined);

    render(<FotoStaffUploader staffId="s1" nombre="Diego" fotoUrl={null} action={action} />);

    fireEvent.change(screen.getByLabelText("Foto de Diego"), {
      target: { files: [archivo("foto.png", "image/png")] },
    });

    await vi.waitFor(() => expect(action).toHaveBeenCalledWith("https://cdn.test/staff/s1/x.jpg"));
    expect(upload).toHaveBeenCalledOnce();
  });

  it("debería rechazar archivos que no son imagen",
  async () =>
  {
    const action = vi.fn(async () => undefined);

    render(<FotoStaffUploader staffId="s1" nombre="Diego" fotoUrl={null} action={action} />);

    fireEvent.change(screen.getByLabelText("Foto de Diego"), {
      target: { files: [archivo("doc.pdf", "application/pdf")] },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent("Elegí una imagen");
    expect(upload).not.toHaveBeenCalled();
    expect(action).not.toHaveBeenCalled();
  });

  it("debería quitar la foto existente",
  async () =>
  {
    const action = vi.fn(async () => undefined);

    render(
      <FotoStaffUploader staffId="s1" nombre="Diego" fotoUrl="https://cdn.test/a.jpg" action={action} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Quitar foto" }));

    await vi.waitFor(() => expect(action).toHaveBeenCalledWith(null));
  });
});
