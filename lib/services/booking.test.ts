import { beforeEach, describe, expect, it, vi } from "vitest";

import { BookingService, type BookingData } from "./booking";
import { paymentService } from "./payment";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

vi.mock("@/lib/supabase/admin", () =>
{
  return { getSupabaseAdmin: vi.fn() };
});

const mockGetSupabaseAdmin = vi.mocked(getSupabaseAdmin);

/**
 * Datos mínimos de reserva para tests.
 *
 * @return Fixture de BookingData.
 */
function bookingFixture(): BookingData
{
  return {
    negocioId: "neg-1",
    staffId: "staff-1",
    servicioId: "serv-1",
    clienteId: "cli-1",
    inicio: "2026-10-10T14:00:00.000Z",
    fin: "2026-10-10T14:30:00.000Z",
    montoTotal: 10000,
    senaMonto: 5000,
    senaPorcentaje: 50,
    estado: "pendiente",
  };
}

/**
 * Stub para `insert(data).select("id").single()`.
 *
 * @param resolved Valor resuelto por `.single()`.
 */
function stubInsertSingle(resolved: { data: unknown; error: { message: string } | null })
{
  const single = vi.fn(async () => resolved);
  const admin = {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({ single })),
      })),
    })),
  };

  mockGetSupabaseAdmin.mockReturnValue(admin as never);

  return { admin, single };
}

/**
 * Stub para `update(...).eq(...)` simple (un solo eq).
 *
 * @param resolved Resultado `{ error }` del update.
 */
function stubUpdateSingleEq(resolved: { error: { message: string } | null })
{
  const eq = vi.fn(async () => resolved);
  const admin = {
    from: vi.fn(() => ({
      update: vi.fn(() => ({ eq })),
    })),
  };

  mockGetSupabaseAdmin.mockReturnValue(admin as never);

  return { admin, eq };
}

beforeEach(() =>
{
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("BookingService.createBooking",
() =>
{
  it("debería crear la reserva y devolver el id",
  async () =>
  {
    stubInsertSingle({ data: { id: "book-1" }, error: null });

    const result = await new BookingService().createBooking(bookingFixture());

    expect(result).toEqual({ id: "book-1" });
  });

  it("debería lanzar con mensaje localizado cuando Supabase falla",
  async () =>
  {
    stubInsertSingle({ data: null, error: { message: "duplicado" } });

    await expect(new BookingService().createBooking(bookingFixture()))
      .rejects.toThrow("No se pudo crear la reserva: duplicado");
  });
});

describe("BookingService.confirmBooking",
() =>
{
  it("debería marcar pagado con el paymentId",
  async () =>
  {
    const { admin } = stubUpdateSingleEq({ error: null });

    await new BookingService().confirmBooking("book-1", "pay-1");

    expect(admin.from).toHaveBeenCalledWith("turnos");
  });

  it("debería lanzar cuando la confirmación falla",
  async () =>
  {
    stubUpdateSingleEq({ error: { message: "rls" } });

    await expect(new BookingService().confirmBooking("book-1", "pay-1"))
      .rejects.toThrow("No se pudo confirmar la reserva: rls");
  });
});

describe("BookingService.cancelBooking",
() =>
{
  it("debería cancelar la reserva",
  async () =>
  {
    const { eq } = stubUpdateSingleEq({ error: null });

    await new BookingService().cancelBooking("book-1");

    expect(eq).toHaveBeenCalledWith("id", "book-1");
  });

  it("debería lanzar cuando la cancelación falla",
  async () =>
  {
    stubUpdateSingleEq({ error: { message: "no existe" } });

    await expect(new BookingService().cancelBooking("book-1"))
      .rejects.toThrow("No se pudo cancelar la reserva: no existe");
  });
});

describe("BookingService.releaseBooking",
() =>
{
  it("debería liberar la reserva pendiente de seña",
  async () =>
  {
    const { eq } = stubUpdateSingleEq({ error: null });

    await new BookingService().releaseBooking("book-1");

    expect(eq).toHaveBeenCalledWith("id", "book-1");
  });

  it("debería lanzar cuando la liberación falla",
  async () =>
  {
    stubUpdateSingleEq({ error: { message: "bloqueado" } });

    await expect(new BookingService().releaseBooking("book-1"))
      .rejects.toThrow("No se pudo liberar la reserva: bloqueado");
  });
});

describe("BookingService.getAllBookings",
() =>
{
  it("debería devolver todas las reservas del negocio",
  async () =>
  {
    const order = vi.fn(async () => ({ data: [{ id: "b1" }], error: null }));
    const eq = vi.fn(() => ({ order }));
    const admin = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({ eq })),
      })),
    };
    mockGetSupabaseAdmin.mockReturnValue(admin as never);

    const result = await new BookingService().getAllBookings("neg-1");

    expect(result).toEqual([{ id: "b1" }]);
    expect(eq).toHaveBeenCalledWith("negocio_id", "neg-1");
  });

  it("debería devolver arreglo vacío sin datos",
  async () =>
  {
    const order = vi.fn(async () => ({ data: null, error: null }));
    const eq = vi.fn(() => ({ order }));
    mockGetSupabaseAdmin.mockReturnValue({
      from: vi.fn(() => ({ select: vi.fn(() => ({ eq })) })),
    } as never);

    await expect(new BookingService().getAllBookings("neg-1")).resolves.toEqual([]);
  });

  it("debería lanzar cuando la consulta falla",
  async () =>
  {
    const order = vi.fn(async () => ({ data: null, error: { message: "db" } }));
    const eq = vi.fn(() => ({ order }));
    mockGetSupabaseAdmin.mockReturnValue({
      from: vi.fn(() => ({ select: vi.fn(() => ({ eq })) })),
    } as never);

    await expect(new BookingService().getAllBookings("neg-1"))
      .rejects.toThrow("No se pudieron obtener las reservas: db");
  });
});

describe("BookingService.getPendingDeposits",
() =>
{
  it("debería filtrar pendientes más antiguos que el corte",
  async () =>
  {
    const lt = vi.fn(async () => ({ data: [{ id: "b1" }], error: null }));
    const secondEq = vi.fn(() => ({ lt }));
    const firstEq = vi.fn(() => ({ eq: secondEq }));
    const admin = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({ eq: firstEq })),
      })),
    };
    mockGetSupabaseAdmin.mockReturnValue(admin as never);

    const result = await new BookingService().getPendingDeposits("neg-1", 15);

    expect(result).toEqual([{ id: "b1" }]);
    expect(firstEq).toHaveBeenCalledWith("negocio_id", "neg-1");
    expect(secondEq).toHaveBeenCalledWith("estado", "pendiente");
    expect(lt).toHaveBeenCalledWith("created_at", expect.any(String));
  });

  it("debería devolver vacío sin señas pendientes",
  async () =>
  {
    const lt = vi.fn(async () => ({ data: null, error: null }));
    const secondEq = vi.fn(() => ({ lt }));
    const firstEq = vi.fn(() => ({ eq: secondEq }));
    mockGetSupabaseAdmin.mockReturnValue({
      from: vi.fn(() => ({ select: vi.fn(() => ({ eq: firstEq })) })),
    } as never);

    await expect(new BookingService().getPendingDeposits("neg-1")).resolves.toEqual([]);
  });

  it("debería lanzar cuando la consulta de señas falla",
  async () =>
  {
    const lt = vi.fn(async () => ({ data: null, error: { message: "timeout" } }));
    const secondEq = vi.fn(() => ({ lt }));
    const firstEq = vi.fn(() => ({ eq: secondEq }));
    mockGetSupabaseAdmin.mockReturnValue({
      from: vi.fn(() => ({ select: vi.fn(() => ({ eq: firstEq })) })),
    } as never);

    await expect(new BookingService().getPendingDeposits("neg-1"))
      .rejects.toThrow("No se pudieron obtener las señas pendientes: timeout");
  });
});

describe("BookingService.getBookingById",
() =>
{
  it("debería devolver la reserva por id",
  async () =>
  {
    const single = vi.fn(async () => ({ data: { id: "book-1" }, error: null }));
    const eq = vi.fn(() => ({ single }));
    mockGetSupabaseAdmin.mockReturnValue({
      from: vi.fn(() => ({ select: vi.fn(() => ({ eq })) })),
    } as never);

    await expect(new BookingService().getBookingById("book-1")).resolves.toEqual({ id: "book-1" });
  });

  it("debería devolver null cuando no hay filas (PGRST116)",
  async () =>
  {
    const single = vi.fn(async () => ({ data: null, error: { code: "PGRST116", message: "0 rows" } }));
    const eq = vi.fn(() => ({ single }));
    mockGetSupabaseAdmin.mockReturnValue({
      from: vi.fn(() => ({ select: vi.fn(() => ({ eq })) })),
    } as never);

    await expect(new BookingService().getBookingById("missing")).resolves.toBeNull();
  });

  it("debería lanzar ante otros errores",
  async () =>
  {
    const single = vi.fn(async () => ({ data: null, error: { code: "500", message: "db" } }));
    const eq = vi.fn(() => ({ single }));
    mockGetSupabaseAdmin.mockReturnValue({
      from: vi.fn(() => ({ select: vi.fn(() => ({ eq })) })),
    } as never);

    await expect(new BookingService().getBookingById("book-1"))
      .rejects.toThrow("No se pudo obtener la reserva: db");
  });
});

describe("BookingService.getBookingByPaymentId",
() =>
{
  it("debería buscar por mp_payment_id",
  async () =>
  {
    const single = vi.fn(async () => ({ data: { id: "book-1" }, error: null }));
    const limit = vi.fn(() => ({ single }));
    const eq = vi.fn(() => ({ limit }));
    mockGetSupabaseAdmin.mockReturnValue({
      from: vi.fn(() => ({ select: vi.fn(() => ({ eq })) })),
    } as never);

    await expect(new BookingService().getBookingByPaymentId("pay-1")).resolves.toEqual({ id: "book-1" });
  });

  it("debería devolver null sin filas",
  async () =>
  {
    const single = vi.fn(async () => ({ data: null, error: { code: "PGRST116", message: "0 rows" } }));
    const limit = vi.fn(() => ({ single }));
    const eq = vi.fn(() => ({ limit }));
    mockGetSupabaseAdmin.mockReturnValue({
      from: vi.fn(() => ({ select: vi.fn(() => ({ eq })) })),
    } as never);

    await expect(new BookingService().getBookingByPaymentId("pay-x")).resolves.toBeNull();
  });

  it("debería lanzar ante errores de lectura",
  async () =>
  {
    const single = vi.fn(async () => ({ data: null, error: { code: "500", message: "db" } }));
    const limit = vi.fn(() => ({ single }));
    const eq = vi.fn(() => ({ limit }));
    mockGetSupabaseAdmin.mockReturnValue({
      from: vi.fn(() => ({ select: vi.fn(() => ({ eq })) })),
    } as never);

    await expect(new BookingService().getBookingByPaymentId("pay-1"))
      .rejects.toThrow("No se pudo obtener la reserva: db");
  });
});

describe("BookingService.updateBooking",
() =>
{
  it("debería aplicar actualizaciones parciales",
  async () =>
  {
    const { eq } = stubUpdateSingleEq({ error: null });

    await new BookingService().updateBooking("book-1", { estado: "confirmado" });

    expect(eq).toHaveBeenCalledWith("id", "book-1");
  });

  it("debería lanzar cuando la actualización falla",
  async () =>
  {
    stubUpdateSingleEq({ error: { message: "rls" } });

    await expect(new BookingService().updateBooking("book-1", { estado: "confirmado" }))
      .rejects.toThrow("No se pudo actualizar la reserva: rls");
  });
});

describe("BookingService.processPayment",
() =>
{
  it("debería confirmar cuando MercadoPago aprueba",
  async () =>
  {
    vi.spyOn(paymentService, "getPaymentStatus").mockResolvedValueOnce({
      id: "pay-1",
      status: "approved",
      externalReference: "book-1",
    });
    const { eq } = stubUpdateSingleEq({ error: null });
    const confirmSpy = vi.spyOn(BookingService.prototype, "confirmBooking");
    confirmSpy.mockResolvedValueOnce(undefined);

    await new BookingService().processPayment("book-1", "pay-1", 5000);

    expect(confirmSpy).toHaveBeenCalledWith("book-1", "pay-1");
    expect(eq).not.toHaveBeenCalled();
  });

  it("debería liberar cuando MercadoPago rechaza",
  async () =>
  {
    vi.spyOn(paymentService, "getPaymentStatus").mockResolvedValueOnce({
      id: "pay-1",
      status: "rejected",
      externalReference: "book-1",
    });
    const releaseSpy = vi.spyOn(BookingService.prototype, "releaseBooking");
    releaseSpy.mockResolvedValueOnce(undefined);

    await new BookingService().processPayment("book-1", "pay-1", 5000);

    expect(releaseSpy).toHaveBeenCalledWith("book-1");
  });

  it("debería no mutar cuando el pago sigue pendiente",
  async () =>
  {
    vi.spyOn(paymentService, "getPaymentStatus").mockResolvedValueOnce({
      id: "pay-1",
      status: "pending",
      externalReference: "book-1",
    });
    const confirmSpy = vi.spyOn(BookingService.prototype, "confirmBooking");
    const releaseSpy = vi.spyOn(BookingService.prototype, "releaseBooking");
    confirmSpy.mockResolvedValueOnce(undefined);
    releaseSpy.mockResolvedValueOnce(undefined);

    await new BookingService().processPayment("book-1", "pay-1", 5000);

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(releaseSpy).not.toHaveBeenCalled();
  });
});

describe("BookingService integración",
() =>
{
  it("debería crear y confirmar punta a punta con colaboradores mockeados",
  async () =>
  {
    stubInsertSingle({ data: { id: "book-int" }, error: null });
    const service = new BookingService();
    const created = await service.createBooking(bookingFixture());

    expect(created.id).toBe("book-int");

    vi.spyOn(paymentService, "getPaymentStatus").mockResolvedValueOnce({
      id: "pay-int",
      status: "approved",
      externalReference: "book-int",
    });
    const confirmSpy = vi.spyOn(BookingService.prototype, "confirmBooking");
    confirmSpy.mockResolvedValueOnce(undefined);

    await service.processPayment(created.id, "pay-int", 5000);

    expect(confirmSpy).toHaveBeenCalledWith("book-int", "pay-int");
  });
});
