"use client";

import { LEYENDA_ESTADOS } from "@/lib/dashboard/estados-colores";

/** Leyenda única de colores de estados (agenda y pagos). */
export default function LeyendaEstados()
{
  return (
    <div className="flex flex-wrap gap-1.5" aria-label="Significado de los colores">
      {LEYENDA_ESTADOS.map((item) => (
        <span
          key={item.estado}
          title={item.descripcion}
          className={`ui-badge ${item.clase}`}
        >
          {item.titulo}
        </span>
      ))}
    </div>
  );
}
