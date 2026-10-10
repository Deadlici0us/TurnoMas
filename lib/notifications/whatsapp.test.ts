import { describe, expect, it } from "vitest";

import { linkWhatsapp, normalizarWhatsappParaLink } from "./whatsapp";

describe("normalizarWhatsappParaLink",
() =>
{
  it("debería dejar solo dígitos con código país",
  () =>
  {
    expect(normalizarWhatsappParaLink("+54 9 11-1234-5678")).toBe("5491112345678");
  });

  it("debería aceptar el mínimo y máximo de dígitos",
  () =>
  {
    expect(normalizarWhatsappParaLink("123456")).toBe("123456");
    expect(normalizarWhatsappParaLink("12345678901234567890")).toBe("12345678901234567890");
  });

  it("debería rechazar cortos, largos y no texto",
  () =>
  {
    expect(normalizarWhatsappParaLink("12345")).toBeNull();
    expect(normalizarWhatsappParaLink("123456789012345678901")).toBeNull();
    expect(normalizarWhatsappParaLink("")).toBeNull();
    expect(normalizarWhatsappParaLink(null)).toBeNull();
    expect(normalizarWhatsappParaLink(5491112345678)).toBeNull();
  });
});

describe("linkWhatsapp",
() =>
{
  it("debería armar el link wa.me con texto codificado",
  () =>
  {
    expect(linkWhatsapp("+5491112345678", "Hola, ¿confirmás?"))
      .toBe("https://wa.me/5491112345678?text=Hola%2C%20%C2%BFconfirm%C3%A1s%3F");
  });

  it("debería recortar el texto a 1000 caracteres",
  () =>
  {
    const link = linkWhatsapp("123456", `  ${"x".repeat(2000)}  `);

    expect(link?.startsWith("https://wa.me/123456?text=")).toBe(true);
    expect(decodeURIComponent(link?.split("text=")[1] ?? "")).toHaveLength(1000);
  });

  it("debería devolver null sin número útil o sin texto",
  () =>
  {
    expect(linkWhatsapp("abc", "Hola")).toBeNull();
    expect(linkWhatsapp("123456", "   ")).toBeNull();
    expect(linkWhatsapp(null, "Hola")).toBeNull();
  });
});

describe("linkWhatsapp integración",
() =>
{
  it("debería normalizar con formato local y armar el link",
  async () =>
  {
    const link = linkWhatsapp("+54 9 11-1234-5678", "Te esperamos mañana");

    expect(link).toBe("https://wa.me/5491112345678?text=Te%20esperamos%20ma%C3%B1ana");
  });
});
