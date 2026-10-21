"use client";

import { useState } from "react";
import { useActionState } from "react";

import { useBookingSelection } from "@/components/booking/use-booking-selection";
import { PasoHorario, PasoProfesional, PasoServicio } from "@/components/booking-steps";
import { analizarWhatsappCliente } from "@/lib/clientes/whatsapp";
import { formatearDiaLargoYMes } from "@/lib/format/fecha";
import type
{
  PortalAsociacion,
  PortalBloqueo,
  PortalServicio,
  PortalStaff,
  PortalTurno,
} from "@/lib/portal/demo-business";

/** Cliente disponible para precargar el formulario. */
export interface ClienteTurnoManual
{
  readonly id: string;
  readonly nombre: string;
  readonly whatsapp: string;
  readonly email?: string | null;
}

interface FormularioTurnoManualProps
{
  readonly action: (prev: string | null, formData: FormData) => Promise<string | null>;
  readonly staff: readonly PortalStaff[];
  readonly servicios: readonly PortalServicio[];
  readonly asociaciones: readonly PortalAsociacion[];
  readonly turnos: readonly PortalTurno[];
  readonly bloqueos: readonly PortalBloqueo[];
  readonly horariosNegocio?: Record<string, unknown> | null;
  readonly clientes: readonly ClienteTurnoManual[];
  readonly clienteInicial?: ClienteTurnoManual | null;
  readonly fechaInicial?: string | null;
}

const CLASE_INPUT = "ui-input mt-1";

/**
 * Alta manual de un turno con el mismo wizard que usa el cliente.
 *
 * Reutiliza los pasos de profesional, servicio y horario del portal, y suma
 * un selector de clientes guardados en el paso de datos. Si se entra desde
 * la ficha o la lista de clientes, los datos llegan precargados.
 *
 * @param props Catálogos, clientes y acción del servidor.
 * @return Wizard de alta manual.
 */
export default function FormularioTurnoManual({
  action,
  staff,
  servicios,
  asociaciones,
  turnos,
  bloqueos,
  horariosNegocio = null,
  clientes,
  clienteInicial = null,
  fechaInicial = null,
}: FormularioTurnoManualProps)
{
  const [error, formAction, pending] = useActionState(action, null);
  const seleccion = useBookingSelection({
    staff,
    servicios,
    asociaciones,
    turnos,
    bloqueos,
    horariosNegocio,
    fechaInicial,
  });
  const { staffId, servicioId, slotISO, profesional, servicio, serviciosDisponibles, dias } = seleccion;
  const [clienteId, setClienteId] = useState(clienteInicial?.id ?? "");
  const [nombre, setNombre] = useState(clienteInicial?.nombre ?? "");
  const [whatsapp, setWhatsapp] = useState(clienteInicial?.whatsapp ?? "");
  const [email, setEmail] = useState(clienteInicial?.email ?? "");
  const [estado, setEstado] = useState("confirmado");
  const analisisWhatsapp = analizarWhatsappCliente(whatsapp);
  const errorWhatsapp = whatsapp.trim().length > 0 && !analisisWhatsapp.ok
    ? analisisWhatsapp.error
    : null;
  const whatsappCanonico = analisisWhatsapp.ok ? analisisWhatsapp.valor : null;
  const previewWhatsapp = whatsappCanonico !== null
    && whatsapp.trim().length > 0
    && whatsappCanonico !== whatsapp.trim();

  /** Carga los datos del cliente elegido o limpia el formulario. */
  function elegirCliente(id: string): void
  {
    setClienteId(id);

    const elegido = clientes.find((cliente) => cliente.id === id);

    if (elegido === undefined)
    {
      setNombre("");
      setWhatsapp("");
      setEmail("");
      return;
    }

    setNombre(elegido.nombre);
    setWhatsapp(elegido.whatsapp);
    setEmail(elegido.email ?? "");
  }

  return (
    <div className="animate-reveal-up ui-card space-y-8 p-5 sm:p-8">
      <div>
        <h2 className="font-heading text-xl font-bold text-navy">Cargá el turno en 4 pasos</h2>
        <p className="text-sm text-muted-foreground">
          Elegí profesional, servicio y horario. Después completá los datos del cliente.
        </p>
        {clienteId.length > 0 && nombre.trim().length > 0 ? (
          <p className="ui-alert ui-alert-info mt-3 text-xs">
            Cliente precargado: <span className="font-semibold">{nombre}</span>
            {whatsapp.trim().length > 0 ? ` · ${whatsapp}` : null}
          </p>
        ) : null}
      </div>

      <PasoProfesional staff={staff} staffId={staffId} onElegir={seleccion.elegirProfesional} />

      {profesional !== null ? (
        <PasoServicio
          profesional={profesional}
          servicios={serviciosDisponibles}
          servicioId={servicioId}
          onElegir={seleccion.elegirServicio}
        />
      ) : null}

      {profesional !== null && servicio !== null ? (
        <PasoHorario
          dias={dias}
          diaISO={seleccion.diaISO}
          slotISO={slotISO}
          elegirDia={seleccion.elegirDia}
          elegirHora={seleccion.elegirHora}
          volverADias={seleccion.volverADias}
        />
      ) : null}

      {slotISO !== null && servicio !== null && profesional !== null ? (
        <form action={formAction} className="animate-fade-up space-y-3">
          <h2 className="ui-section-title">4. Datos del cliente</h2>
          <p className="text-sm text-muted-foreground">
            {servicio.nombre} con {profesional.nombre} ·{" "}
            {`${formatearDiaLargoYMes(new Date(slotISO))} ` +
              `${String(new Date(slotISO).getHours()).padStart(2, "0")}:` +
              `${String(new Date(slotISO).getMinutes()).padStart(2, "0")}`}
          </p>
          <div className="space-y-3">
            <div>
              <label htmlFor="turno-cliente" className="ui-label mb-1">
                Cliente
              </label>
              <select
                id="turno-cliente"
                value={clienteId}
                onChange={(event) => elegirCliente(event.target.value)}
                className="ui-select"
              >
                <option value="">Nuevo cliente</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {`${cliente.nombre} · ${cliente.whatsapp}`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="turno-nombre" className="ui-label mb-1">
                Nombre
              </label>
              <input
                id="turno-nombre"
                type="text"
                name="nombre"
                required
                minLength={2}
                maxLength={80}
                value={nombre}
                onChange={(event) => setNombre(event.target.value)}
                placeholder="Ej: Juan Pérez"
                className={CLASE_INPUT}
              />
            </div>
            <div>
              <label htmlFor="turno-whatsapp" className="ui-label mb-1">
                WhatsApp
              </label>
              <input
                id="turno-whatsapp"
                type="tel"
                name="whatsapp"
                required
                inputMode="tel"
                autoComplete="tel"
                maxLength={30}
                value={whatsapp}
                onChange={(event) => setWhatsapp(event.target.value)}
                placeholder="Ej: +54 9 11 6453-4124"
                className={CLASE_INPUT}
                aria-invalid={errorWhatsapp !== null}
              />
              {errorWhatsapp !== null ? (
                <span className="ui-error mt-1 block">{errorWhatsapp}</span>
              ) : previewWhatsapp ? (
                <span className="ui-hint mt-1 block">
                  Se guardará como <span className="font-semibold text-ink">{whatsappCanonico}</span>
                </span>
              ) : null}
            </div>
            <div>
              <label htmlFor="turno-email" className="ui-label mb-1">
                Email (opcional)
              </label>
              <input
                id="turno-email"
                type="email"
                name="email"
                inputMode="email"
                autoComplete="email"
                spellCheck={false}
                maxLength={254}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Ej: juan@ejemplo.com"
                className={CLASE_INPUT}
              />
            </div>
            <div>
              <label htmlFor="turno-estado" className="ui-label mb-1">
                Estado
              </label>
              <select
                id="turno-estado"
                name="estado"
                value={estado}
                onChange={(event) => setEstado(event.target.value)}
                className="ui-select"
              >
                <option value="confirmado">Confirmado</option>
                <option value="pagado">Pagado (seña cobrada)</option>
              </select>
            </div>
          </div>
          <input type="hidden" name="staffId" value={staffId ?? ""} />
          <input type="hidden" name="servicioId" value={servicioId ?? ""} />
          <input type="hidden" name="inicio" value={slotISO} />
          <input type="hidden" name="clienteId" value={clienteId} />
          {error !== null ? (
            <p key={error} className="ui-alert ui-alert-danger animate-shake text-sm" role="alert">
              {error}
            </p>
          ) : null}
          <button type="submit" disabled={pending} className="ui-btn ui-btn-cta w-full">
            {pending ? "Creando turno..." : "Crear turno"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
