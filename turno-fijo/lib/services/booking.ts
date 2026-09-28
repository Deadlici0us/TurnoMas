import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { paymentService } from "./payment";
import { readEnv } from "@/lib/env/env";

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
      throw new Error(`Failed to create booking: ${error.message}`);
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
      throw new Error(`Failed to confirm booking: ${error.message}`);
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
      throw new Error(`Failed to cancel booking: ${error.message}`);
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
      throw new Error(`Failed to release booking: ${error.message}`);
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
      throw new Error(`Failed to get bookings: ${error.message}`);
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
      throw new Error(`Failed to get pending deposits: ${error.message}`);
    }

    return data || [];
  }

  async processPayment(
    bookingId: string,
    paymentId: string,
    amountCents: number,
  ): Promise<void>
  {
    // Verify payment status with MercadoPago
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
      throw new Error(`Failed to get booking: ${error.message}`);
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
      throw new Error(`Failed to update booking: ${error.message}`);
    }
  }
}

export const bookingService = new BookingService();