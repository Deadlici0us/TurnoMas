import { beforeEach, describe, expect, it, vi } from "vitest";

import { getNegocioSubscriptionStatus } from "@/lib/onboarding/subscription-gate";
import { diasSuscripcionRestantes } from "@/lib/onboarding/trial";

/**
 * Integración del ciclo de vida de la suscripción.
 *
 * Ejercita el `subscriptionService` real (activar/cancelar) contra un admin de
 * Supabase en memoria y verifica el efecto en el gate del dashboard: el acceso
 * se conserva hasta el vencimiento y recién ahí se bloquea.
 */

const MS_PER_DAY = 86_400_000;

const estado = vi.hoisted(() =>
{
  return { fila: {} as Record<string, unknown> };
});

vi.mock("@/lib/supabase/admin", () =>
{
  return {
    getSupabaseAdmin: () =>
    {
      return {
        from: () =>
        {
          return {
            update: (cambios: Record<string, unknown>) =>
            {
              return {
                eq: async () =>
                {
                  Object.assign(estado.fila, cambios);

                  return { error: null };
                },
              };
            },
          };
        },
      };
    },
  };
});

const { subscriptionService } = await import("./subscription");

/** Fila del negocio tal como la consume `getNegocioSubscriptionStatus`. */
function filaActual(): {
  created_at: string;
  suscripcion_estado: string | null;
  suscripcion_mp_id: string | null;
  suscripcion_mora_desde: string | null;
  suscripcion_vence_en: string | null;
  suscripcion_cancelada_en: string | null;
}
{
  return {
    created_at: "2026-01-01T00:00:00Z",
    suscripcion_estado: (estado.fila.suscripcion_estado as string | null) ?? null,
    suscripcion_mp_id: (estado.fila.suscripcion_mp_id as string | null) ?? null,
    suscripcion_mora_desde: (estado.fila.suscripcion_mora_desde as string | null) ?? null,
    suscripcion_vence_en: (estado.fila.suscripcion_vence_en as string | null) ?? null,
    suscripcion_cancelada_en: (estado.fila.suscripcion_cancelada_en as string | null) ?? null,
  };
}

beforeEach(() =>
{
  estado.fila = {};
});

describe("ciclo de vida de la suscripción",
  () =>
  {
    it("activa, cancela sin cortar el acceso, bloquea al vencer y reactiva",
    async () =>
    {
      const vence = new Date(Date.now() + 5 * MS_PER_DAY).toISOString();

      await subscriptionService.activarSuscripcion("neg-1", "pre-1", vence);

      expect(estado.fila.suscripcion_estado).toBe("active");
      expect(estado.fila.suscripcion_mp_id).toBe("pre-1");
      expect(estado.fila.suscripcion_vence_en).toBe(vence);
      expect(estado.fila.suscripcion_cancelada_en).toBeNull();
      expect(getNegocioSubscriptionStatus(filaActual())).toBe("active");
      expect(diasSuscripcionRestantes(vence)).toBe(5);

      const desde = new Date();
      await subscriptionService.marcarCancelada("neg-1", vence, desde);

      expect(estado.fila.suscripcion_cancelada_en).toBe(desde.toISOString());
      expect(getNegocioSubscriptionStatus(filaActual(), new Date(desde.getTime() + 1000)))
        .toBe("active");

      const trasVencer = new Date(new Date(vence).getTime() + MS_PER_DAY);
      expect(getNegocioSubscriptionStatus(filaActual(), trasVencer)).toBe("blocked");

      const nuevoVence = new Date(Date.now() + 30 * MS_PER_DAY).toISOString();
      await subscriptionService.activarSuscripcion("neg-1", "pre-2", nuevoVence);

      expect(estado.fila.suscripcion_cancelada_en).toBeNull();
      expect(estado.fila.suscripcion_mp_id).toBe("pre-2");
      expect(getNegocioSubscriptionStatus(filaActual())).toBe("active");
    });

    it("conserva el vencimiento previo si la cancelación no trae fecha",
    async () =>
    {
      const vence = new Date(Date.now() + 5 * MS_PER_DAY).toISOString();

      await subscriptionService.activarSuscripcion("neg-1", "pre-1", vence);
      await subscriptionService.marcarCancelada("neg-1", null, new Date());

      expect(estado.fila.suscripcion_vence_en).toBe(vence);
      expect(getNegocioSubscriptionStatus(filaActual())).toBe("active");
    });
  });
