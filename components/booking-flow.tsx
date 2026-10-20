"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";

import { BUFFER_MINUTOS, buildAvailableSlots } from "@/lib/booking/slots";
import type { DiaDisponible } from "@/lib/booking/slots";
import { formatearARS } from "@/lib/dashboard/moneda";
import { formatearDiaLargoYMes, formatearDiaYMes } from "@/lib/format/fecha";
import type
{
  PortalAsociacion,
  PortalBloqueo,
  PortalServicio,
  PortalStaff,
  PortalTurno,
} from "@/lib/portal/demo-business";
import { tieneSenaEfectiva } from "@/lib/reservas/montos";
import { serviciosDeStaff } from "@/lib/staff/servicios";
import { esEmailValido } from "@/lib/validation/email";

interface BookingFlowProps
{
  readonly negocioNombre: string;
  readonly negocioLogoUrl?: string | null;
  readonly negocioDescripcion?: string | null;
  readonly pais: string;
  readonly slug: string;
  readonly staff: readonly PortalStaff[];
  readonly servicios: readonly PortalServicio[];
  readonly asociaciones: readonly PortalAsociacion[];
  readonly turnos: readonly PortalTurno[];
  readonly bloqueos: readonly PortalBloqueo[];
  readonly horariosNegocio?: Record<string, string> | null;
  readonly requiereEmail?: boolean;
  /** Demo de solo lectura: simula la reserva sin llamar al backend. */
  readonly demo?: boolean;
}

function formatSlot(date: Date): string
{
  const hora = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

  return `${formatearDiaYMes(date)} ${hora}`;
}

const WHATSAPP_PATTERN = /^\+?[\d\s-]{7,}$/;

interface ValidacionReserva
{
  readonly nombre: string;
  readonly whatsapp: string;
  readonly email: string;
  readonly requiereEmail: boolean;
}

/**
 * Valida los datos del formulario de reserva antes de enviarlos.
 *
 * @param datos Datos ya recortados del formulario.
 * @return Mensaje de error, o null si los datos son válidos.
 */
function validarReserva(datos: ValidacionReserva): string | null
{
  if (datos.nombre.length < 2)
  {
    return "Contanos tu nombre para confirmar la reserva.";
  }

  if (!WHATSAPP_PATTERN.test(datos.whatsapp))
  {
    return "Revisá tu WhatsApp para que podamos contactarte.";
  }

  if (datos.requiereEmail && datos.email.length === 0)
  {
    return "Dejanos tu email para confirmar y avisarte.";
  }

  if (datos.email.length > 0 && !esEmailValido(datos.email))
  {
    return "Revisá tu email para que te lleguen las confirmaciones.";
  }

  return null;
}

interface EncabezadoBookingProps
{
  readonly negocioNombre: string;
  readonly negocioLogoUrl: string | null;
  readonly negocioDescripcion: string | null;
}

/**
 * Renderiza el encabezado público del portal de reservas.
 *
 * @param props Datos del negocio a mostrar.
 * @return Encabezado con logo, nombre y descripción opcionales.
 */
function renderEncabezado(props: EncabezadoBookingProps): ReactNode
{
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      {props.negocioLogoUrl !== null && props.negocioLogoUrl.length > 0 ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={props.negocioLogoUrl} alt={props.negocioNombre} className="size-16 rounded-2xl object-cover" />
      ) : null}
      <div>
        <h1 className="font-heading text-2xl font-extrabold text-navy">{props.negocioNombre}</h1>
        {props.negocioDescripcion !== null && props.negocioDescripcion.length > 0 ? (
          <p className="text-sm text-muted-foreground mb-1">{props.negocioDescripcion}</p>
        ) : null}
        <p className="text-sm text-muted-foreground">Reservá tu turno en 4 pasos.</p>
      </div>
    </div>
  );
}

interface ConfirmadoBookingProps
{
  readonly profesionalNombre: string;
  readonly servicio: PortalServicio;
  readonly slot: Date;
  readonly email: string;
  readonly emailEnviado: boolean;
  readonly demo: boolean;
}

/**
 * Renderiza la pantalla de confirmación de la reserva.
 *
 * @param props Profesional, servicio, horario y estado del email confirmados.
 * @return Panel de éxito con el detalle de la reserva.
 */
function renderConfirmado(props: ConfirmadoBookingProps): ReactNode
{
  return (
    <div data-testid="reserva-confirmada" className="animate-scale-in ui-card space-y-4 p-8 text-center">
      <div className="animate-scale-in mx-auto flex size-16 items-center justify-center rounded-full
        bg-success-soft text-success">
        <svg viewBox="0 0 24 24" className="size-8" fill="none" stroke="currentColor">
          <path
            d="M5 13l4 4L19 7"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={48}
            className="animate-check-draw"
          />
        </svg>
      </div>
      <h1 className="font-heading text-2xl font-bold text-navy">¡Reserva confirmada!</h1>
      <p className="text-sm text-muted-foreground">
        {props.servicio.nombre} con {props.profesionalNombre} · {formatSlot(props.slot)}
      </p>
      {!props.demo && props.email.length > 0 && props.emailEnviado ? (
        <p className="text-sm text-muted-foreground">
          Te enviamos la confirmación a {props.email}. Guardá ese mail: es tu comprobante y tiene
          el link para cancelar.
        </p>
      ) : null}
      {!props.demo && props.email.length > 0 && !props.emailEnviado ? (
        <p className="ui-alert ui-alert-warning text-xs">
          No pudimos enviar el email de confirmación. Guardá una captura de esta pantalla para
          tener los datos.
        </p>
      ) : null}
      {!props.demo && props.email.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No dejaste email. Guardá una captura de esta pantalla para tener los datos.
        </p>
      ) : null}
      {props.demo ? (
        <p className="ui-alert ui-alert-info text-xs">
          Estás viendo la demo: esta reserva es simulada y no se guardó en la base de datos.
        </p>
      ) : null}
      {!props.demo && tieneSenaEfectiva(props.servicio.senaRequerida, props.servicio.senaPorcentaje) ? (
        <p className="ui-alert ui-alert-warning text-xs">
          En esta demo no se realiza el cobro. En producción serías redirigido a MercadoPago
          para pagar la seña del {props.servicio.senaPorcentaje}% ({formatearARS(props.servicio.precioBase)}).
        </p>
      ) : null}
    </div>
  );
}

interface HorarioBookingProps
{
  readonly dias: readonly DiaDisponible[];
  readonly diaISO: string | null;
  readonly slotISO: string | null;
  readonly elegirDia: (iso: string) => void;
  readonly elegirHora: (iso: string) => void;
  readonly volverADias: () => void;
}

/**
 * Renderiza el paso 3: selección de día y horario.
 *
 * @param props Días disponibles, selección actual y acciones de elección.
 * @return Sección con el selector de día u hora según el estado.
 */
function renderHorario(props: HorarioBookingProps): ReactNode
{
  const titulo = <h2 className="ui-section-title">3. Elegí el horario</h2>;

  if (props.dias.length === 0)
  {
    return (
      <section className="animate-fade-up space-y-3">
        {titulo}
        <p className="text-sm text-muted-foreground">Sin horarios libres los próximos 7 días. Probá con otro profesional.</p>
      </section>
    );
  }

  if (props.diaISO === null)
  {
    return (
      <section className="animate-fade-up space-y-3">
        {titulo}
        <div className="space-y-3">
          <p className="text-sm text-ink font-medium">Elegí el día</p>
          <div className="grid grid-cols-1 gap-2">
            {props.dias.map((dia) => (
              <button
                key={dia.date.toISOString()}
                onClick={() => props.elegirDia(dia.date.toISOString())}
                aria-label={`Elegir día ${formatearDiaLargoYMes(dia.date)}`}
                className="min-h-14 w-full rounded-lg border border-line bg-white px-4 py-3 text-left
                  transition-all duration-200 hover:border-primary/50 hover:bg-surface"
              >
                <span className="block font-semibold text-navy capitalize">
                  {formatearDiaLargoYMes(dia.date)}
                </span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  {dia.starts.length === 1 ? "1 horario libre" : `${dia.starts.length} horarios libres`}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>
    );
  }

  const diaElegido = props.dias.find((dia) => dia.date.toISOString() === props.diaISO);

  return (
    <section className="space-y-3">
      {titulo}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-ink font-medium">
            Elegí la hora del{" "}
            <span className="font-semibold text-navy capitalize">
              {diaElegido !== undefined ? formatearDiaLargoYMes(diaElegido.date) : ""}
            </span>
          </p>
          <button
            onClick={props.volverADias}
            className="min-h-11 px-2 text-xs font-semibold text-primary underline underline-offset-4
              hover:text-navy"
          >
            Cambiar día
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(diaElegido?.starts ?? []).map((start) => (
            <button
              key={start.toISOString()}
              onClick={() => props.elegirHora(start.toISOString())}
              aria-pressed={props.slotISO === start.toISOString()}
              className={`min-h-14 rounded-lg border px-2 py-3 text-base font-bold tabular-nums
                transition-all duration-200 ${
                  props.slotISO === start.toISOString()
                    ? "border-primary bg-primary text-white shadow-sm"
                    : "border-line bg-white text-navy hover:border-primary/50 hover:bg-soft"
                }`}
            >
              {`${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

interface DatosBookingProps
{
  readonly nombre: string;
  readonly whatsapp: string;
  readonly email: string;
  readonly error: string | null;
  readonly enviando: boolean;
  readonly requiereEmail: boolean;
  readonly onNombre: (valor: string) => void;
  readonly onWhatsapp: (valor: string) => void;
  readonly onEmail: (valor: string) => void;
  readonly onConfirmar: () => void;
}

const CLASE_INPUT_BOOKING = "ui-input h-11";

/**
 * Renderiza el paso 4: datos del cliente y botón de confirmación.
 *
 * @param props Valores del formulario y sus manejadores.
 * @return Sección con los campos de contacto y el botón de confirmar.
 */
function renderDatos(props: DatosBookingProps): ReactNode
{
  return (
    <section className="animate-fade-up space-y-3">
      <h2 className="ui-section-title">4. Tus datos</h2>
      <div className="space-y-3">
        <div>
          <label htmlFor="booking-nombre" className="ui-label mb-1">
            Nombre
          </label>
          <input
            id="booking-nombre"
            value={props.nombre}
            onChange={(event) => props.onNombre(event.target.value)}
            placeholder="Ej: Juan Pérez"
            className={CLASE_INPUT_BOOKING}
          />
        </div>
        <div>
          <label htmlFor="booking-whatsapp" className="ui-label mb-1">
            WhatsApp
          </label>
          <input
            id="booking-whatsapp"
            value={props.whatsapp}
            onChange={(event) => props.onWhatsapp(event.target.value)}
            placeholder="Ej: +549110000001"
            inputMode="tel"
            className={CLASE_INPUT_BOOKING}
          />
        </div>
        <div>
          <label htmlFor="booking-email" className="ui-label mb-1">
            Email{" "}
            <span className="font-normal text-muted-foreground">
              {props.requiereEmail ? "(para confirmar y avisarte)" : "(opcional, para confirmación)"}
            </span>
          </label>
          <input
            id="booking-email"
            value={props.email}
            onChange={(event) => props.onEmail(event.target.value)}
            placeholder="Ej: juan@ejemplo.com"
            inputMode="email"
            required={props.requiereEmail}
            className={CLASE_INPUT_BOOKING}
          />
        </div>
        {props.error !== null ? (
          <p key={props.error} className="ui-alert ui-alert-danger animate-shake text-sm" role="alert">
            {props.error}
          </p>
        ) : null}
        <button
          onClick={props.onConfirmar}
          disabled={props.enviando}
          className="ui-btn ui-btn-cta w-full"
        >
          {props.enviando ? (
            <>
              <span className="ui-spinner" aria-hidden="true" />
              Guardando tu reserva...
            </>
          ) : "Confirmar reserva"}
        </button>
      </div>
    </section>
  );
}

export default function BookingFlow({ negocioNombre, negocioLogoUrl = null, negocioDescripcion = null,
  pais, slug, staff, servicios, asociaciones, turnos,
  bloqueos, horariosNegocio = null, requiereEmail = false, demo = false }: BookingFlowProps)
{
  const [staffId, setStaffId] = useState<string | null>(null);
  const [servicioId, setServicioId] = useState<string | null>(null);
  const [diaISO, setDiaISO] = useState<string | null>(null);
  const [slotISO, setSlotISO] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmado, setConfirmado] = useState(false);
  const [emailEnviado, setEmailEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const profesional = staff.find((s) => s.id === staffId) ?? null;
  const servicio = servicios.find((s) => s.id === servicioId) ?? null;

  const serviciosDisponibles = useMemo(
    () => profesional === null ? [] : serviciosDeStaff(servicios, asociaciones, profesional.id),
    [profesional, servicios, asociaciones],
  );

  const dias: readonly DiaDisponible[] = useMemo(
  () =>
  {
    if (profesional === null || servicio === null)
    {
      return [];
    }

    const bloqueosTurnos = turnos.map((t) =>
    {
      const base = servicios.find((s) => s.id === t.servicioId);

      return {
        staffId: t.staffId,
        inicio: t.inicio,
        duracionMin: base?.duracionMin ?? servicio.duracionMin,
      };
    });

    const bloqueosNegocio = bloqueos
      .map((b) => ({ start: new Date(b.inicio), end: new Date(b.fin) }))
      .filter((b) => !Number.isNaN(b.start.getTime()) && !Number.isNaN(b.end.getTime()));

    return buildAvailableSlots({
      horarios: profesional.horarios,
      turnos: bloqueosTurnos,
      serviceMinutes: servicio.duracionMin,
      now: new Date(),
      days: 7,
      stepMinutes: 30,
      staffId: profesional.id,
      businessBlocked: bloqueosNegocio,
      bufferMinutes: BUFFER_MINUTOS,
      horariosNegocio,
    });
  }, [profesional, servicio, turnos, servicios, bloqueos, horariosNegocio]);

  function elegirProfesional(id: string): void
  {
    setStaffId(id);
    setServicioId(null);
    setDiaISO(null);
    setSlotISO(null);
    setConfirmado(false);
    setError(null);
  }

  function elegirServicio(id: string): void
  {
    setServicioId(id);
    setDiaISO(null);
    setSlotISO(null);
    setConfirmado(false);
    setError(null);
  }

  /** Elige el día y limpia la hora anterior. */
  function elegirDia(iso: string): void
  {
    setDiaISO(iso);
    setSlotISO(null);
    setError(null);
  }

  /** Vuelve a la lista de días y limpia día y hora. */
  function volverADias(): void
  {
    setDiaISO(null);
    setSlotISO(null);
    setError(null);
  }

  /** Elige la hora dentro del día ya elegido. */
  function elegirHora(iso: string): void
  {
    setSlotISO(iso);
    setError(null);
  }

  async function confirmar(): Promise<void>
  {
    const mensaje = validarReserva({
      nombre: nombre.trim(),
      whatsapp: whatsapp.trim(),
      email: email.trim(),
      requiereEmail,
    });

    if (mensaje !== null)
    {
      setError(mensaje);
      return;
    }

    if (staffId === null || servicioId === null || slotISO === null)
    {
      setError("Elegí profesional, servicio y horario para continuar.");
      return;
    }

    if (demo)
    {
      setError(null);
      setConfirmado(true);
      return;
    }

    setEnviando(true);
    setError(null);

    try
    {
      const response = await fetch("/api/reservas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pais,
          slug,
          staffId,
          servicioId,
          inicio: slotISO,
          nombre: nombre.trim(),
          whatsapp: whatsapp.trim(),
          email: email.trim().length > 0 ? email.trim() : null,
        }),
      });
      const data = await response.json() as { error?: string; checkoutUrl?: string;
        checkoutError?: string | null; emailEnviado?: boolean };

      if (!response.ok)
      {
        setError(typeof data.error === "string" ? data.error : "No pudimos guardar tu reserva.");
        return;
      }

      if (typeof data.checkoutError === "string" && data.checkoutError.length > 0)
      {
        setError(data.checkoutError);
        return;
      }

      if (typeof data.checkoutUrl === "string" && data.checkoutUrl.length > 0)
      {
        window.location.assign(data.checkoutUrl);
        return;
      }

      setEmailEnviado(data.emailEnviado === true);
      setConfirmado(true);
    }
    catch
    {
      setError("No pudimos guardar tu reserva. Probá de nuevo.");
    }
    finally
    {
      setEnviando(false);
    }
  }

  if (confirmado && profesional !== null && servicio !== null && slotISO !== null)
  {
    return renderConfirmado({
      profesionalNombre: profesional.nombre,
      servicio,
      slot: new Date(slotISO),
      email: email.trim(),
      emailEnviado,
      demo,
    });
  }

  return (
    <div className="animate-reveal-up ui-card space-y-8 p-5 sm:p-8">
      {renderEncabezado({ negocioNombre, negocioLogoUrl, negocioDescripcion })}

      <section className="animate-fade-up space-y-3">
        <h2 className="ui-section-title">1. Elegí tu profesional</h2>
        <div className="grid grid-cols-2 gap-3">
          {staff.filter((s) => s.activo !== false).map((s) => (
            <button
              key={s.id}
              onClick={() => elegirProfesional(s.id)}
              aria-label={s.nombre}
              className={`rounded-lg border bg-white p-4 text-left transition-all duration-200 ${
                s.id === staffId
                  ? "border-primary bg-info-soft shadow-sm"
                  : "border-line hover:border-primary/40 hover:bg-surface"
              }`}
            >
              <div className="flex items-center gap-3">
                {s.fotoUrl != null && s.fotoUrl.length > 0 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.fotoUrl} alt={s.nombre} className="size-12 rounded-full object-cover" />
                ) : (
                  <span className="flex size-12 items-center justify-center rounded-full bg-info-soft
                    font-heading font-bold text-primary">{s.nombre.charAt(0)}</span>
                )}
                <span className="font-semibold text-navy">{s.nombre}</span>
              </div>
              {s.descripcion != null && s.descripcion.length > 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">{s.descripcion}</p>
              ) : null}
            </button>
          ))}
        </div>
      </section>

      {profesional !== null ? (
        <section className="animate-fade-up space-y-3">
          <h2 className="ui-section-title">2. Elegí tu servicio</h2>
          {serviciosDisponibles.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {profesional.nombre} todavía no tiene servicios asignados. Probá con otro profesional.
            </p>
          ) : null}
          <div className="space-y-2">
            {serviciosDisponibles.map((s) => (
              <button
                key={s.id}
                onClick={() => elegirServicio(s.id)}
                className={`w-full rounded-lg border bg-white p-4 text-left transition-all duration-200 ${
                  s.id === servicioId
                    ? "border-primary bg-info-soft shadow-sm"
                    : "border-line hover:border-primary/40 hover:bg-surface"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold text-navy">{s.nombre}</div>
                  <div className="text-sm">
                    {s.precioPromocional !== null ? (
                      <>
                        <span className="text-muted-foreground line-through mr-2">{formatearARS(s.precioBase)}</span>
                        <span className="font-bold text-[#0c6b45]">{formatearARS(s.precioPromocional)}</span>
                      </>
                    ) : (
                      <span className="font-bold text-navy">{formatearARS(s.precioBase)}</span>
                    )}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {s.duracionMin} min{tieneSenaEfectiva(s.senaRequerida, s.senaPorcentaje)
                    ? ` · Seña ${s.senaPorcentaje}%` : " · Sin seña"}
                </div>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {profesional !== null && servicio !== null
        ? renderHorario({ dias, diaISO, slotISO, elegirDia, elegirHora, volverADias })
        : null}

      {slotISO !== null
        ? renderDatos({
            nombre,
            whatsapp,
            email,
            error,
            enviando,
            requiereEmail,
            onNombre: setNombre,
            onWhatsapp: setWhatsapp,
            onEmail: setEmail,
            onConfirmar: () => { void confirmar(); },
          })
        : null}
    </div>
  );
}
