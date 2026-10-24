"use client";

import { Fragment, useMemo, useState, type ReactNode } from "react";

import BuscadorEnVivo from "@/components/ui/buscador-en-vivo";
import { filtrarEnVivo } from "@/lib/busqueda/filtrar-en-vivo";

export interface ItemFiltrable
{
  readonly key: string;
  readonly busqueda: readonly string[];
  readonly contenido: ReactNode;
}

interface ListaFiltrableProps
{
  readonly items: readonly ItemFiltrable[];
  readonly placeholder: string;
  readonly vacioSinDatos: string;
  readonly vacioSinCoincidencias: string;
  readonly claseLista?: string;
}

/**
 * Lista con búsqueda incremental sobre elementos ya renderizados.
 *
 * @param props Items buscables y textos de estado vacío.
 * @return Buscador más la lista filtrada.
 */
export default function ListaFiltrable({
  items,
  placeholder,
  vacioSinDatos,
  vacioSinCoincidencias,
  claseLista,
}: ListaFiltrableProps)
{
  const [query, setQuery] = useState("");
  const visibles = useMemo(
    () => filtrarEnVivo(items, query, (item) => item.busqueda),
    [items, query],
  );

  return (
    <div className="space-y-4">
      {items.length > 0 ? (
        <BuscadorEnVivo value={query} onChange={setQuery} placeholder={placeholder} />
      ) : null}
      {visibles.length > 0 ? (
        <div className={claseLista}>
          {visibles.map((item) => <Fragment key={item.key}>{item.contenido}</Fragment>)}
        </div>
      ) : null}
      {visibles.length === 0 ? (
        <p className="ui-card p-8 text-center text-sm text-muted-foreground" role="status">
          {items.length === 0 ? vacioSinDatos : vacioSinCoincidencias}
        </p>
      ) : null}
    </div>
  );
}
