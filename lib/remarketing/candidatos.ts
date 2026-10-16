/**
 * Candidatos de recuperación (panel "Recuperar" y barrido de email).
 *
 * La regla es por cliente, no por turno: se toma la última visita completada
 * y los días de espera del servicio de esa visita. El cliente entra cuando
 * hoy >= fin + días y no se marcó contacto manual; sale solo si reserva de
 * nuevo o tiene un turno futuro agendado. Sin fecha fija: cada servicio
 * tiene su propio ritmo.
 */

import { clasificarRemarketing, resolverRemarketingDias } from "@/lib/automations/remarketing";

export interface TurnoParaRecuperacion
{
  readonly id: string;
  readonly cliente_id: string;
  readonly servicio_id: string;
  readonly inicio: string | null;
  readonly fin: string | null;
  readonly estado: string;
  readonly remarketing_manual_at?: string | null;
}

export interface ClienteParaRecuperacion
{
  readonly id: string;
  readonly nombre: string;
  readonly whatsapp: string;
  readonly bloqueado: boolean | null;
}

export interface ServicioParaRecuperacion
{
  readonly id: string;
  readonly nombre: string;
  readonly remarketing: boolean | null;
  readonly remarketing_dias: number | null;
}

export interface NegocioParaRecuperacion
{
  readonly nombre: string | null;
  readonly pais: string | null;
  readonly slug: string | null;
  readonly remarketing_activo: boolean | null;
  readonly remarketing_dias: number | null;
}

export interface CandidatoRecuperacion
{
  readonly turnoId: string;
  readonly clienteId: string;
  readonly clienteNombre: string;
  readonly whatsapp: string;
  readonly servicioNombre: string;
  readonly diasObjetivo: number;
  readonly atrasoDias: number;
}

const ESTADOS_FUTUROS = new Set(["pendiente", "confirmado", "pagado"]);
const ESTADO_COMPLETADO = "completado";

export interface TurnoVecino
{
  readonly id: string;
  readonly cliente_id: string;
  readonly inicio: string | null;
  readonly fin: string | null;
  readonly estado: string;
}

/** Devuelve el fin efectivo de un turno (fin o inicio). */
function finEfectivo(turno: TurnoVecino): Date | null
{
  return fechaValida(turno.fin ?? turno.inicio);
}

/**
 * De los turnos candidatos devuelve los ids que son la última visita
 * completada de su cliente y cuyo cliente no tiene un turno futuro.
 *
 * Espeja la regla por cliente del panel; la usa el barrido de email, que
 * trabaja con múltiples negocios a la vez y por eso no reusa el armador completo.
 */
export function filtrarCandidatosVigentes(
  candidatos: readonly { readonly id: string; readonly cliente_id: string }[],
  turnos: readonly TurnoVecino[],
  ahora: Date,
): string[]
{
  const vecinosPorCliente = new Map<string, TurnoVecino[]>();

  for (const turno of turnos)
  {
    const lista = vecinosPorCliente.get(turno.cliente_id) ?? [];
    lista.push(turno);
    vecinosPorCliente.set(turno.cliente_id, lista);
  }

  const vigentes = new Set<string>();

  for (const candidato of candidatos)
  {
    const vecinos = vecinosPorCliente.get(candidato.cliente_id) ?? [];
    const completados = vecinos
      .filter((t) => t.estado === ESTADO_COMPLETADO)
      .map((t) => ({ id: t.id, fin: finEfectivo(t) }))
      .filter((entry) => entry.fin !== null);

    if (completados.length === 0)
    {
      continue;
    }

    const ultimo = completados.reduce((mejor, actual) =>
      actual.fin!.getTime() > mejor.fin!.getTime() ? actual : mejor,
    );
    const tieneFuturo = vecinos.some((t) =>
      ESTADOS_FUTUROS.has(t.estado)
      && (fechaValida(t.inicio)?.getTime() ?? 0) > ahora.getTime(),
    );

    if (ultimo.id === candidato.id && !tieneFuturo)
    {
      vigentes.add(candidato.id);
    }
  }

  return [...vigentes];
}

/** Parsea un timestamp ISO a Date o null si no es válido. */
function fechaValida(valor: string | null): Date | null
{
  if (valor === null)
  {
    return null;
  }

  const fecha = new Date(valor);

  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

/**
 * Arma la lista de clientes para contactar por WhatsApp.
 *
 * @return Candidatos ordenados de más atrasado a menos.
 */
export function armarCandidatosRecuperar(
  props: {
    readonly turnos: readonly TurnoParaRecuperacion[];
    readonly clientes: readonly ClienteParaRecuperacion[];
    readonly servicios: readonly ServicioParaRecuperacion[];
    readonly negocio: NegocioParaRecuperacion;
    readonly ahora: Date;
  },
): CandidatoRecuperacion[]
{
  if (props.negocio.remarketing_activo === false)
  {
    return [];
  }

  const nombrePorServicio = new Map<string, string>(
    props.servicios.map((s) => [s.id, s.nombre]),
  );
  const servicioPorId = new Map<string, ServicioParaRecuperacion>(
    props.servicios.map((s) => [s.id, s]),
  );

  const turnosPorCliente = new Map<string, TurnoParaRecuperacion[]>();

  for (const turno of props.turnos)
  {
    const lista = turnosPorCliente.get(turno.cliente_id) ?? [];
    lista.push(turno);
    turnosPorCliente.set(turno.cliente_id, lista);
  }

  const candidatos: CandidatoRecuperacion[] = [];

  for (const cliente of props.clientes)
  {
    if (cliente.bloqueado === true)
    {
      continue;
    }

    const turnosDelCliente = turnosPorCliente.get(cliente.id) ?? [];
    const completados = turnosDelCliente
      .map((t) => ({ turno: t, fin: fechaValida(t.fin ?? t.inicio) }))
      .filter((entry) => entry.turno.estado === ESTADO_COMPLETADO && entry.fin !== null);

    if (completados.length === 0)
    {
      continue;
    }

    const tieneFuturo = turnosDelCliente.some((t) =>
      ESTADOS_FUTUROS.has(t.estado) && (fechaValida(t.inicio)?.getTime() ?? 0) > props.ahora.getTime(),
    );

    if (tieneFuturo)
    {
      continue;
    }

    const ultimo = completados.reduce((mejor, actual) =>
      actual.fin!.getTime() > mejor.fin!.getTime() ? actual : mejor,
    );

    const servicio = servicioPorId.get(ultimo.turno.servicio_id);

    if (servicio === undefined || servicio.remarketing === false)
    {
      continue;
    }

    if (ultimo.turno.remarketing_manual_at)
    {
      continue;
    }

    const diasObjetivo = resolverRemarketingDias(
      servicio.remarketing_dias,
      props.negocio.remarketing_dias,
    );
    const clasificado = clasificarRemarketing(ultimo.fin!, diasObjetivo, props.ahora);

    if (clasificado === null)
    {
      continue;
    }

    candidatos.push({
      turnoId: ultimo.turno.id,
      clienteId: cliente.id,
      clienteNombre: cliente.nombre,
      whatsapp: cliente.whatsapp,
      servicioNombre: nombrePorServicio.get(ultimo.turno.servicio_id) ?? "Servicio",
      diasObjetivo,
      atrasoDias: clasificado.atrasoDias,
    });
  }

  candidatos.sort((a, b) => b.atrasoDias - a.atrasoDias);

  return candidatos;
}