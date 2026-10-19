import type { ToastInput, ToastItem } from "./toast-types";

const MAX_TOASTS = 3;

let items: readonly ToastItem[] = [];
let nextId = 1;

const listeners = new Set<() => void>();

function emit(): void
{
  for (const listener of listeners)
  {
    listener();
  }
}

/**
 * Suscripción al store de toasts para `useSyncExternalStore`.
 *
 * @param listener Callback que se ejecuta cuando cambia la lista.
 * @return Función para desuscribirse.
 */
export function subscribeToasts(listener: () => void): () => void
{
  listeners.add(listener);

  return () =>
  {
    listeners.delete(listener);
  };
}

/** @return Lista actual de toasts. */
export function getToasts(): readonly ToastItem[]
{
  return items;
}

/**
 * Agrega un toast al principio de la pila.
 *
 * @param input Contenido y tono del toast.
 */
export function pushToast(input: ToastInput): void
{
  items = [{ ...input, id: nextId }, ...items].slice(0, MAX_TOASTS);
  nextId += 1;
  emit();
}

/**
 * Quita un toast de la pila.
 *
 * @param id Identificador del toast.
 */
export function removeToast(id: number): void
{
  items = items.filter((item) => item.id !== id);
  emit();
}

/** Limpia la pila (útil al cerrar sesión y en tests). */
export function resetToasts(): void
{
  items = [];
  nextId = 1;
  emit();
}
