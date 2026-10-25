"use client";

import { useState } from "react";
import type { ReactNode } from "react";

import { useBookingSelection } from "@/components/booking/use-booking-selection";
import { PasoHorario, PasoProfesional, PasoServicio } from "@/components/booking-steps";
import { formatearDiaYMes } from "@/lib/format/fecha";
import type
{
  PortalAsociacion,
  PortalBloqueo,
  PortalServicio,
  PortalStaff,
  PortalTurno,
} from "@/lib/portal/types";
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
  readonly horariosNegocio?: Record<string, unknown> | null;
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

  if (datos.email.length === 0)
  {
    return "Dejanos tu email para confirmar y avisarte.";
  }

  if (!esEmailValido(datos.email))
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
      {props.emailEnviado ? (
        <p className="text-sm text-muted-foreground">
          Te enviamos la confirmación a {props.email}. Guardá ese mail: es tu comprobante y tiene
          el link para cancelar.
        </p>
      ) : (
        <p className="ui-alert ui-alert-warning text-xs">
          No pudimos enviar el email de confirmación. Guardá una captura de esta pantalla para
          tener los datos.
        </p>
      )}
    </div>
  );
}

interface DatosBookingProps
{
  readonly nombre: string;
  readonly whatsapp: string;
  readonly email: string;
  readonly error: string | null;
  readonly enviando: boolean;
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
              (para confirmar y avisarte)
            </span>
          </label>
          <input
            id="booking-email"
            value={props.email}
            onChange={(event) => props.onEmail(event.target.value)}
            placeholder="Ej: juan@ejemplo.com"
            inputMode="email"
            required
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
  bloqueos, horariosNegocio = null }: BookingFlowProps)
{
  const seleccion = useBookingSelection({
    staff,
    servicios,
    asociaciones,
    turnos,
    bloqueos,
    horariosNegocio,
  });
  const { staffId, servicioId, diaISO, slotISO, profesional, servicio,
    serviciosDisponibles, dias } = seleccion;
  const [nombre, setNombre] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmado, setConfirmado] = useState(false);
  const [emailEnviado, setEmailEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  function elegirProfesional(id: string): void
  {
    seleccion.elegirProfesional(id);
    setConfirmado(false);
    setError(null);
  }

  function elegirServicio(id: string): void
  {
    seleccion.elegirServicio(id);
    setConfirmado(false);
    setError(null);
  }

  /** Elige el día y limpia la hora anterior. */
  function elegirDia(iso: string): void
  {
    seleccion.elegirDia(iso);
    setError(null);
  }

  /** Vuelve a la lista de días y limpia día y hora. */
  function volverADias(): void
  {
    seleccion.volverADias();
    setError(null);
  }

  /** Elige la hora dentro del día ya elegido. */
  function elegirHora(iso: string): void
  {
    seleccion.elegirHora(iso);
    setError(null);
  }

  async function confirmar(): Promise<void>
  {
    const mensaje = validarReserva({
      nombre: nombre.trim(),
      whatsapp: whatsapp.trim(),
      email: email.trim(),
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
          email: email.trim(),
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
    });
  }

  return (
    <div className="animate-reveal-up ui-card space-y-8 p-5 sm:p-8">
      {renderEncabezado({ negocioNombre, negocioLogoUrl, negocioDescripcion })}

      <PasoProfesional staff={staff} staffId={staffId} onElegir={elegirProfesional} />

      {profesional !== null ? (
        <PasoServicio
          profesional={profesional}
          servicios={serviciosDisponibles}
          servicioId={servicioId}
          onElegir={elegirServicio}
        />
      ) : null}

      {profesional !== null && servicio !== null ? (
        <PasoHorario
          dias={dias}
          diaISO={diaISO}
          slotISO={slotISO}
          elegirDia={elegirDia}
          elegirHora={elegirHora}
          volverADias={volverADias}
        />
      ) : null}

      {slotISO !== null
        ? renderDatos({
            nombre,
            whatsapp,
            email,
            error,
            enviando,
            onNombre: setNombre,
            onWhatsapp: setWhatsapp,
            onEmail: setEmail,
            onConfirmar: () => { void confirmar(); },
          })
        : null}
    </div>
  );
}
