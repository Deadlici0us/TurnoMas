import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ResendAdapter } from "./email";

function lastSentBody(fetchMock: { mock: { calls: unknown[][] } }): Record<string, unknown>
{
  const init = fetchMock.mock.calls[0]?.[1] as { body: string };

  return JSON.parse(init.body) as Record<string, unknown>;
}

function mockFetchOk()
{
  return vi.fn(async () => ({
    ok: true,
    json: async () => ({ id: "email-1" }),
  }));
}

describe("ResendAdapter from dinámico",
() =>
{
  const envBackup = { ...process.env };

  beforeEach(() =>
  {
    process.env.RESEND_API_KEY = "re_test";
    process.env.EMAIL_FROM = "no-reply@turnomas.com";
    vi.unstubAllGlobals();
  });

  afterEach(() =>
  {
    process.env = { ...envBackup };
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("debería usar el nombre del negocio como remitente",
  async () =>
  {
    const fetchMock = mockFetchOk();
    vi.stubGlobal("fetch", fetchMock);

    await new ResendAdapter().send({
      to: "cliente@ejemplo.com",
      subject: "Confirmación",
      html: "<p>Hola</p>",
      fromName: "Barbería Diego",
    });

    const body = lastSentBody(fetchMock);
    expect(body.from).toBe("Barbería Diego <no-reply@turnomas.com>");
  });

  it("debería usar TurnoMas cuando falta el nombre",
  async () =>
  {
    const fetchMock = mockFetchOk();
    vi.stubGlobal("fetch", fetchMock);

    await new ResendAdapter().send({
      to: "cliente@ejemplo.com",
      subject: "Confirmación",
      html: "<p>Hola</p>",
    });

    const body = lastSentBody(fetchMock);
    expect(body.from).toBe("TurnoMas <no-reply@turnomas.com>");
  });

  it("debería sanear saltos de línea y comillas del nombre",
  async () =>
  {
    const fetchMock = mockFetchOk();
    vi.stubGlobal("fetch", fetchMock);

    await new ResendAdapter().send({
      to: "cliente@ejemplo.com",
      subject: "Confirmación",
      html: "<p>Hola</p>",
      fromName: 'Mal\n"Negocio"\rName',
    });

    const body = lastSentBody(fetchMock);
    expect(body.from).not.toContain("\n");
    expect(body.from).not.toContain("\r");
    expect(body.from).not.toContain('"');
    expect(body.from).toContain("<no-reply@turnomas.com>");
  });

  it("debería extraer la casilla si EMAIL_FROM trae formato legacy",
  async () =>
  {
    process.env.EMAIL_FROM = "TurnoMas <hola@turnomas.com>";
    const fetchMock = mockFetchOk();
    vi.stubGlobal("fetch", fetchMock);

    await new ResendAdapter().send({
      to: "cliente@ejemplo.com",
      subject: "Confirmación",
      html: "<p>Hola</p>",
      fromName: "Barbería Diego",
    });

    const body = lastSentBody(fetchMock);
    expect(body.from).toBe("Barbería Diego <hola@turnomas.com>");
  });

  it("debería lanzar si falta configuración",
  async () =>
  {
    delete process.env.RESEND_API_KEY;
    vi.stubGlobal("fetch", mockFetchOk());

    await expect(new ResendAdapter().send({
      to: "cliente@ejemplo.com",
      subject: "Confirmación",
      html: "<p>Hola</p>",
    })).rejects.toThrow("Falta configurar RESEND_API_KEY o EMAIL_FROM");
  });
});
