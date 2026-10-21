"use client";

import { useMemo, useState } from "react";

import { BUFFER_MINUTOS, buildAvailableSlots } from "@/lib/booking/slots";
import type { DiaDisponible } from "@/lib/booking/slots";
import type
{
  PortalAsociacion,
  PortalBloqueo,
  PortalServicio,
  PortalStaff,
  PortalTurno,
} from "@/lib/portal/demo-business";
import { serviciosDeStaff } from "@/lib/staff/servicios";

/** Parámetros compartidos por el portal público y el alta manual. */
export interface BookingSelectionParams
{
  readonly staff: readonly PortalStaff[];
  readonly servicios: readonly PortalServicio[];
  readonly asociaciones: readonly PortalAsociacion[];
  readonly turnos: readonly PortalTurno[];
  readonly bloqueos: readonly PortalBloqueo[];
  readonly horariosNegocio?: Record<string, unknown> | null;
  readonly fechaInicial?: string | null;
}

/** Selección actual del wizard de turnos. */
export interface BookingSelection
{
  readonly staffId: string | null;
  readonly servicioId: string | null;
  readonly diaISO: string | null;
  readonly slotISO: string | null;
  readonly profesional: PortalStaff | null;
  readonly servicio: PortalServicio | null;
  readonly serviciosDisponibles: readonly PortalServicio[];
  readonly dias: readonly DiaDisponible[];
  readonly elegirProfesional: (id: string) => void;
  readonly elegirServicio: (id: string) => void;
  readonly elegirDia: (iso: string) => void;
  readonly elegirHora: (iso: string) => void;
  readonly volverADias: () => void;
}

interface DiasParams
{
  readonly profesional: PortalStaff;
  readonly servicio: PortalServicio;
  readonly servicios: readonly PortalServicio[];
  readonly turnos: readonly PortalTurno[];
  readonly bloqueos: readonly PortalBloqueo[];
  readonly horariosNegocio: Record<string, unknown> | null;
}

/** Clave civil local `YYYY-MM-DD` de una fecha. */
function claveLocal(fecha: Date): string
{
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");

  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

/**
 * Calcula los días disponibles de un profesional para un servicio.
 *
 * @param params Profesional, servicio, turnos y bloqueos.
 * @return Días con horarios libres.
 */
function calcularDias(params: DiasParams): readonly DiaDisponible[]
{
  const bloqueosTurnos = params.turnos.map((t) =>
  {
    const base = params.servicios.find((s) => s.id === t.servicioId);

    return {
      staffId: t.staffId,
      inicio: t.inicio,
      fin: t.fin,
      duracionMin: base?.duracionMin ?? params.servicio.duracionMin,
    };
  });

  const bloqueosNegocio = params.bloqueos
    .map((b) => ({ start: new Date(b.inicio), end: new Date(b.fin) }))
    .filter((b) => !Number.isNaN(b.start.getTime()) && !Number.isNaN(b.end.getTime()));

  return buildAvailableSlots({
    horarios: params.profesional.horarios,
    turnos: bloqueosTurnos,
    serviceMinutes: params.servicio.duracionMin,
    now: new Date(),
    days: 7,
    stepMinutes: 30,
    staffId: params.profesional.id,
    businessBlocked: bloqueosNegocio,
    bufferMinutes: BUFFER_MINUTOS,
    horariosNegocio: params.horariosNegocio,
  });
}

/**
 * Estado y cálculo de disponibilidad compartidos por ambos flujos.
 *
 * @param params Catálogos, turnos y configuración de horarios.
 * @return Selección actual y acciones para modificarla.
 */
export function useBookingSelection(params: BookingSelectionParams): BookingSelection
{
  const {
    staff,
    servicios,
    asociaciones,
    turnos,
    bloqueos,
    horariosNegocio = null,
    fechaInicial = null,
  } = params;
  const [staffId, setStaffId] = useState<string | null>(null);
  const [servicioId, setServicioId] = useState<string | null>(null);
  const [diaISO, setDiaISO] = useState<string | null>(null);
  const [slotISO, setSlotISO] = useState<string | null>(null);

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

      return calcularDias({
        profesional,
        servicio,
        servicios,
        turnos,
        bloqueos,
        horariosNegocio,
      });
    },
    [profesional, servicio, turnos, servicios, bloqueos, horariosNegocio],
  );

  /** Elige profesional y resetea las selecciones dependientes. */
  function elegirProfesional(id: string): void
  {
    setStaffId(id);
    setServicioId(null);
    setDiaISO(null);
    setSlotISO(null);
  }

  /** Elige servicio y preselecciona el día pedido por la agenda, si aplica. */
  function elegirServicio(id: string): void
  {
    const elegido = servicios.find((s) => s.id === id);
    const diasDelServicio = profesional !== null && elegido !== undefined
      ? calcularDias({
        profesional,
        servicio: elegido,
        servicios,
        turnos,
        bloqueos,
        horariosNegocio,
      })
      : [];
    const preseleccion = fechaInicial !== null && fechaInicial.length > 0
      ? diasDelServicio.find((dia) => claveLocal(dia.date) === fechaInicial)
      : undefined;

    setServicioId(id);
    setDiaISO(preseleccion?.date.toISOString() ?? null);
    setSlotISO(null);
  }

  /** Elige el día y limpia la hora anterior. */
  function elegirDia(iso: string): void
  {
    setDiaISO(iso);
    setSlotISO(null);
  }

  /** Vuelve a la lista de días y limpia día y hora. */
  function volverADias(): void
  {
    setDiaISO(null);
    setSlotISO(null);
  }

  /** Elige la hora dentro del día ya elegido. */
  function elegirHora(iso: string): void
  {
    setSlotISO(iso);
  }

  return {
    staffId,
    servicioId,
    diaISO,
    slotISO,
    profesional,
    servicio,
    serviciosDisponibles,
    dias,
    elegirProfesional,
    elegirServicio,
    elegirDia,
    elegirHora,
    volverADias,
  };
}
