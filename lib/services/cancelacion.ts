/**
 * Cancelación compartida dueño/cliente (Módulo 5, Gestor de Reembolsos).
 *
 * Servicio único para no duplicar lógica (SRP): el dueño cancela desde la
 * agenda y el cliente desde su link firmado; ambos pasan por acá.
 * Anti doble-pago: claim atómico `reclamar_reembolso` (FOR UPDATE) + tabla
 * `reembolsos(idempotency_key UNIQUE)` + `X-Idempotency-Key` en MP.
 *
 * CONTRATO para futuros canales (bot de WhatsApp, email, push): toda
 * cancelación con posible reembolso DEBE pasar por `cancelarTurno()`.
 * Los writers directos (`update estado=cancelado`, `releaseBooking`) no
 * tienen claim atómico y reintroducen el TOCTOU de doble-reembolso.
 * Excepciones sin dinero (antifantasma sobre `pendiente`, webhook
 * `rejected`) usan updates condicionales por estado + rowcount.
 */

import { createHash } from "node:crypto";

import { horasRestantesPara, resolverRetencionHs, shouldAutoRefund } from "@/lib/payments/refund-policy";
import type { RefundableEstado } from "@/lib/payments/refund-policy";
import { validarTransicionTurno } from "@/lib/dashboard/estados";
import type { EstadoTurno } from "@/lib/dashboard/estados";
import { calendarService } from "./calendar";
import { paymentService } from "./payment";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type ActorCancelacion = "cliente" | "duenio" | "sistema";
export type ResultadoReembolso = "devuelta" | "retenida" | "no_aplica" | "fallido_reintentable"
  | "ya_devuelta";

export interface CancelarTurnoInput
{
  readonly turnoId: string;
  readonly actor: ActorCancelacion;
  readonly ipHash?: string | null;
  readonly reclamoExistente?: boolean;
}

export interface CancelarTurnoResultado
{
  readonly estado: "cancelado";
  readonly reembolso: ResultadoReembolso;
  readonly horasRestantes: number | null;
  readonly retencionHs: number;
}

export class CancelacionError extends Error
{
  readonly codigo: "no_encontrado" | "ya_cerrado" | "transicion_invalida" | "conflicto_reembolso"
    | "cancelacion_fallida";
  readonly status: number;

  constructor(codigo: CancelacionError["codigo"], message: string, status: number)
  {
    super(message);
    this.name = "CancelacionError";
    this.codigo = codigo;
    this.status = status;
  }
}

interface TurnoCancelacion
{
  readonly id: string;
  readonly negocio_id: string;
  readonly estado: string;
  readonly inicio: string;
  readonly cliente_id: string;
  readonly servicio_id: string | null;
  readonly mp_payment_id: string | null;
  readonly google_calendar_event_id: string | null;
  readonly sena_reembolsada: boolean | null;
}

/** SHA-256 de la IP (auditoría sin guardar PII). */
export function hashIp(ip: string | null | undefined): string | null
{
  if (typeof ip !== "string" || ip.trim().length === 0)
  {
    return null;
  }

  return createHash("sha256").update(ip.trim(), "utf8").digest("hex");
}

/** Key estable por turno+pago para dedup en MP y en `reembolsos`. */
export function claveIdempotenciaReembolso(turnoId: string, mpPaymentId: string): string
{
  return `turno-${turnoId}-pago-${mpPaymentId}`;
}

async function registrarEvento(
  admin: ReturnType<typeof getSupabaseAdmin>,
  turnoId: string,
  actor: ActorCancelacion,
  accion: "cancelacion_solicitada" | "reembolso_ok" | "reembolso_fallido"
    | "retenida_por_politica" | "cancelacion_sin_reembolso",
  detalle: Record<string, unknown>,
): Promise<void>
{
  try
  {
    await admin.from("turno_eventos").insert({
      turno_id: turnoId,
      actor,
      accion,
      detalle,
    });
  }
  catch
  {
    // Best-effort: la auditoría nunca rompe la cancelación.
  }
}

/**
 * Valida que el turno pueda pasar a cancelado, mapeando el error.
 *
 * @param estado Estado actual del turno.
 * @throws CancelacionError cuando la transición no es válida.
 */
function asegurarTransicionCancelable(estado: EstadoTurno): void
{
  try
  {
    validarTransicionTurno(estado, "cancelado");
  }
  catch (error)
  {
    if (error instanceof RangeError && error.message.includes("ya está cerrado"))
    {
      throw new CancelacionError("ya_cerrado", "Ese turno ya está cerrado.", 409);
    }

    throw new CancelacionError(
      "transicion_invalida",
      error instanceof Error ? error.message : "No se puede cancelar ese turno.",
      409,
    );
  }
}

interface ContextoReembolso
{
  readonly debeReembolsar: boolean;
  readonly inicioValido: boolean;
  readonly horasRestantes: number | null;
  readonly retencionHs: number;
  readonly detalleBase: Record<string, unknown>;
}

/**
 * Carga servicio y negocio, y resuelve si corresponde reembolsar.
 *
 * @param admin Cliente admin de Supabase.
 * @param turno Turno a cancelar.
 * @param ipHash Hash de IP para auditoría, o null.
 * @return Contexto con la decisión de reembolso y el detalle base del evento.
 */
async function cargarContextoReembolso(
  admin: ReturnType<typeof getSupabaseAdmin>,
  turno: TurnoCancelacion,
  ipHash: string | null,
): Promise<ContextoReembolso>
{
  const { data: servicio } = typeof turno.servicio_id === "string"
    ? await admin.from("servicios").select("reembolso_auto")
      .eq("id", turno.servicio_id).single()
    : { data: null };
  const { data: negocioRow } = await admin.from("negocios").select("sena_retencion_hs")
    .eq("id", turno.negocio_id).single();
  const reembolsoAuto = (servicio as { reembolso_auto?: unknown } | null)?.reembolso_auto !== false;
  const retencionHs = resolverRetencionHs(
    (negocioRow as { sena_retencion_hs?: unknown } | null)?.sena_retencion_hs);
  const inicio = new Date(turno.inicio);
  const inicioValido = !Number.isNaN(inicio.getTime());
  const horasRestantes = inicioValido ? horasRestantesPara(inicio, new Date()) : null;
  const debeReembolsar = inicioValido && shouldAutoRefund({
    reembolsoAuto,
    estado: turno.estado as RefundableEstado,
    mpPaymentId: turno.mp_payment_id,
    horasRestantes,
    retencionHs,
  });

  return {
    debeReembolsar,
    inicioValido,
    horasRestantes,
    retencionHs,
    detalleBase: {
      horasRestantes,
      retencionHs,
      estadoPrevio: turno.estado,
      ipHash,
    },
  };
}

/**
 * Reclama atómicamente un reembolso (RPC o fallback condicional).
 *
 * @param admin Cliente admin de Supabase.
 * @param turno Turno cuyo reembolso se reclama.
 * @param mpPaymentId ID del pago en MercadoPago.
 * @return Clave de idempotencia usada en el reclamo.
 * @throws CancelacionError cuando otro proceso ya ganó el reclamo.
 */
async function reclamarReembolso(
  admin: ReturnType<typeof getSupabaseAdmin>,
  turno: TurnoCancelacion,
  mpPaymentId: string,
): Promise<string>
{
  const idempotencyKey = claveIdempotenciaReembolso(turno.id, mpPaymentId);
  const { data: claimData, error: claimError } = await admin.rpc(
    "reclamar_reembolso",
    { p_turno_id: turno.id, p_mp_payment_id: mpPaymentId, p_idempotency_key: idempotencyKey },
  );

  if (claimError !== null)
  {
    // Sin RPC (DB sin migrar): fallback a UPDATE condicional con rowcount.
    const ganado = await reclamarConUpdateCondicional(admin, turno.id);

    if (!ganado)
    {
      throw new CancelacionError(
        "conflicto_reembolso",
        "Ese turno ya está siendo procesado. Probá de nuevo en unos segundos.",
        409,
      );
    }

    return idempotencyKey;
  }

  const fila = (Array.isArray(claimData) ? claimData[0] : claimData) as { ganador?: unknown } | null;

  if (fila?.ganador !== true)
  {
    throw new CancelacionError(
      "conflicto_reembolso",
      "Ese turno ya está siendo procesado. Probá de nuevo en unos segundos.",
      409,
    );
  }

  return idempotencyKey;
}

/**
 * Ejecuta el reembolso correspondiente y registra el evento resultante.
 *
 * @param admin Cliente admin de Supabase.
 * @param turno Turno a cancelar.
 * @param contexto Decisión de reembolso y detalle base.
 * @param actor Actor que origina la cancelación.
 * @return Resultado del reembolso.
 */
async function resolverReembolso(
  admin: ReturnType<typeof getSupabaseAdmin>,
  turno: TurnoCancelacion,
  contexto: ContextoReembolso,
  actor: ActorCancelacion,
): Promise<ResultadoReembolso>
{
  if (turno.sena_reembolsada === true)
  {
    return "ya_devuelta";
  }

  if (contexto.debeReembolsar && turno.mp_payment_id !== null)
  {
    const mpPaymentId = turno.mp_payment_id;
    const idempotencyKey = await reclamarReembolso(admin, turno, mpPaymentId);

    try
    {
      const { refundId } = await paymentService.refundForNegocio(turno.negocio_id, mpPaymentId, idempotencyKey);

      await admin.from("turnos").update({
        sena_reembolsada: true,
        sena_reembolsada_at: new Date().toISOString(),
      }).eq("id", turno.id);
      await admin.from("reembolsos").update({ estado: "ok", mp_refund_id: refundId })
        .eq("turno_id", turno.id);
      await registrarEvento(admin, turno.id, actor, "reembolso_ok", {
        ...contexto.detalleBase,
        mpRefundId: refundId,
        idempotencyKey,
      });

      return "devuelta";
    }
    catch (error)
    {
      const mensaje = error instanceof Error ? error.message : "Error desconocido";

      await admin.from("reembolsos").update({ estado: "fallido", error: mensaje })
        .eq("turno_id", turno.id);
      await registrarEvento(admin, turno.id, actor, "reembolso_fallido", {
        ...contexto.detalleBase,
        error: mensaje,
        idempotencyKey,
      });

      return "fallido_reintentable";
    }
  }

  if (turno.estado === "pagado" && turno.mp_payment_id !== null && contexto.inicioValido)
  {
    await registrarEvento(admin, turno.id, actor, "retenida_por_politica", contexto.detalleBase);

    return "retenida";
  }

  await registrarEvento(admin, turno.id, actor, "cancelacion_sin_reembolso", contexto.detalleBase);

  return "no_aplica";
}

/**
 * Cancela el turno con reembolso automático según política.
 *
 * @param input Turno, actor y contexto.
 * @return Estado final + resultado del reembolso.
 */
export async function cancelarTurno(input: CancelarTurnoInput): Promise<CancelarTurnoResultado>
{
  if (input.reclamoExistente === true)
  {
    throw new CancelacionError(
      "conflicto_reembolso",
      "Ese turno ya está siendo procesado. Probá de nuevo en unos segundos.",
      409,
    );
  }

  const admin = getSupabaseAdmin();
  const { data: turnoData, error: turnoError } = await admin.from("turnos")
    .select("id, negocio_id, estado, inicio, cliente_id, servicio_id, mp_payment_id," +
      " google_calendar_event_id, sena_reembolsada")
    .eq("id", input.turnoId).single();

  if (turnoError !== null && (turnoError as { code?: string }).code !== "PGRST116")
  {
    console.error("Cancelación sin lectura del turno:", turnoError.message, { turnoId: input.turnoId });

    throw new CancelacionError(
      "cancelacion_fallida",
      "No pudimos leer el turno. Probá de nuevo.",
      500,
    );
  }

  if (turnoData === null)
  {
    throw new CancelacionError("no_encontrado", "No encontramos ese turno.", 404);
  }

  const turno = turnoData as unknown as TurnoCancelacion;

  asegurarTransicionCancelable(turno.estado as EstadoTurno);

  const contexto = await cargarContextoReembolso(admin, turno, input.ipHash ?? null);

  await registrarEvento(admin, turno.id, input.actor, "cancelacion_solicitada", contexto.detalleBase);

  const reembolso = await resolverReembolso(admin, turno, contexto, input.actor);

  const { error: cancelError } = await admin.from("turnos")
    .update({ estado: "cancelado" }).eq("id", turno.id)
    .eq("estado", turno.estado);

  if (cancelError !== null)
  {
    throw new CancelacionError(
      "cancelacion_fallida",
      "No pudimos cancelar el turno. Probá de nuevo.",
      500,
    );
  }

  if (typeof turno.google_calendar_event_id === "string" && turno.google_calendar_event_id.length > 0)
  {
    await calendarService.deleteEventForNegocio(turno.negocio_id, turno.google_calendar_event_id);
  }

  const resultado = {
    estado: "cancelado",
    reembolso,
    horasRestantes: contexto.horasRestantes,
    retencionHs: contexto.retencionHs,
  } as const;

  await notificarCancelacion(admin, turno, resultado);

  return resultado;
}

/**
 * Fallback sin RPC: reclama con UPDATE condicional (solo 1 gana).
 *
 * @param admin Cliente admin.
 * @param turnoId ID del turno.
 * @return Verdadero cuando este llamado ganó el reclamo.
 */
async function reclamarConUpdateCondicional(
  admin: ReturnType<typeof getSupabaseAdmin>,
  turnoId: string,
): Promise<boolean>
{
  try
  {
    const { error, data } = await admin.from("turnos").update({ sena_reembolsada: true })
      .eq("id", turnoId).eq("sena_reembolsada", false).eq("estado", "pagado")
      .select("id");

    if (error !== null)
    {
      return false;
    }

    return Array.isArray(data) ? data.length > 0 : true;
  }
  catch
  {
    return false;
  }
}

/**
 * Notifica la cancelación al cliente (email) y al dueño (auditoría visible).
 *
 * Best-effort: nunca rompe la cancelación ya confirmada.
 *
 * @param admin Cliente admin.
 * @param turno Turno cancelado.
 * @param resultado Resultado con destino del reembolso.
 */
async function notificarCancelacion(
  admin: ReturnType<typeof getSupabaseAdmin>,
  turno: TurnoCancelacion,
  resultado: CancelarTurnoResultado,
): Promise<void>
{
  try
  {
    const [{ data: cliente }, { data: contexto }] = await Promise.all([
      admin.from("clientes").select("email, nombre").eq("id", turno.cliente_id).single(),
      admin.from("turnos")
        .select("negocio:negocios(nombre, timezone, pais), servicio:servicios(nombre)," +
          " staff:staff(nombre)")
        .eq("id", turno.id).single(),
    ]);
    const email = (cliente as { email?: unknown } | null)?.email;

    if (typeof email !== "string" || email.trim().length === 0)
    {
      return;
    }

    const fila = contexto as unknown as {
      negocio: { nombre?: string; timezone?: unknown; pais?: unknown } | null;
      servicio: { nombre?: string } | null;
      staff: { nombre?: string } | null;
    } | null;
    const { resolverTimezoneNegocio, formatearEnZona } = await import("@/lib/timezone/timezone");
    const { plantillaCancelacion } = await import("@/lib/notifications/templates");
    const { ResendAdapter } = await import("@/lib/ports/email");
    const timeZone = resolverTimezoneNegocio({
      timezone: fila?.negocio?.timezone, pais: fila?.negocio?.pais,
    });
    const inicio = new Date(turno.inicio);
    const plantilla = plantillaCancelacion({
      negocio: fila?.negocio?.nombre ?? "tu negocio",
      servicio: fila?.servicio?.nombre ?? "tu servicio",
      profesional: fila?.staff?.nombre ?? "tu profesional",
      fecha: Number.isNaN(inicio.getTime()) ? turno.inicio : formatearEnZona(inicio, timeZone),
      cancelacionUrl: "",
      seDevuelve: resultado.reembolso === "devuelta",
      retencionHs: resultado.retencionHs,
    });

    await new ResendAdapter().send({
      to: email.trim(),
      subject: plantilla.subject,
      fromName: fila?.negocio?.nombre ?? undefined,
      html: plantilla.html,
    });
  }
  catch
  {
    // Best-effort: el turno ya quedó cancelado aunque falle el email.
  }
}
