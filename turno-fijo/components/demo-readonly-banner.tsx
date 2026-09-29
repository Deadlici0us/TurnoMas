import Link from "next/link";

export interface DemoReadonlyBannerProps
{
  readonly accionBloqueada: boolean;
}

/**
 * Aviso de solo lectura para la cuenta demo (dashboard).
 *
 * @param props `accionBloqueada` muestra además la alerta del cambio rechazado.
 * @return Banner ámbar con explicación y CTA a crear cuenta gratis.
 */
export default function DemoReadonlyBanner(props: DemoReadonlyBannerProps)
{
  return (
    <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
      <p className="font-semibold text-amber-900">
        Estás explorando la cuenta demo: es de solo lectura.
      </p>
      {props.accionBloqueada ? (
        <p role="alert" className="mt-1 text-amber-800">
          No pudimos guardar ese cambio en la demo. Creá tu cuenta gratis y probá con tu negocio.
        </p>
      ) : (
        <p className="mt-1 text-amber-800">
          Mirá todo lo que quieras, pero los cambios están desactivados en la demo.
        </p>
      )}
      <Link
        href="/register"
        className="mt-3 inline-block rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white
          hover:bg-blue-700 transition-colors"
      >
        Creá tu cuenta gratis
      </Link>
    </div>
  );
}
