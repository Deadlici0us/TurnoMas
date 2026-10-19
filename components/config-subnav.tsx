import Link from "next/link";

import { SECCIONES_CONFIG } from "@/lib/config/secciones";
import type { SeccionConfigId } from "@/lib/config/secciones";

interface ConfigSubnavProps
{
  readonly activa: SeccionConfigId;
}

/**
 * Submenú horizontal de Configuración.
 *
 * @param props Sección activa.
 * @return Navegación con tabs hacia cada grupo.
 */
export default function ConfigSubnav({ activa }: ConfigSubnavProps)
{
  return (
    <nav aria-label="Secciones de configuración" className="flex flex-wrap gap-1">
      {SECCIONES_CONFIG.map((seccion) => (
        <Link
          key={seccion.id}
          href={`/dashboard/config?seccion=${seccion.id}`}
          aria-current={activa === seccion.id ? "page" : undefined}
          className={`ui-tab ${activa === seccion.id ? "ui-tab-active" : ""}`}
        >
          {seccion.etiqueta}
        </Link>
      ))}
    </nav>
  );
}
