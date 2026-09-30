"use client";

import { EXTERNO_LEYENDA, LEYENDA_ESTADOS } from "@/lib/dashboard/estados-colores";

interface LeyendaEstadosProps
{
  readonly incluirExterno?: boolean;
}

/** Leyenda única de colores de estados (agenda y pagos). */
export default function LeyendaEstados({ incluirExterno = false }: LeyendaEstadosProps)
{
  const items = incluirExterno
    ? [...LEYENDA_ESTADOS, { estado: "externo", titulo: EXTERNO_LEYENDA.titulo,
      descripcion: EXTERNO_LEYENDA.descripcion, clase: EXTERNO_LEYENDA.clase }]
    : LEYENDA_ESTADOS;

  return (
    <div className="flex flex-wrap gap-2" aria-label="Significado de los colores">
      {items.map((item) => (
        <span
          key={item.estado}
          title={item.descripcion}
          className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1
            rounded-full border ${item.clase}`}
        >
          {item.titulo}
        </span>
      ))}
    </div>
  );
}
