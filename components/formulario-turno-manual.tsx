"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useActionState } from "react";

import { formatearARS } from "@/lib/dashboard/moneda";
import { serviciosDeStaff } from "@/lib/staff/servicios";
import { useToast } from "@/components/ui/use-toast";

/** Cliente disponible para precargar el formulario. */
export interface ClienteTurnoManual
{
  readonly id: string;
  readonly nombre: string;
  readonly whatsapp: string;
  readonly email?: string | null;
}

/** Profesional disponible para el turno. */
export interface StaffTurnoManual
{
  readonly id: string;
  readonly nombre: string;
}

/** Servicio disponible para el turno. */
export interface ServicioTurnoManual
{
  readonly id: string;
  readonly nombre: string;
  readonly duracion_min: number;
  readonly precio_base: number;
  readonly precio_promocional: number | null;
}

/** Par profesional ↔ servicio. */
export interface AsociacionTurnoManual
{
  readonly staffId: string;
  readonly servicioId: string;
}

interface FormularioTurnoManualProps
{
  readonly action: (prev: string | null, formData: FormData) => Promise<string | null>;
  readonly staff: readonly StaffTurnoManual[];
  readonly servicios: readonly ServicioTurnoManual[];
  readonly asociaciones: readonly AsociacionTurnoManual[];
  readonly clientes: readonly ClienteTurnoManual[];
  readonly clienteInicial?: ClienteTurnoManual | null;
  readonly fechaInicial: string;
}

const CLASE_INPUT = "ui-input mt-1";

/**
 * Alta manual de un turno (Agenda → Nuevo turno).
 *
 * Permite elegir un cliente guardado (autocompleta nombre/WhatsApp/email) o
 * cargar uno nuevo, y arma el FormData que consume `crearTurnoManual`.
 *
 * @param props Catálogos y acción del servidor.
 * @return Formulario de alta manual.
 */
export default function FormularioTurnoManual({
  action,
  staff,
  servicios,
  asociaciones,
  clientes,
  clienteInicial = null,
  fechaInicial,
}: FormularioTurnoManualProps)
{
  const [error, formAction, pending] = useActionState(action, null);
  const { showToast } = useToast();
  const enviado = useRef(false);
  const staffInicial = staff[0]?.id ?? "";
  const [staffId, setStaffId] = useState(staffInicial);
  const [clienteId, setClienteId] = useState(clienteInicial?.id ?? "");
  const [nombre, setNombre] = useState(clienteInicial?.nombre ?? "");
  const [whatsapp, setWhatsapp] = useState(clienteInicial?.whatsapp ?? "");
  const [email, setEmail] = useState(clienteInicial?.email ?? "");
  const [fecha, setFecha] = useState(fechaInicial);
  const [hora, setHora] = useState("09:00");
  const [estado, setEstado] = useState("confirmado");

  const serviciosDisponibles = useMemo(
    () => staffId === "" ? [] : serviciosDeStaff(servicios, asociaciones, staffId),
    [staffId, servicios, asociaciones],
  );
  const [servicioId, setServicioId] = useState(
    () => serviciosDeStaff(servicios, asociaciones, staffInicial)[0]?.id ?? "",
  );

  useEffect(() =>
  {
    if (!enviado.current || pending)
    {
      return;
    }

    enviado.current = false;

    if (error === null)
    {
      showToast({ tone: "success", title: "Listo", message: "Turno creado." });
      return;
    }

    showToast({ tone: "error", title: "No se pudo crear", message: error });
  }, [error, pending, showToast]);

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

  /** Cambia el profesional y resetea el servicio a su primera opción. */
  function elegirStaff(id: string): void
  {
    setStaffId(id);
    setServicioId(serviciosDeStaff(servicios, asociaciones, id)[0]?.id ?? "");
  }

  return (
    <form
      action={formAction}
      onSubmit={() => { enviado.current = true; }}
      className="ui-card space-y-5 p-5 sm:p-6"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block ui-label sm:col-span-2">
          {"Cliente guardado (opcional)"}
          <select
            name="clienteId"
            value={clienteId}
            onChange={(event) => elegirCliente(event.target.value)}
            className="ui-select mt-1"
          >
            <option value="">Nuevo cliente</option>
            {clientes.map((cliente) => (
              <option key={cliente.id} value={cliente.id}>{cliente.nombre}</option>
            ))}
          </select>
        </label>
        <label className="block ui-label">
          {"Nombre"}
          <input
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
        </label>
        <label className="block ui-label">
          {"WhatsApp"}
          <input
            type="tel"
            name="whatsapp"
            required
            value={whatsapp}
            onChange={(event) => setWhatsapp(event.target.value)}
            placeholder="Ej: +549110000001"
            className={CLASE_INPUT}
          />
        </label>
        <label className="block ui-label">
          {"Email (opcional)"}
          <input
            type="email"
            name="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Ej: juan@ejemplo.com"
            className={CLASE_INPUT}
          />
        </label>
        <label className="block ui-label">
          {"Profesional"}
          <select
            name="staffId"
            value={staffId}
            onChange={(event) => elegirStaff(event.target.value)}
            required
            className="ui-select mt-1"
          >
            {staff.length === 0 ? <option value="">Sin profesionales</option> : null}
            {staff.map((profesional) => (
              <option key={profesional.id} value={profesional.id}>{profesional.nombre}</option>
            ))}
          </select>
        </label>
        <label className="block ui-label">
          {"Servicio"}
          <select
            name="servicioId"
            value={servicioId}
            onChange={(event) => setServicioId(event.target.value)}
            required
            className="ui-select mt-1"
          >
            {serviciosDisponibles.length === 0 ? <option value="">Sin servicios</option> : null}
            {serviciosDisponibles.map((servicio) => (
              <option key={servicio.id} value={servicio.id}>
                {`${servicio.nombre} · ${servicio.duracion_min} min · ` +
                  formatearARS(servicio.precio_promocional ?? servicio.precio_base)}
              </option>
            ))}
          </select>
        </label>
        <label className="block ui-label">
          {"Fecha"}
          <input
            type="date"
            name="fecha"
            required
            value={fecha}
            onChange={(event) => setFecha(event.target.value)}
            className={CLASE_INPUT}
          />
        </label>
        <label className="block ui-label">
          {"Hora"}
          <input
            type="time"
            name="hora"
            required
            step={900}
            value={hora}
            onChange={(event) => setHora(event.target.value)}
            className={CLASE_INPUT}
          />
        </label>
        <label className="block ui-label">
          {"Estado"}
          <select
            name="estado"
            value={estado}
            onChange={(event) => setEstado(event.target.value)}
            className="ui-select mt-1"
          >
            <option value="confirmado">Confirmado</option>
            <option value="pagado">Pagado (seña cobrada)</option>
          </select>
        </label>
      </div>
      {error !== null ? (
        <p key={error} className="ui-alert ui-alert-danger animate-shake text-sm" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={pending} className="ui-btn ui-btn-primary">
        {pending ? "Creando turno..." : "Crear turno"}
      </button>
    </form>
  );
}
