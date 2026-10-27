import { describe, expect, it } from "vitest";

import
{
  EMAIL_FALLBACK_LOGO_URL,
  renderEmailButton,
  renderEmailLayout,
  resolveEmailLogoUrl,
} from "./email-layout";

const BASE_INPUT = {
  title: "Tu reserva está confirmada",
  preheader: "Te esperamos en Barbería Diego",
  bodyHtml: "<p>Hola Juan, te esperamos.</p>",
  businessName: "Barbería Diego",
};

describe("renderEmailLayout",
() =>
{
  it("debería armar un documento HTML con el shell de marca",
  () =>
  {
    const html = renderEmailLayout(BASE_INPUT);

    expect(html.startsWith("<!DOCTYPE html>")).toBe(true);
    expect(html).toContain('lang="es"');
    expect(html).toContain('charset="UTF-8"');
    expect(html).toContain('name="viewport"');
    expect(html).toContain("max-width:600px");
    expect(html).toContain("#06adef");
    expect(html).toContain("#0b3052");
    expect(html).toContain(EMAIL_FALLBACK_LOGO_URL);
    expect(html).toContain("Barbería Diego");
    expect(html).toContain("TurnoMas");
    expect(html).toContain("/privacidad");
    expect(html).toContain("/terminos");
    expect(html).not.toContain("<script");
  });

  it("debería incluir el preheader oculto",
  () =>
  {
    const html = renderEmailLayout(BASE_INPUT);

    expect(html).toContain("Te esperamos en Barbería Diego");
    expect(html).toContain("display:none");
  });

  it("debería escapar el título, el negocio y el preheader",
  () =>
  {
    const html = renderEmailLayout({
      ...BASE_INPUT,
      title: '<script>alert("x")</script>',
      preheader: 'Hola "Juan" & <b>familia</b>',
      businessName: "Barbería <Diego>",
    });

    expect(html).not.toContain('<script>alert("x")</script>');
    expect(html).toContain("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
    expect(html).toContain("Barbería &lt;Diego&gt;");
    expect(html).toContain("Hola &quot;Juan&quot; &amp; &lt;b&gt;familia&lt;/b&gt;");
  });

  it("debería usar el logo del negocio cuando es HTTPS",
  () =>
  {
    const html = renderEmailLayout({
      ...BASE_INPUT,
      logoUrl: "https://cdn.turnomas.com/logos/negocio.jpg",
    });

    expect(html).toContain('<img src="https://cdn.turnomas.com/logos/negocio.jpg" alt="Barbería Diego"');
    expect(html).toContain(EMAIL_FALLBACK_LOGO_URL);
  });

  it("debería caer al logo de TurnoMas ante un logo inválido",
  () =>
  {
    const html = renderEmailLayout({
      ...BASE_INPUT,
      logoUrl: "javascript:alert(1)",
    });

    expect(html).toContain(EMAIL_FALLBACK_LOGO_URL);
    expect(html).not.toContain("javascript:");
  });

  it("debería renderizar acciones con href escapado y sin duplicar URLs",
  () =>
  {
    const html = renderEmailLayout({
      ...BASE_INPUT,
      actions: [
        {
          href: "https://app.turnomas.com/cancelar/t-1?token=a&b=1",
          label: "Cancelar turno",
          variant: "secondary",
        },
      ],
    });

    expect(html).toContain("Cancelar turno");
    expect(html).toContain("https://app.turnomas.com/cancelar/t-1?token=a&amp;b=1");
    expect(html).toContain("border:1px solid #06adef");
  });
});

describe("resolveEmailLogoUrl",
() =>
{
  it("debería aceptar solo URLs http(s)",
  () =>
  {
    expect(resolveEmailLogoUrl("https://cdn.example.com/logo.png"))
      .toBe("https://cdn.example.com/logo.png");
    expect(resolveEmailLogoUrl("javascript:alert(1)")).toBe(EMAIL_FALLBACK_LOGO_URL);
    expect(resolveEmailLogoUrl(null)).toBe(EMAIL_FALLBACK_LOGO_URL);
  });
});

describe("renderEmailButton",
() =>
{
  it("debería usar el color primario de TurnoMas",
  () =>
  {
    const html = renderEmailButton({ href: "https://app.turnomas.com/t/1", label: "Pagar seña" });

    expect(html).toContain("Pagar seña");
    expect(html).toContain("#ff3259");
    expect(html).toContain("https://app.turnomas.com/t/1");
  });
});
