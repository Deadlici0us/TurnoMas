import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { paymentService } from "./payment";

export interface BookingData
{
  negocioId: string;
  staffId: string;
  servicioId: string;
  clienteId: string;
  inicio: string;
  fin: string;
  montoTotal: number;
  senaMonto: number | null;
  senaPorcentaje: number;
  estado: "pendiente" | "pagado" | "completado" | "cancelado" | "ausente";
}

export class BookingService
{
  private get admin()
  {
    return getSupabaseAdmin();
  }

  async createBooking(data: BookingData): Promise<{ id: string }>
  {
    const { data: booking, error } = await this.admin
      .from("turnos")
      .insert(data)
      .select("id")
      .single();

    if (error)
    {
      throw new Error(`No se pudo crear la reserva: ${error.message}`);
    }

    return { id: booking.id };
  }

  async confirmBooking(bookingId: string, paymentId: string): Promise<void>
  {
    const { error } = await this.admin
      .from("turnos")
      .update({ estado: "pagado", mp_payment_id: paymentId })
      .eq("id", bookingId);

    if (error)
    {
      throw new Error(`No se pudo confirmar la reserva: ${error.message}`);
    }
  }

  async cancelBooking(bookingId: string): Promise<void>
  {
    const { error } = await this.admin
      .from("turnos")
      .update({ estado: "cancelado" })
      .eq("id", bookingId);

    if (error)
    {
      throw new Error(`No se pudo cancelar la reserva: ${error.message}`);
    }
  }

  async releaseBooking(bookingId: string): Promise<void>
  {
    const { error } = await this.admin
      .from("turnos")
      .update({ estado: "cancelado" })
      .eq("id", bookingId);

    if (error)
    {
      throw new Error(`No se pudo liberar la reserva: ${error.message}`);
    }
  }

  async getAllBookings(negocioId: string): Promise<unknown[]>
  {
    const { data, error } = await this.admin
      .from("turnos")
      .select("*")
      .eq("negocio_id", negocioId)
      .order("inicio", { ascending: false });

    if (error)
    {
      throw new Error(`No se pudieron obtener las reservas: ${error.message}`);
    }

    return data || [];
  }

  async getPendingDeposits(negocioId: string, olderThanMinutes: number = 15): Promise<unknown[]>
  {
    const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000).toISOString();

    const { data, error } = await this.admin
      .from("turnos")
      .select("*")
      .eq("negocio_id", negocioId)
      .eq("estado", "pendiente")
      .lt("created_at", cutoff);

    if (error)
    {
      throw new Error(`No se pudieron obtener las señas pendientes: ${error.message}`);
    }

    return data || [];
  }

  async processPayment(
    bookingId: string,
    paymentId: string,
    _amountCents: number,
  ): Promise<void>
  {
    void _amountCents;
    // Verifica el estado del pago con MercadoPago.
    const paymentStatus = await paymentService.getPaymentStatus(paymentId);

    if (paymentStatus.status === "approved")
    {
      await this.confirmBooking(bookingId, paymentId);
    }
    else if (paymentStatus.status === "rejected" || paymentStatus.status === "cancelled")
    {
      await this.releaseBooking(bookingId);
    }
  }

  async getBookingById(bookingId: string): Promise<unknown | null>
  {
    const { data, error } = await this.admin
      .from("turnos")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (error && error.code !== "PGRST116") // PGRST116 means no rows returned
    {
      throw new Error(`No se pudo obtener la reserva: ${error.message}`);
    }

    return data ?? null;
  }

  /** Busca el turno por `mp_payment_id` (webhook con token delegado). */
  async getBookingByPaymentId(paymentId: string): Promise<unknown | null>
  {
    const { data, error } = await this.admin
      .from("turnos")
      .select("id, negocio_id, estado")
      .eq("mp_payment_id", paymentId)
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116")
    {
      throw new Error(`No se pudo obtener la reserva: ${error.message}`);
    }

    return data ?? null;
  }

  async updateBooking(bookingId: string, updates: Partial<BookingData>): Promise<void>
  {
    const { error } = await this.admin
      .from("turnos")
      .update(updates)
      .eq("id", bookingId);

    if (error)
    {
      throw new Error(`No se pudo actualizar la reserva: ${error.message}`);
    }
  }
}

export const bookingService = new BookingService();