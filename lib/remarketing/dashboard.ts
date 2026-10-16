/**
 * Puente entre los datos crudos del dashboard (`select("*")`) y el armador
 * de candidatos de recuperación.
 */

import { armarCandidatosRecuperar, type CandidatoRecuperacion } from "./candidatos";

export interface DashboardLike
{
  readonly turnos: readonly unknown[];
  readonly clientes: readonly unknown[];
  readonly servicios: readonly unknown[];
  readonly negocio: unknown;
}

/** Arma los candidatos de recuperación a partir de `getDashboardData()`. */
export function candidatosDesdeDashboard(
  dashboard: DashboardLike,
  ahora: Date = new Date(),
): CandidatoRecuperacion[]
{
  const negocio = dashboard.negocio as {
    readonly nombre?: unknown;
    readonly pais?: unknown;
    readonly slug?: unknown;
    readonly remarketing_activo?: unknown;
    readonly remarketing_dias?: unknown;
  };

  return armarCandidatosRecuperar({
    turnos: dashboard.turnos as Array<{
      readonly id: string;
      readonly cliente_id: string;
      readonly servicio_id: string;
      readonly inicio: string | null;
      readonly fin: string | null;
      readonly estado: string;
      readonly remarketing_manual_at: string | null;
    }>,
    clientes: dashboard.clientes as Array<{
      readonly id: string;
      readonly nombre: string;
      readonly whatsapp: string;
      readonly bloqueado: boolean | null;
    }>,
    servicios: dashboard.servicios as Array<{
      readonly id: string;
      readonly nombre: string;
      readonly remarketing: boolean | null;
      readonly remarketing_dias: number | null;
    }>,
    negocio: {
      nombre: typeof negocio.nombre === "string" ? negocio.nombre : null,
      pais: typeof negocio.pais === "string" ? negocio.pais : null,
      slug: typeof negocio.slug === "string" ? negocio.slug : null,
      remarketing_activo: typeof negocio.remarketing_activo === "boolean"
        ? negocio.remarketing_activo
        : null,
      remarketing_dias: typeof negocio.remarketing_dias === "number"
        ? negocio.remarketing_dias
        : null,
    },
    ahora,
  });
}