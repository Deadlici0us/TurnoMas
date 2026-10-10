import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET, POST } from "./route";
import { notificationService, NotificationType } from "@/lib/services/notifications";

vi.mock("@/lib/services/notifications", () =>
{
  return {
    notificationService: {
      sendAbandonmentEmail: vi.fn(),
      sendRecoveryEmail: vi.fn(),
      scheduleReminder: vi.fn(),
    },
    NotificationType: {
      REMINDER_24H: "reminder_24h",
      REMINDER_1H: "reminder_1h",
    },
  };
});

const mockAbandonment = vi.mocked(notificationService.sendAbandonmentEmail);
const mockRecovery = vi.mocked(notificationService.sendRecoveryEmail);
const mockSchedule = vi.mocked(notificationService.scheduleReminder);

function requestWith(body: unknown): Request
{
  return new Request("http://localhost/dashboard/reminders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() =>
{
  vi.clearAllMocks();
});

describe("POST /dashboard/reminders",
() =>
{
  it("debería rechazar tipos inválidos",
  async () =>
  {
    const response = await POST(requestWith({ type: "spam", bookingId: "b-1" }));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("Tipo de automatización inválido.");
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it("debería exigir el ID de la reserva",
  async () =>
  {
    const response = await POST(requestWith({ type: "reminder", data: {} }));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("Falta el ID de la reserva.");
  });

  it("debería enviar email de abandono",
  async () =>
  {
    mockAbandonment.mockResolvedValueOnce("email-1");
    const data = { kind: "abandonment" };

    const response = await POST(requestWith({ type: "reminder", bookingId: "b-1", data }));

    expect(response.status).toBe(200);
    expect(mockAbandonment).toHaveBeenCalledWith("b-1", data);
  });

  it("debería enviar email de recupero",
  async () =>
  {
    mockRecovery.mockResolvedValueOnce("email-2");
    const data = { kind: "recovery" };

    const response = await POST(requestWith({ type: "reminder", bookingId: "b-1", data }));

    expect(response.status).toBe(200);
    expect(mockRecovery).toHaveBeenCalledWith("b-1", data);
  });

  it("debería programar recordatorio 24h por defecto",
  async () =>
  {
    mockSchedule.mockResolvedValueOnce({ jobId: "job-1" });
    const data = { negocio: "Barbería" };

    const response = await POST(requestWith({ type: "reminder", bookingId: "b-1", data }));

    expect(response.status).toBe(200);
    expect(mockSchedule).toHaveBeenCalledWith("b-1", NotificationType.REMINDER_24H, data);
  });

  it("debería programar recordatorio 1h cuando se pide",
  async () =>
  {
    mockSchedule.mockResolvedValueOnce({ jobId: "job-2" });

    const response = await POST(requestWith({
      type: "reminder",
      bookingId: "b-1",
      data: { kind: "reminder_1h" },
    }));

    expect(response.status).toBe(200);
    expect(mockSchedule).toHaveBeenCalledWith(
      "b-1", NotificationType.REMINDER_1H, { kind: "reminder_1h" });
  });

  it("debería devolver 500 cuando la automatización falla",
  async () =>
  {
    mockSchedule.mockRejectedValueOnce(new Error("qstash caído"));

    const response = await POST(requestWith({ type: "reminder", bookingId: "b-1", data: {} }));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(500);
    expect(body.error).toBe("qstash caído");
  });

  it("debería devolver 500 con cuerpo ilegible",
  async () =>
  {
    const request = new Request("http://localhost/dashboard/reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "esto-no-es-json{",
    });
    const response = await POST(request);

    expect(response.status).toBe(500);
  });
});

describe("GET /dashboard/reminders",
() =>
{
  it("debería responder salud ok",
  async () =>
  {
    const response = await GET();
    const body = await response.json() as { status: string };

    expect(response.status).toBe(200);
    expect(body).toEqual({ status: "ok" });
  });
});
