/**
 * Paywall a pantalla completa para negocios con el plan vencido.
 *
 * Cubre todo el dashboard (sidebar incluido) cuando el negocio está
 * bloqueado por falta de pago: muestra el plan, sus beneficios y ofrece
 * reactivarlo. No es descartable; la única salida es activar el plan.
 */
const BENEFICIOS = [
  "Reservas ilimitadas",
  "Cobro de señas vía MercadoPago",
  "Recordatorios por WhatsApp y email",
  "Lista negra automática",
  "Agenda sincronizada con Google Calendar",
  "Soporte prioritario",
] as const;

export default function PaywallPlanVencido(
  {
    etiquetaPlan,
    activar,
    logout,
  }: {
    readonly etiquetaPlan: string;
    readonly activar: () => Promise<void>;
    readonly logout: () => Promise<void>;
  },
)
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
        <div className="mt-8">
          <form action={activar}>
            <button
              type="submit"
              className="group relative block w-full overflow-hidden bg-brand-600 text-white font-semibold py-3
                rounded-xl hover:bg-brand-500 shadow-[0_0_36px_-6px_var(--brand-500)]
                transition-all duration-300 hover:-translate-y-0.5"
            >
              <span className="animate-shimmer pointer-events-none absolute inset-y-0 w-1/3
                bg-gradient-to-r from-transparent via-white/30 to-transparent" aria-hidden="true" />
              {`Activar plan ${etiquetaPlan}`}
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
    </div>
  );
}
