import { Suspense } from "react";

import SuscripcionForm from "@/components/suscripcion-form";
import VerificarPago from "@/components/verificar-pago";

/**
 * Paywall a pantalla completa para negocios con el plan vencido.
 *
 * Cubre todo el dashboard cuando el negocio está bloqueado: muestra el plan
 * y ofrece reactivarlo pagando con MercadoPago (el pagador elige saldo o
 * tarjeta en el checkout). No es descartable; sólo se activa o se cierra sesión.
 */
const BENEFICIOS = [
  "Reservas ilimitadas",
  "Cobro de señas vía MercadoPago",
  "Recordatorios por WhatsApp y email",
  "Lista negra automática",
  "Agenda sincronizada con Google Calendar",
  "Soporte prioritario",
] as const;

export interface PaywallPlanVencidoProps
{
  readonly etiquetaPlan: string;
  readonly logout: () => Promise<void>;
  readonly emailInicial?: string;
}

export default function PaywallPlanVencido({
  etiquetaPlan,
  logout,
  emailInicial,
}: PaywallPlanVencidoProps)
{
  return (
    <dialog
      open
      aria-labelledby="paywall-title"
      className="fixed inset-0 z-[60] m-0 flex h-full w-full max-w-none max-h-none items-center
        justify-center overflow-y-auto border-0 bg-navy/45 px-4 py-8 backdrop-blur-sm"
    >
      <div className="animate-scale-in w-full max-w-lg rounded-lg border border-line bg-white p-6
        shadow-[var(--shadow-modal)] sm:p-8">
        <h1 id="paywall-title" className="ui-page-title text-center">
          Tu plan venció
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Un solo plan para profesionales que quieren crecer sin complicaciones.
        </p>
        <Suspense fallback={null}>
          <VerificarPago />
        </Suspense>
        <div className="mt-6 text-center">
          <div className="font-heading text-3xl font-extrabold tracking-tight text-navy">
            {etiquetaPlan}
          </div>
          <div className="text-sm text-muted-foreground">14 días gratis</div>
        </div>
        <ul className="mt-8 space-y-3">
          {BENEFICIOS.map((beneficio) => (
            <li key={beneficio} className="flex items-center gap-2 text-sm text-ink">
              <svg className="size-4 shrink-0 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {beneficio}
            </li>
          ))}
        </ul>
        <div className="mt-8">
          <SuscripcionForm idPrefix="paywall" emailInicial={emailInicial} />
        </div>
        <form action={logout} className="mt-3 text-center">
          <button type="submit" className="ui-btn ui-btn-link text-xs">
            Cerrar sesión
          </button>
        </form>
      </div>
    </dialog>
  );
}
