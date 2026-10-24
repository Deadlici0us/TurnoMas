"use client";

import { Fragment, useMemo, useState, type ReactNode } from "react";

import BuscadorEnVivo from "@/components/ui/buscador-en-vivo";
import { filtrarEnVivo } from "@/lib/busqueda/filtrar-en-vivo";

export interface FilaFiltrable
{
  readonly key: string;
  readonly busqueda: readonly string[];
  readonly contenido: ReactNode;
}

interface TablaFiltrableProps
{
  readonly filas: readonly FilaFiltrable[];
  readonly encabezados: ReactNode;
  readonly placeholder: string;
  readonly vacioSinDatos: string;
  readonly vacioSinCoincidencias: string;
}

/**
 * Tabla con búsqueda incremental sobre filas ya renderizadas.
 *
 * @param props Filas buscables, encabezados y textos de estado vacío.
 * @return Buscador, tabla filtrada y mensaje de vacío.
 */
export default function TablaFiltrable({
  filas,
  encabezados,
  placeholder,
  vacioSinDatos,
  vacioSinCoincidencias,
}: TablaFiltrableProps)
{
  const [query, setQuery] = useState("");
  const visibles = useMemo(
    () => filtrarEnVivo(filas, query, (fila) => fila.busqueda),
    [filas, query],
  );

  return (
    <div className="space-y-4">
      {filas.length > 0 ? (
        <BuscadorEnVivo value={query} onChange={setQuery} placeholder={placeholder} />
      ) : null}
      <div className="overflow-x-auto">
        <table className="ui-table">
          <thead>{encabezados}</thead>
          <tbody className="divide-y divide-line">
            {visibles.map((fila) => <Fragment key={fila.key}>{fila.contenido}</Fragment>)}
          </tbody>
        </table>
      </div>
      {visibles.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground" role="status">
          {filas.length === 0 ? vacioSinDatos : vacioSinCoincidencias}
        </p>
      ) : null}
    </div>
  );
}
