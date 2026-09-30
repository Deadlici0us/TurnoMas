"use client";

import { useMemo, useState } from "react";

import { BUFFER_MINUTOS, buildAvailableSlots } from "@/lib/booking/slots";
import type { DiaDisponible } from "@/lib/booking/slots";
import type
{
  PortalBloqueo,
  PortalServicio,
  PortalStaff,
  PortalTurno,
} from "@/lib/portal/demo-business";
import { tieneSenaEfectiva } from "@/lib/reservas/montos";

interface BookingFlowProps
{
  readonly negocioNombre: string;
  readonly pais: string;
  readonly slug: string;
  readonly staff: readonly PortalStaff[];
  readonly servicios: readonly PortalServicio[];
  readonly turnos: readonly PortalTurno[];
  readonly bloqueos: readonly PortalBloqueo[];
  readonly horariosNegocio?: Record<string, string> | null;
}

function formatARS(cents: number): string
{
  return new Intl.NumberFormat("es-AR",
    { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(cents / 100);
}

function formatSlot(date: Date): string
{
  const dia = date.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" });
  const hora = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

  return `${dia} ${hora}`;
}

const WHATSAPP_PATTERN = /^\+?[\d\s-]{7,}$/;

export default function BookingFlow({ negocioNombre, pais, slug, staff, servicios, turnos, bloqueos,
  horariosNegocio = null }: BookingFlowProps)
{
  const [staffId, setStaffId] = useState<string | null>(null);
  const [servicioId, setServicioId] = useState<string | null>(null);
  const [slotISO, setSlotISO] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmado, setConfirmado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const profesional = staff.find((s) => s.id === staffId) ?? null;
  const servicio = servicios.find((s) => s.id === servicioId) ?? null;

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

    return buildAvailableSlots(
      profesional.horarios, bloqueosTurnos, servicio.duracionMin,
      new Date(), 7, 30, profesional.id, bloqueosNegocio, BUFFER_MINUTOS, horariosNegocio,
    );
  }, [profesional, servicio, turnos, servicios, bloqueos, horariosNegocio]);

  function elegirProfesional(id: string): void
  {
    setStaffId(id);
    setServicioId(null);
    setSlotISO(null);
    setConfirmado(false);
    setError(null);
  }

  function elegirServicio(id: string): void
  {
    setServicioId(id);
    setSlotISO(null);
    setConfirmado(false);
    setError(null);
  }

  async function confirmar(): Promise<void>
  {
    if (nombre.trim().length < 2)
    {
      setError("Contanos tu nombre para confirmar la reserva.");
      return;
    }

    if (!WHATSAPP_PATTERN.test(whatsapp.trim()))
    {
      setError("Revisá tu WhatsApp para que te lleguen los recordatorios.");
      return;
    }

    if (email.trim().length > 0 && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()))
    {
      setError("Revisá tu email para que te lleguen las confirmaciones.");
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
          email: email.trim().length > 0 ? email.trim() : null,
        }),
      });
      const data = await response.json() as { error?: string; checkoutUrl?: string;
        checkoutError?: string | null };

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
        window.location.href = data.checkoutUrl;
        return;
      }

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
    const slot = new Date(slotISO);

    return (
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8 text-center space-y-4">
        <div className="text-5xl">✓</div>
        <h1 className="text-2xl font-bold text-slate-900">¡Reserva confirmada!</h1>
        <p className="text-sm text-slate-600">
          {servicio.nombre} con {profesional.nombre} · {formatSlot(slot)}
        </p>
        <p className="text-sm text-slate-600">Te escribimos al {whatsapp.trim()} con los detalles.</p>
        {tieneSenaEfectiva(servicio.senaRequerida, servicio.senaPorcentaje) ? (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
            En esta demo no se realiza el cobro. En producción serías redirigido a MercadoPago
            para pagar la seña del {servicio.senaPorcentaje}% ({formatARS(servicio.precioBase)}).
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8 space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">{negocioNombre}</h1>
        <p className="text-sm text-slate-600">Reservá tu turno en 4 pasos</p>
      </div>

      <section className="space-y-3">
        <h2 className="font-semibold text-slate-900">1. Elegí tu profesional</h2>
        <div className="grid grid-cols-2 gap-3">
          {staff.filter((s) => s.activo !== false).map((s) => (
            <button
              key={s.id}
              onClick={() => elegirProfesional(s.id)}
              className={`p-4 border rounded-lg text-left transition-colors ${
                s.id === staffId
                  ? "border-blue-600 bg-blue-50"
                  : "border-slate-200 hover:border-slate-400"
              }`}
            >
              <div className="font-semibold text-slate-900">{s.nombre}</div>
            </button>
          ))}
        </div>
      </section>

      {profesional !== null ? (
        <section className="space-y-3">
          <h2 className="font-semibold text-slate-900">2. Elegí tu servicio</h2>
          <div className="space-y-2">
            {servicios.map((s) => (
              <button
                key={s.id}
                onClick={() => elegirServicio(s.id)}
                className={`w-full p-4 border rounded-lg text-left transition-colors ${
                  s.id === servicioId
                    ? "border-blue-600 bg-blue-50"
                    : "border-slate-200 hover:border-slate-400"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold text-slate-900">{s.nombre}</div>
                  <div className="text-sm">
                    {s.precioPromocional !== null ? (
                      <>
                        <span className="text-slate-400 line-through mr-2">{formatARS(s.precioBase)}</span>
                        <span className="font-bold text-green-700">{formatARS(s.precioPromocional)}</span>
                      </>
                    ) : (
                      <span className="font-bold text-slate-900">{formatARS(s.precioBase)}</span>
                    )}
                  </div>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {s.duracionMin} min{tieneSenaEfectiva(s.senaRequerida, s.senaPorcentaje)
                    ? ` · Seña ${s.senaPorcentaje}%` : " · Sin seña"}
                </div>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {profesional !== null && servicio !== null ? (
        <section className="space-y-3">
          <h2 className="font-semibold text-slate-900">3. Elegí el horario</h2>
          {dias.length === 0 ? (
            <p className="text-sm text-slate-500">Sin horarios libres los próximos 7 días. Probá con otro profesional.</p>
          ) : (
            <div className="space-y-4 max-h-72 overflow-y-auto">
              {dias.map((dia) => (
                <div key={dia.date.toISOString()}>
                  <div className="text-xs font-semibold text-slate-500 mb-2 capitalize">
                    {dia.date.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "short" })}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {dia.starts.map((start) => (
                      <button
                        key={start.toISOString()}
                        onClick={() => { setSlotISO(start.toISOString()); setError(null); }}
                        className={`text-sm px-3 py-1.5 border rounded-lg transition-colors ${
                          slotISO === start.toISOString()
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-slate-200 hover:border-blue-600"
                        }`}
                      >
                        {`${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {slotISO !== null ? (
        <section className="space-y-3">
          <h2 className="font-semibold text-slate-900">4. Tus datos</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
              <input
                value={nombre}
                onChange={(event) => setNombre(event.target.value)}
                placeholder="Ej: Juan Pérez"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none
                  focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">WhatsApp</label>
              <input
                value={whatsapp}
                onChange={(event) => setWhatsapp(event.target.value)}
                placeholder="Ej: +549110000001"
                inputMode="tel"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none
                  focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email <span className="font-normal text-slate-400">(opcional, para confirmación)</span>
              </label>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Ej: juan@ejemplo.com"
                inputMode="email"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none
                  focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            {error !== null ? <p className="text-sm text-red-600">{error}</p> : null}
            <button
              onClick={() => { void confirmar(); }}
              disabled={enviando}
              className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700
                transition-colors disabled:opacity-60"
            >
              {enviando ? "Guardando tu reserva..." : "Confirmar reserva"}
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
