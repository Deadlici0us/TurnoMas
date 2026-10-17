import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET, POST } from "./route";
import { bookingService } from "@/lib/services/booking";
import { calendarService } from "@/lib/services/calendar";
import { crearEventoGoogleParaTurno } from "@/lib/services/calendar-sync";
import { paymentService } from "@/lib/services/payment";
import { subscriptionService } from "@/lib/services/subscription";
import { MpHttpError } from "@/lib/payments/subscription";

vi.mock("@/lib/services/payment", () =>
{
  return {
    paymentService: {
      getPaymentStatus: vi.fn(),
      getBusinessAccessToken: vi.fn(),
      listConnectedBusinessTokens: vi.fn(),
      refundForNegocio: vi.fn(),
    },
  };
});

vi.mock("@/lib/services/booking", () =>
{
  return {
    bookingService: {
      getBookingByPaymentId: vi.fn(),
      getBookingById: vi.fn(),
      confirmBooking: vi.fn(),
      releaseBooking: vi.fn(),
    },
  };
});

vi.mock("@/lib/services/subscription", () =>
{
  return {
    subscriptionService: {
      consultarEstado: vi.fn(),
      activarSuscripcion: vi.fn(),
      cancelarSuscripcionLocal: vi.fn(),
      marcarPastDue: vi.fn(),
      resolverNegocioDeCobro: vi.fn(),
    },
  };
});

vi.mock("@/lib/services/calendar-sync", () =>
{
  return { crearEventoGoogleParaTurno: vi.fn() };
});

vi.mock("@/lib/services/calendar", () =>
{
  return { calendarService: { deleteEventForNegocio: vi.fn() } };
});

const mockGetStatus = vi.mocked(paymentService.getPaymentStatus);
const mockBusinessToken = vi.mocked(paymentService.getBusinessAccessToken);
const mockListConnected = vi.mocked(paymentService.listConnectedBusinessTokens);
const mockSubEstado = vi.mocked(subscriptionService.consultarEstado);
const mockSubActivar = vi.mocked(subscriptionService.activarSuscripcion);
const mockSubCancelar = vi.mocked(subscriptionService.cancelarSuscripcionLocal);
const mockSubMora = vi.mocked(subscriptionService.marcarPastDue);
const mockSubVinculo = vi.mocked(subscriptionService.resolverNegocioDeCobro);
const mockByPaymentId = vi.mocked(bookingService.getBookingByPaymentId);
const mockById = vi.mocked(bookingService.getBookingById);
const mockConfirm = vi.mocked(bookingService.confirmBooking);
const mockRelease = vi.mocked(bookingService.releaseBooking);
const mockCrearEvento = vi.mocked(crearEventoGoogleParaTurno);
const mockDeleteEvent = vi.mocked(calendarService.deleteEventForNegocio);

/**
 * Request de webhook de pago de MercadoPago.
 *
 * @param body Cuerpo del webhook.
 * @param headers Cabeceras adicionales.
 */
function requestWith(body: unknown, headers: Record<string, string> = {}): Request
{
  return new Request("http://localhost/api/webhooks", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

const PAGO = { type: "payment", data: { id: "12345" } };

beforeEach(() =>
{
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  mockByPaymentId.mockResolvedValue(null);
  mockBusinessToken.mockResolvedValue(null);
  mockListConnected.mockResolvedValue([]);
});

describe("POST /api/webhooks",
() =>
{
  it("debería ignorar con 200 un tópico no soportado",
  async () =>
  {
    const response = await POST(requestWith({ type: "otro" }));
    const body = await response.json() as { success: boolean; ignorado: boolean };

    expect(response.status).toBe(200);
    expect(body).toEqual({ success: true, ignorado: true });
  });

  it("debería rechazar sin ID de pago en español",
  async () =>
  {
    const response = await POST(requestWith({ type: "payment", data: {} }));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("Falta el ID del pago.");
  });

  it("debería fallar cerrado en producción sin secreto configurado",
  async () =>
  {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("MP_WEBHOOK_SECRET", "");

    try
    {
      const response = await POST(requestWith({ type: "payment", data: { id: "12345" } }));
      const body = await response.json() as { error: string };

      expect(response.status).toBe(503);
      expect(body.error).toBe("Webhook no configurado en producción.");
    }
    finally
    {
      vi.unstubAllEnvs();
    }
  });

  it("debería rechazar firma inválida con secreto configurado",
  async () =>
  {
    vi.stubEnv("MP_WEBHOOK_SECRET", "secreto-1");
    mockGetStatus.mockResolvedValue({ id: "12345", status: "approved", externalReference: "b-1" });

    const response = await POST(requestWith(PAGO));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(401);
    expect(body.error).toBe("Firma del webhook inválida.");
    expect(mockGetStatus).not.toHaveBeenCalled();
  });

  it("debería devolver 502 cuando el pago no se puede consultar",
  async () =>
  {
    mockGetStatus.mockRejectedValueOnce(new Error("mp caído"));
    mockByPaymentId.mockResolvedValueOnce(null);

    const response = await POST(requestWith(PAGO));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(502);
    expect(body.error).toBe("No pudimos consultar el pago.");
  });

  it("debería consultar primero con el token del negocio dueño (señas delegadas)",
  async () =>
  {
    mockByPaymentId.mockResolvedValueOnce({ id: "b-1", negocio_id: "neg-1", estado: "pendiente" });
    mockBusinessToken.mockResolvedValueOnce("tok-negocio");
    mockGetStatus.mockResolvedValueOnce({ id: "12345", status: "approved", externalReference: "b-1" });
    mockById.mockResolvedValueOnce({ id: "b-1", estado: "pendiente" });
    mockConfirm.mockResolvedValueOnce(undefined);
    mockCrearEvento.mockResolvedValueOnce(undefined);

    const response = await POST(requestWith(PAGO));
    const body = await response.json() as { success: boolean; status: string };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ success: true, status: "approved" });
    expect(mockGetStatus.mock.calls[0]).toEqual(["12345", "tok-negocio"]);
    expect(mockConfirm).toHaveBeenCalledWith("b-1", "12345");
  });

  it("debería iterar negocios conectados con pago delegado nuevo",
  async () =>
  {
    mockByPaymentId.mockResolvedValueOnce(null);
    mockGetStatus.mockRejectedValueOnce(new Error("no visible en plataforma"));
    mockListConnected.mockResolvedValueOnce(["tok-a", "tok-b"]);
    mockGetStatus.mockRejectedValueOnce(new Error("no visible en a"));
    mockGetStatus.mockResolvedValueOnce({ id: "12345", status: "approved", externalReference: "b-1" });
    mockById.mockResolvedValueOnce({ id: "b-1", estado: "pendiente" });
    mockConfirm.mockResolvedValueOnce(undefined);
    mockCrearEvento.mockResolvedValueOnce(undefined);

    const response = await POST(requestWith(PAGO));
    const body = await response.json() as { success: boolean; status: string };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ success: true, status: "approved" });
    expect(mockGetStatus).toHaveBeenCalledWith("12345", "tok-b");
    expect(mockConfirm).toHaveBeenCalledWith("b-1", "12345");
  });

  it("debería confirmar y crear evento con pago aprobado",
  async () =>
  {
    mockGetStatus.mockResolvedValueOnce({ id: "12345", status: "approved", externalReference: "b-1" });
    mockById.mockResolvedValueOnce({ id: "b-1", estado: "pendiente" });
    mockConfirm.mockResolvedValueOnce(undefined);
    mockCrearEvento.mockResolvedValueOnce(undefined);

    const response = await POST(requestWith(PAGO));

    expect(response.status).toBe(200);
    expect(mockConfirm).toHaveBeenCalledWith("b-1", "12345");
    expect(mockCrearEvento).toHaveBeenCalledWith("b-1");
  });

  it("debería responder sinReserva sin referencia externa",
  async () =>
  {
    mockGetStatus.mockResolvedValueOnce({ id: "12345", status: "approved", externalReference: null });

    const response = await POST(requestWith(PAGO));
    const body = await response.json() as { sinReserva: boolean };

    expect(response.status).toBe(200);
    expect(body.sinReserva).toBe(true);
    expect(mockById).not.toHaveBeenCalled();
  });

  it("debería responder idempotente con turno ya pagado",
  async () =>
  {
    mockGetStatus.mockResolvedValueOnce({ id: "12345", status: "approved", externalReference: "b-1" });
    mockById.mockResolvedValueOnce({ id: "b-1", estado: "pagado" });

    const response = await POST(requestWith(PAGO));
    const body = await response.json() as { idempotente: boolean };

    expect(response.status).toBe(200);
    expect(body.idempotente).toBe(true);
    expect(mockConfirm).not.toHaveBeenCalled();
  });

  it("debería no resucitar un turno cancelado con pago aprobado tardío",
  async () =>
  {
    mockGetStatus.mockResolvedValueOnce({ id: "12345", status: "approved", externalReference: "b-1" });
    mockById.mockResolvedValueOnce({ id: "b-1", estado: "cancelado" });

    const response = await POST(requestWith(PAGO));
    const body = await response.json() as { turnoCerrado: boolean };

    expect(response.status).toBe(200);
    expect(body.turnoCerrado).toBe(true);
    expect(mockConfirm).not.toHaveBeenCalled();
    expect(mockCrearEvento).not.toHaveBeenCalled();
  });

  it("debería liberar y borrar evento con pago rechazado",
  async () =>
  {
    mockGetStatus.mockResolvedValueOnce({ id: "12345", status: "rejected", externalReference: "b-1" });
    mockById.mockResolvedValueOnce({ id: "b-1", estado: "pendiente" });
    mockRelease.mockResolvedValueOnce(undefined);
    mockById.mockResolvedValueOnce({ id: "b-1", negocio_id: "neg-1", google_calendar_event_id: "evt-1" });
    mockDeleteEvent.mockResolvedValueOnce(undefined);

    const response = await POST(requestWith(PAGO));

    expect(response.status).toBe(200);
    expect(mockRelease).toHaveBeenCalledWith("b-1");
    expect(mockDeleteEvent).toHaveBeenCalledWith("neg-1", "evt-1");
  });

  it("debería liberar sin evento Google cuando no hay ids",
  async () =>
  {
    mockGetStatus.mockResolvedValueOnce({ id: "12345", status: "cancelled", externalReference: "b-1" });
    mockById.mockResolvedValueOnce({ id: "b-1", estado: "pendiente" });
    mockRelease.mockResolvedValueOnce(undefined);
    mockById.mockResolvedValueOnce(null);

    const response = await POST(requestWith(PAGO));

    expect(response.status).toBe(200);
    expect(mockRelease).toHaveBeenCalledWith("b-1");
    expect(mockDeleteEvent).not.toHaveBeenCalled();
  });

  it("debería liberar aunque el borrado en Google falle",
  async () =>
  {
    mockGetStatus.mockResolvedValueOnce({ id: "12345", status: "rejected", externalReference: "b-1" });
    mockById.mockResolvedValueOnce({ id: "b-1", estado: "pendiente" });
    mockRelease.mockResolvedValueOnce(undefined);
    mockById.mockRejectedValueOnce(new Error("db caída"));

    const response = await POST(requestWith(PAGO));

    expect(response.status).toBe(200);
    expect(mockRelease).toHaveBeenCalledWith("b-1");
    expect(mockDeleteEvent).not.toHaveBeenCalled();
  });

  it("debería ignorar estados intermedios sin mutar",
  async () =>
  {
    mockGetStatus.mockResolvedValueOnce({ id: "12345", status: "pending", externalReference: "b-1" });
    mockById.mockResolvedValueOnce({ id: "b-1", estado: "pendiente" });

    const response = await POST(requestWith(PAGO));
    const body = await response.json() as { status: string };

    expect(response.status).toBe(200);
    expect(body.status).toBe("pending");
    expect(mockConfirm).not.toHaveBeenCalled();
    expect(mockRelease).not.toHaveBeenCalled();
  });

  it("debería devolver 500 con cuerpo ilegible",
  async () =>
  {
    const request = new Request("http://localhost/api/webhooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "esto-no-es-json{",
    });
    const response = await POST(request);
    const body = await response.json() as { error: string };

    expect(response.status).toBe(500);
    expect(body.error).toBe("No se pudo procesar el webhook.");
  });
});

describe("POST /api/webhooks suscripciones",
() =>
{
  const ALTA = { type: "subscription_preapproval", data: { id: "pre-1" } };
  const COBRO = { type: "subscription_authorized_payment", data: { id: "999" } };

  it("debería activar el plan con preapproval autorizado",
  async () =>
  {
    mockSubEstado.mockResolvedValueOnce({ status: "authorized", externalReference: "neg-1" });
    mockSubActivar.mockResolvedValueOnce(undefined);

    const response = await POST(requestWith(ALTA));
    const body = await response.json() as { success: boolean; status: string };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ success: true, status: "authorized" });
    expect(mockSubActivar).toHaveBeenCalledWith("neg-1", "pre-1");
  });

  it("debería limpiar el plan con preapproval cancelado",
  async () =>
  {
    mockSubEstado.mockResolvedValueOnce({ status: "cancelled", externalReference: "neg-1" });
    mockSubCancelar.mockResolvedValueOnce(undefined);

    const response = await POST(requestWith(ALTA));
    const body = await response.json() as { success: boolean; status: string };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ success: true, status: "cancelled" });
    expect(mockSubCancelar).toHaveBeenCalledWith("neg-1");
  });

  it("debería responder sinNegocio sin referencia externa",
  async () =>
  {
    mockSubEstado.mockResolvedValueOnce({ status: "authorized", externalReference: null });

    const response = await POST(requestWith(ALTA));
    const body = await response.json() as { sinNegocio: boolean };

    expect(response.status).toBe(200);
    expect(body.sinNegocio).toBe(true);
    expect(mockSubActivar).not.toHaveBeenCalled();
  });

  it("debería devolver 502 cuando el preapproval no se puede consultar",
  async () =>
  {
    mockSubEstado.mockRejectedValueOnce(new Error("mp caído"));

    const response = await POST(requestWith(ALTA));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(502);
    expect(body.error).toBe("No pudimos consultar la suscripción.");
  });

  it("debería ignorar con 200 un preapproval no encontrado (huérfano)",
  async () =>
  {
    mockSubEstado.mockRejectedValueOnce(
      new MpHttpError("No se pudo consultar la suscripción: 404", 404));

    const response = await POST(requestWith(ALTA));
    const body = await response.json() as { success: boolean; ignorado: boolean; motivo: string };

    expect(response.status).toBe(200);
    expect(body).toEqual({ success: true, ignorado: true, motivo: "preapproval_no_encontrado" });
    expect(mockSubActivar).not.toHaveBeenCalled();
  });

  it("debería confirmar el plan con cobro aprobado",
  async () =>
  {
    mockSubVinculo.mockResolvedValueOnce({ negocioId: "neg-1", preapprovalId: "pre-1", status: "approved" });
    mockSubActivar.mockResolvedValueOnce(undefined);

    const response = await POST(requestWith(COBRO));
    const body = await response.json() as { success: boolean; status: string };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ success: true, status: "approved" });
    expect(mockSubActivar).toHaveBeenCalledWith("neg-1", "pre-1");
  });

  it("debería marcar mora con cobro rechazado",
  async () =>
  {
    mockSubVinculo.mockResolvedValueOnce({ negocioId: "neg-1", preapprovalId: "pre-1", status: "rejected" });
    mockSubMora.mockResolvedValueOnce(undefined);

    const response = await POST(requestWith(COBRO));
    const body = await response.json() as { success: boolean; mora: boolean };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ success: true, mora: true });
    expect(mockSubMora).toHaveBeenCalledWith("neg-1");
  });

  it("debería devolver 502 cuando el cobro no se puede vincular",
  async () =>
  {
    mockSubVinculo.mockResolvedValueOnce(null);

    const response = await POST(requestWith(COBRO));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(502);
    expect(body.error).toBe("No pudimos vincular el cobro.");
  });
});

describe("GET /api/webhooks",
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

describe("POST /api/webhooks integración",
() =>
{
  it("debería procesar un pago aprobado punta a punta",
  async () =>
  {
    mockGetStatus.mockResolvedValueOnce({ id: "999", status: "approved", externalReference: "book-int" });
    mockById.mockResolvedValueOnce({ id: "book-int", estado: "pendiente" });
    mockConfirm.mockResolvedValueOnce(undefined);
    mockCrearEvento.mockResolvedValueOnce(undefined);

    const response = await POST(requestWith({ type: "payment", data: { id: 999 } }));
    const body = await response.json() as { success: boolean };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockConfirm).toHaveBeenCalledWith("book-int", "999");
    expect(mockCrearEvento).toHaveBeenCalledWith("book-int");
  });
});
