"use client";

import { Combobox } from "@base-ui/react/combobox";
import { Check, ChevronDown, X } from "lucide-react";
import { useMemo } from "react";

import { ordenarClientesPorNombre } from "@/lib/clientes/orden-clientes";

/** Cliente seleccionable en el alta manual de turnos. */
export interface ClienteOpcion
{
  readonly id: string;
  readonly nombre: string;
  readonly whatsapp: string;
  readonly email?: string | null;
}

interface SelectorClienteProps
{
  readonly clientes: readonly ClienteOpcion[];
  readonly seleccionadoId: string;
  readonly onElegir: (id: string) => void;
}

/**
 * Selector de clientes con búsqueda por nombre.
 *
 * Muestra la lista ordenada alfabéticamente y cada opción incluye nombre,
 * WhatsApp y email. Permite escribir para filtrar y limpiar la selección
 * para cargar un cliente nuevo.
 *
 * @param props Clientes disponibles, selección actual y callback de cambio.
 * @return Combobox accesible con búsqueda y listado.
 */
export default function SelectorCliente({
  clientes,
  seleccionadoId,
  onElegir,
}: SelectorClienteProps)
{
  const ordenados = useMemo(() => ordenarClientesPorNombre(clientes), [clientes]);
  const seleccionado = ordenados.find((cliente) => cliente.id === seleccionadoId) ?? null;

  return (
    <div>
      <label htmlFor="turno-cliente" className="ui-label mb-1">
        Cliente
      </label>
      <Combobox.Root
        items={ordenados}
        value={seleccionado}
        onValueChange={(cliente) => onElegir(cliente?.id ?? "")}
        itemToStringLabel={(cliente) => cliente.nombre}
        isItemEqualToValue={(item, value) => item.id === value.id}
      >
        <Combobox.InputGroup className="relative mt-1">
          <Combobox.Input
            id="turno-cliente"
            placeholder="Buscá por nombre..."
            autoComplete="off"
            className="ui-input pr-20"
          />
          <div className="absolute inset-y-0 right-0 flex items-center">
            <Combobox.Clear
              aria-label="Cargar cliente nuevo"
              className="flex h-full w-8 items-center justify-center text-muted-foreground
                transition-colors hover:text-ink"
            >
              <X className="size-4" aria-hidden="true" />
            </Combobox.Clear>
            <Combobox.Trigger
              aria-label="Ver clientes"
              className="flex h-full w-8 items-center justify-center text-muted-foreground
                transition-colors hover:text-ink"
            >
              <ChevronDown className="size-4" aria-hidden="true" />
            </Combobox.Trigger>
          </div>
        </Combobox.InputGroup>
        <Combobox.Portal>
          <Combobox.Positioner className="z-50 outline-none" sideOffset={4}>
            <Combobox.Popup
              className="max-h-72 min-w-[var(--anchor-width)] max-w-[var(--available-width)]
                overflow-y-auto rounded-lg border border-line bg-white p-1
                shadow-[var(--shadow-modal)]"
            >
              <Combobox.Empty className="px-3 py-4 text-sm text-muted-foreground">
                No encontramos clientes con ese nombre.
              </Combobox.Empty>
              <Combobox.List>
                {(cliente: ClienteOpcion) => (
                  <Combobox.Item
                    key={cliente.id}
                    value={cliente}
                    className="grid cursor-default grid-cols-[1rem_1fr] items-center gap-2 rounded
                      px-3 py-2 text-sm text-ink outline-none select-none
                      data-[highlighted]:bg-soft"
                  >
                    <Combobox.ItemIndicator className="col-start-1">
                      <Check className="size-4" aria-hidden="true" />
                    </Combobox.ItemIndicator>
                    <span className="col-start-2 min-w-0">
                      <span className="block truncate font-semibold">{cliente.nombre}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {cliente.whatsapp} · {cliente.email ?? "Sin email"}
                      </span>
                    </span>
                  </Combobox.Item>
                )}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
      <p className="ui-hint mt-1">
        {seleccionado === null
          ? "Escribí para filtrar por nombre o dejalo vacío para cargar un cliente nuevo."
          : `${seleccionado.whatsapp} · ${seleccionado.email ?? "Sin email"}`}
      </p>
    </div>
  );
}
