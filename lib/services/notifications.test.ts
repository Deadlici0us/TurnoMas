import { beforeEach, describe, expect, it, vi } from "vitest";

import { NotificationService, NotificationType } from "./notifications";

const { mockSend, mockSchedule } = vi.hoisted(() =>
{
  return { mockSend: vi.fn(), mockSchedule: vi.fn() };
});

vi.mock("@/lib/ports/email", () =>
{
  return {
    ResendAdapter: function ()
    {
      return { send: mockSend };
    },
  };
});

vi.mock("@/lib/ports/jobs", () =>
{
  return {
    QStashAdapter: function ()
    {
      return { schedule: mockSchedule };
    },
  };
});

beforeEach(() =>
{
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("NotificationService.scheduleReminder email inmediato",
() =>
{
  it("debería enviar email de confirmación de pago con defaults",
  async () =>
  {
    mockSend.mockResolvedValueOnce("email-1");

    const result = await new NotificationService().scheduleReminder("book-1", NotificationType.PAYMENT_CONFIRMED, {});

    expect(result).toEqual({ emailId: "email-1", jobId: undefined });
    expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
      to: "demo@turnomas.com",
      subject: "TurnoMas - Reserva confirmada",
    }));
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it("debería enviar email de bienvenida",
  async () =>
  {
    mockSend.mockResolvedValueOnce("email-2");

    const result = await new NotificationService().scheduleReminder("book-1", NotificationType.WELCOME, {});

    expect(result.emailId).toBe("email-2");
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it("debería resolver el nombre del negocio desde claves conocidas",
  async () =>
  {
    mockSend.mockResolvedValueOnce("email-3");

    await new NotificationService().scheduleReminder("book-1", NotificationType.WELCOME, { businessName: "Barbería" });

    expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({ fromName: "Barbería" }));
  });

  it("debería ignorar nombres vacíos y usar undefined",
  async () =>
  {
    mockSend.mockResolvedValueOnce("email-4");

    await new NotificationService().scheduleReminder("book-1", NotificationType.WELCOME, { negocio: "   " });

    expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({ fromName: undefined }));
  });

  it("debería usar email, asunto y html provistos",
  async () =>
  {
    mockSend.mockResolvedValueOnce("email-5");

    await new NotificationService().scheduleReminder("book-1", NotificationType.PAYMENT_CONFIRMED, {
      email: "cli@ejemplo.com",
      subject: "Asunto propio",
      html: "<p>Hola</p>",
      negocio: "Nego",
    });

    expect(mockSend).toHaveBeenCalledWith({
      to: "cli@ejemplo.com",
      subject: "Asunto propio",
      fromName: "Nego",
      html: "<p>Hola</p>",
    });
  });

  it("debería propagar errores del proveedor de email",
  async () =>
  {
    mockSend.mockRejectedValueOnce(new Error("resend caído"));

    await expect(new NotificationService().scheduleReminder("book-1", NotificationType.WELCOME, {}))
      .rejects.toThrow("resend caído");
  });
});

describe("NotificationService.scheduleReminder programado",
() =>
{
  it("debería programar recordatorio 24h con retardo de un día",
  async () =>
  {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.turnomas.com");
    mockSchedule.mockResolvedValueOnce("job-1");

    const data = { negocio: "Barbería" };
    const result = await new NotificationService()
      .scheduleReminder("book-1", NotificationType.REMINDER_24H, data);

    expect(result).toEqual({ emailId: undefined, jobId: "job-1" });
    expect(mockSchedule).toHaveBeenCalledWith({
      url: "https://app.turnomas.com/dashboard/reminders",
      delaySeconds: 86400,
      body: { type: NotificationType.REMINDER_24H, bookingId: "book-1", data },
    });
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("debería programar recordatorio 1h con retardo de una hora",
  async () =>
  {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.turnomas.com");
    mockSchedule.mockResolvedValueOnce("job-2");

    await new NotificationService().scheduleReminder("book-1", NotificationType.REMINDER_1H, {});

    expect(mockSchedule).toHaveBeenCalledWith(expect.objectContaining({ delaySeconds: 3600 }));
  });

  it("debería recortar barras finales de la URL pública",
  async () =>
  {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.turnomas.com///");
    mockSchedule.mockResolvedValueOnce("job-3");

    await new NotificationService().scheduleReminder("book-1", NotificationType.REMINDER_1H, {});

    expect(mockSchedule).toHaveBeenCalledWith(expect.objectContaining({
      url: "https://app.turnomas.com/dashboard/reminders",
    }));
  });

  it("debería caer a VERCEL_URL con prefijo https",
  async () =>
  {
    vi.stubEnv("VERCEL_URL", "mi-app.vercel.app");
    mockSchedule.mockResolvedValueOnce("job-4");

    await new NotificationService().scheduleReminder("book-1", NotificationType.REMINDER_24H, {});

    expect(mockSchedule).toHaveBeenCalledWith(expect.objectContaining({
      url: "https://mi-app.vercel.app/dashboard/reminders",
    }));
  });

  it("debería lanzar sin URL base configurada",
  async () =>
  {
    await expect(new NotificationService().scheduleReminder("book-1", NotificationType.REMINDER_24H, {}))
      .rejects.toThrow("Falta configurar NEXT_PUBLIC_APP_URL o VERCEL_URL");
  });

  it("debería no hacer nada para tipos sin email ni programación",
  async () =>
  {
    const result = await new NotificationService()
      .scheduleReminder("book-1", NotificationType.ABANDONMENT, {});

    expect(result).toEqual({ emailId: undefined, jobId: undefined });
    expect(mockSend).not.toHaveBeenCalled();
    expect(mockSchedule).not.toHaveBeenCalled();
  });
});

describe("NotificationService.sendAbandonmentEmail",
() =>
{
  it("debería enviar con defaults de pago pendiente",
  async () =>
  {
    mockSend.mockResolvedValueOnce("email-10");

    const id = await new NotificationService().sendAbandonmentEmail("book-1", {});

    expect(id).toBe("email-10");
    expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
      to: "demo@turnomas.com",
      subject: "TurnoMas - Recordatorio de pago",
    }));
  });

  it("debería usar el mensaje provisto en el html",
  async () =>
  {
    mockSend.mockResolvedValueOnce("email-11");

    await new NotificationService().sendAbandonmentEmail("book-1", { message: "Te esperamos" });

    expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
      html: "<p>Te esperamos</p>",
    }));
  });
});

describe("NotificationService.sendRecoveryEmail",
() =>
{
  it("debería enviar con defaults de reseña",
  async () =>
  {
    mockSend.mockResolvedValueOnce("email-20");

    const id = await new NotificationService().sendRecoveryEmail("book-1", {});

    expect(id).toBe("email-20");
    expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
      subject: "TurnoMas - Reseña de tu experiencia",
    }));
  });

  it("debería respetar email y negocio provistos",
  async () =>
  {
    mockSend.mockResolvedValueOnce("email-21");

    await new NotificationService().sendRecoveryEmail("book-1", {
      email: "cli@ejemplo.com",
      negocioNombre: "Peluquería",
    });

    expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
      to: "cli@ejemplo.com",
      fromName: "Peluquería",
    }));
  });
});

describe("NotificationService integración",
() =>
{
  it("debería programar el recordatorio punta a punta con job mockeado",
  async () =>
  {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.turnomas.com");
    mockSchedule.mockResolvedValueOnce("job-int");

    const service = new NotificationService();
    const result = await service.scheduleReminder("book-int", NotificationType.REMINDER_24H, {
      negocio: "Barbería",
    });

    expect(result.jobId).toBe("job-int");
    expect(mockSchedule).toHaveBeenCalledOnce();
    const body = (mockSchedule.mock.calls[0] as unknown[])[0] as { body: { bookingId: string } };

    expect(body.body.bookingId).toBe("book-int");
  });
});
