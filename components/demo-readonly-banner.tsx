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
    <div className="mb-6 ui-alert ui-alert-warning p-4 text-sm">
      <p className="font-semibold text-[#7a5200]">
        Estás explorando la cuenta demo: es de solo lectura.
      </p>
      {props.accionBloqueada ? (
        <p role="alert" className="mt-1 text-[#7a5200]">
          No pudimos guardar ese cambio en la demo. Creá tu cuenta gratis y probá con tu negocio.
        </p>
      ) : (
        <p className="mt-1 text-[#7a5200]">
          Mirá todo lo que quieras, pero los cambios están desactivados en la demo.
        </p>
      )}
      <Link
        href="/register"
        className="ui-btn ui-btn-primary ui-btn-sm mt-3"
      >
        Creá tu cuenta gratis
      </Link>
    </div>
  );
}
