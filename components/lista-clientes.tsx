"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

import BuscadorEnVivo from "@/components/ui/buscador-en-vivo";
import ActionForm from "@/components/ui/action-form";
import SubmitButton from "@/components/ui/submit-button";
import { coincideBusquedaCliente } from "@/lib/clientes/busqueda-clientes";
import { ordenarClientesPorNombre } from "@/lib/clientes/orden-clientes";
import type { ActionResult } from "@/lib/actions/action-result";

export type FiltroEstado = "todos" | "activos" | "lista-negra";

export interface HistorialClienteListado
{
  readonly id: string;
  readonly servicio: string;
  readonly estado: string;
  readonly estadoEtiqueta: string;
}

export interface AccionesClienteListado
{
  readonly sumarFalta: () => Promise<ActionResult<void>>;
  readonly restarFalta: () => Promise<ActionResult<void>>;
  readonly alternarBloqueo: () => Promise<ActionResult<void>>;
  readonly eliminar: () => Promise<ActionResult<void>>;
}

export interface ClienteListado
{
  readonly id: string;
  readonly nombre: string;
  readonly whatsapp: string;
  readonly email?: string | null;
  readonly ausencias: number;
  readonly bloqueado: boolean;
  readonly decision: "allowed" | "blocked" | "fullDeposit";
  readonly historial: readonly HistorialClienteListado[];
  readonly whatsappLink: string | null;
  readonly acciones: AccionesClienteListado;
}

interface ListaClientesProps
{
  readonly clientes: readonly ClienteListado[];
  readonly initialQuery?: string;
  readonly initialFiltro?: FiltroEstado;
  readonly umbral: number;
}

const FILTROS: readonly { readonly valor: FiltroEstado; readonly etiqueta: string }[] = [
  { valor: "todos", etiqueta: "Todos" },
  { valor: "activos", etiqueta: "Activos" },
  { valor: "lista-negra", etiqueta: "Lista negra" },
];

/**
 * Lista de clientes con búsqueda incremental y filtros de estado.
 *
 * @param props Clientes ya calculados en el servidor y estado inicial.
 * @return Buscador, tabs y tabla/cards de clientes.
 */
export default function ListaClientes({
  clientes,
  initialQuery = "",
  initialFiltro = "todos",
  umbral,
}: ListaClientesProps)
{
  const [query, setQuery] = useState(initialQuery);
  const [filtro, setFiltro] = useState<FiltroEstado>(initialFiltro);

  const visibles = useMemo(() =>
  {
    const ordenados = ordenarClientesPorNombre(clientes);

    return ordenados.filter((cliente) =>
    {
      if (!coincideBusquedaCliente(cliente, query))
      {
        return false;
      }

      if (filtro === "activos")
      {
        return cliente.decision === "allowed";
      }

      if (filtro === "lista-negra")
      {
        return cliente.decision !== "allowed";
      }

      return true;
    });
  }, [clientes, filtro, query]);

  return (
    <div>
      <div className="ui-card mb-6 p-5 sm:p-6">
        <BuscadorEnVivo
          value={query}
          onChange={setQuery}
          placeholder="Buscar por nombre, WhatsApp o email"
        />
        <div className="mt-3 flex flex-wrap gap-1">
          {FILTROS.map(({ valor, etiqueta }) => (
            <button
              key={valor}
              type="button"
              onClick={() => setFiltro(valor)}
              aria-pressed={filtro === valor}
              className={`ui-tab ${filtro === valor ? "ui-tab-active" : ""}`}
            >
              {etiqueta}
            </button>
          ))}
        </div>
      </div>
      <div className="ui-card overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="ui-table">
            <thead>
              <tr>
                <th className="ui-th px-6">Cliente</th>
                <th className="ui-th px-6">Turnos</th>
                <th className="ui-th px-6">Ausencias</th>
                <th className="ui-th px-6">Estado</th>
                <th className="ui-th px-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {visibles.map((cliente) =>
              {
                const ultimo = cliente.historial[0];
                const enListaNegra = cliente.decision !== "allowed";

                return (
                  <tr key={cliente.id} className="ui-tr align-top">
                    <td className="ui-td px-6">
                      <Link
                        href={"/dashboard/clientes/" + cliente.id}
                        className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                      >
                        {cliente.nombre}
                        <ChevronRight className="size-4" aria-hidden="true" />
                      </Link>
                      <p className="text-muted-foreground text-xs mt-0.5">{cliente.whatsapp}</p>
                      {typeof cliente.email === "string" && cliente.email.length > 0 ? (
                        <p className="text-muted-foreground text-xs">{cliente.email}</p>
                      ) : null}
                      <p className="text-muted-foreground text-xs mt-1">
                        {ultimo
                          ? "Último: " + ultimo.servicio + " · " + ultimo.estado
                          : "Sin turnos"}
                      </p>
                    </td>
                    <td className="ui-td px-6 text-muted-foreground">{cliente.historial.length}</td>
                    <td className="ui-td px-6">
                      <span className={cliente.ausencias >= umbral
                        ? "text-danger font-semibold"
                        : "text-muted-foreground"}>
                        {cliente.ausencias}
                      </span>
                    </td>
                    <td className="ui-td px-6">
                      {enListaNegra ? (
                        <span className="ui-badge ui-badge-danger">
                          {cliente.decision === "blocked" ? "Bloqueado" : "Seña 100%"}
                        </span>
                      ) : (
                        <span className="ui-badge ui-badge-success">Activo</span>
                      )}
                    </td>
                    <td className="ui-td px-6">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Link
                          href={"/dashboard/clientes/" + cliente.id}
                          className="ui-btn ui-btn-outline ui-btn-sm inline-flex items-center gap-1"
                        >
                          Ver ficha
                          <ChevronRight className="size-3.5" aria-hidden="true" />
                        </Link>
                        <Link
                          href={"/dashboard/agenda/nuevo?clienteId=" + cliente.id}
                          className="ui-btn ui-btn-outline ui-btn-sm"
                        >
                          Agregar turno
                        </Link>
                        {cliente.whatsappLink !== null ? (
                          <a
                            href={cliente.whatsappLink}
                            target="_blank"
                            rel="noreferrer"
                            className="ui-btn ui-btn-outline ui-btn-sm border-success/40 text-[#0c6b45]
                              hover:bg-success-soft"
                          >
                            WhatsApp
                          </a>
                        ) : null}
                        <ActionForm
                          action={cliente.acciones.sumarFalta}
                          successMessage="Ausencia registrada."
                        >
                          <SubmitButton className="ui-btn ui-btn-outline ui-btn-sm">
                            + Falta
                          </SubmitButton>
                        </ActionForm>
                        <ActionForm
                          action={cliente.acciones.restarFalta}
                          successMessage="Ausencia descontada."
                        >
                          <SubmitButton className="ui-btn ui-btn-outline ui-btn-sm">
                            − Falta
                          </SubmitButton>
                        </ActionForm>
                        <ActionForm
                          action={cliente.acciones.alternarBloqueo}
                          successMessage={cliente.bloqueado ? "Cliente desbloqueado." : "Cliente bloqueado."}
                        >
                          <SubmitButton className="ui-btn ui-btn-outline ui-btn-sm">
                            {cliente.bloqueado ? "Desbloquear" : "Bloquear"}
                          </SubmitButton>
                        </ActionForm>
                        <ActionForm
                          action={cliente.acciones.eliminar}
                          successMessage="Cliente eliminado."
                        >
                          <SubmitButton className="ui-btn ui-btn-danger ui-btn-sm">
                            Eliminar
                          </SubmitButton>
                        </ActionForm>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="md:hidden divide-y divide-line">
          {visibles.map((cliente) =>
          {
            const enListaNegra = cliente.decision !== "allowed";

            return (
              <div key={cliente.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link
                      href={"/dashboard/clientes/" + cliente.id}
                      className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                    >
                      {cliente.nombre}
                      <ChevronRight className="size-4" aria-hidden="true" />
                    </Link>
                    <p className="text-muted-foreground text-xs mt-0.5">{cliente.whatsapp}</p>
                    {typeof cliente.email === "string" && cliente.email.length > 0 ? (
                      <p className="text-muted-foreground text-xs">{cliente.email}</p>
                    ) : null}
                    <p className="text-muted-foreground text-xs mt-1">
                      {cliente.historial.length} turnos · {cliente.ausencias} faltas
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {enListaNegra ? (
                      <span className="ui-badge ui-badge-danger">
                        {cliente.decision === "blocked" ? "Bloqueado" : "Seña 100%"}
                      </span>
                    ) : (
                      <span className="ui-badge ui-badge-success">Activo</span>
                    )}
                    <Link
                      href={"/dashboard/clientes/" + cliente.id}
                      className="ui-btn ui-btn-outline ui-btn-sm inline-flex items-center gap-1"
                    >
                      Ver ficha
                      <ChevronRight className="size-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
                <details className="mt-3 border border-line rounded-lg">
                  <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-ink">
                    Historial y acciones
                  </summary>
                  <div className="px-3 pb-3 pt-1 border-t border-line">
                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                      {cliente.historial.length === 0 ? <li>Sin turnos todavía.</li> : null}
                      {cliente.historial.slice(0, 5).map((turno) => (
                        <li key={turno.id}>
                          {turno.servicio + " · " + turno.estadoEtiqueta}
                        </li>
                      ))}
                    </ul>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Link
                        href={"/dashboard/agenda/nuevo?clienteId=" + cliente.id}
                        className="ui-btn ui-btn-outline ui-btn-sm"
                      >
                        Agregar turno
                      </Link>
                      {cliente.whatsappLink !== null ? (
                        <a
                          href={cliente.whatsappLink}
                          target="_blank"
                          rel="noreferrer"
                          className="ui-btn ui-btn-outline ui-btn-sm border-success/40 text-[#0c6b45]
                            hover:bg-success-soft"
                        >
                          WhatsApp
                        </a>
                      ) : null}
                      <ActionForm
                        action={cliente.acciones.sumarFalta}
                        successMessage="Ausencia registrada."
                      >
                        <SubmitButton className="ui-btn ui-btn-outline ui-btn-sm">+ Falta</SubmitButton>
                      </ActionForm>
                      <ActionForm
                        action={cliente.acciones.restarFalta}
                        successMessage="Ausencia descontada."
                      >
                        <SubmitButton className="ui-btn ui-btn-outline ui-btn-sm">− Falta</SubmitButton>
                      </ActionForm>
                      <ActionForm
                        action={cliente.acciones.alternarBloqueo}
                        successMessage={cliente.bloqueado ? "Cliente desbloqueado." : "Cliente bloqueado."}
                      >
                        <SubmitButton className="ui-btn ui-btn-outline ui-btn-sm">
                          {cliente.bloqueado ? "Desbloquear" : "Bloquear"}
                        </SubmitButton>
                      </ActionForm>
                      <ActionForm
                        action={cliente.acciones.eliminar}
                        successMessage="Cliente eliminado."
                      >
                        <SubmitButton className="ui-btn ui-btn-danger ui-btn-sm">Eliminar</SubmitButton>
                      </ActionForm>
                    </div>
                  </div>
                </details>
              </div>
            );
          })}
        </div>
        {visibles.length === 0 ? (
          <p className="text-sm text-muted-foreground px-6 py-6" role="status">
            {clientes.length === 0 ? "Todavía no tenés clientes." : "Ningún cliente coincide con la búsqueda."}
          </p>
        ) : null}
      </div>
    </div>
  );
}
