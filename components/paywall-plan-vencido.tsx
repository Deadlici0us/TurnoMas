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
  readonly activar: (formData: FormData) => Promise<void>;
  readonly logout: () => Promise<void>;
}

export default function PaywallPlanVencido({
  etiquetaPlan,
  activar,
  logout,
}: PaywallPlanVencidoProps)
{
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="paywall-title"
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto
        bg-slate-950/85 px-4 py-8 backdrop-blur-md"
    >
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-white/5 p-8
        backdrop-blur-xl shadow-[0_8px_40px_-12px_rgba(0,0,0,0.6)]">
        <h1 id="paywall-title" className="text-2xl font-bold tracking-tight text-white text-center">
          Tu plan venció
        </h1>
        <p className="mt-2 text-lg text-slate-400 text-center">
          Un solo plan para profesionales que quieren crecer sin complicaciones
        </p>
        <div className="mt-6 text-center">
          <div className="text-3xl font-bold bg-gradient-to-r from-brand-400 to-cyan-300
            bg-clip-text text-transparent">
            {etiquetaPlan}
          </div>
          <div className="text-sm text-slate-400">14 días gratis</div>
        </div>
        <ul className="mt-8 space-y-3">
          {BENEFICIOS.map((beneficio) => (
            <li key={beneficio} className="flex items-center gap-2 text-sm text-slate-300">
              <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {beneficio}
            </li>
          ))}
        </ul>
        <form action={activar} className="mt-8 space-y-3">
          <label htmlFor="payer-email" className="block text-sm font-medium text-slate-300">
            Email de tu cuenta de MercadoPago
          </label>
          <input
            id="payer-email"
            type="email"
            name="payerEmail"
            required
            placeholder="tu-cuenta@ejemplo.com"
            autoComplete="email"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white rounded-xl outline-none
              placeholder:text-slate-500 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition"
          />
          <button
            type="submit"
            className="group relative block w-full overflow-hidden bg-brand-600 text-white font-semibold py-3
              rounded-xl hover:bg-brand-500 shadow-[0_0_36px_-6px_var(--brand-500)]
              transition-all duration-300 hover:-translate-y-0.5"
          >
            <span className="animate-shimmer pointer-events-none absolute inset-y-0 w-1/3
              bg-gradient-to-r from-transparent via-white/30 to-transparent" aria-hidden="true" />
            Pagar con MercadoPago
          </button>
        </form>
        <form action={logout} className="mt-3 text-center">
          <button
            type="submit"
            className="text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </div>
  );
}
