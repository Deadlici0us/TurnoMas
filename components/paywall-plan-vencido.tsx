/**
 * Paywall para negocios con el plan vencido (bloqueados por falta de pago).
 *
 * Reemplaza la vista de facturación cuando el negocio está bloqueado:
 * explica el estado y ofrece reactivar el plan, que es la única acción
 * disponible hasta regularizar el pago.
 */
export default function PaywallPlanVencido(
  {
    etiquetaPlan,
    activar,
  }: {
    readonly etiquetaPlan: string;
    readonly activar: () => Promise<void>;
  },
)
{
  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 sm:p-8">
      <h1 className="text-2xl font-bold tracking-tight text-rose-200">Tu plan venció</h1>
      <p className="mt-2 text-sm text-rose-300">
        Tu acceso está bloqueado por falta de pago. Activá el plan para seguir usando TurnoMas.
      </p>
      <form action={activar} className="mt-6">
        <button
          type="submit"
          className="bg-blue-600 text-white text-sm font-semibold px-6 py-2 rounded-lg
            hover:bg-blue-700 transition-colors"
        >
          {`Activar plan ${etiquetaPlan}`}
        </button>
      </form>
    </div>
  );
}
