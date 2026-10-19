"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";

import Toast from "./toast";
import { getToasts, removeToast, subscribeToasts } from "./toast-store";

const SALIDA_MS = 200;
const SIN_TOASTS: readonly never[] = [];

/**
 * Viewport global de notificaciones.
 *
 * La lista vive en un store externo (`toast-store`) para que las
 * revalidaciones del dashboard no borren los toasts en vuelo.
 *
 * @param props Contenido de la aplicación.
 * @return Children más el stack de toasts en un portal.
 */
export default function ToastProvider({ children }: { readonly children: ReactNode })
{
  const items = useSyncExternalStore(subscribeToasts, getToasts, () => SIN_TOASTS);
  const [saliendo, setSaliendo] = useState<ReadonlySet<number>>(new Set());

  const dismissToast = useCallback((id: number): void =>
  {
    setSaliendo((prev) => new Set(prev).add(id));
    setTimeout(() =>
    {
      removeToast(id);
      setSaliendo((prev) =>
      {
        const siguiente = new Set(prev);
        siguiente.delete(id);
        return siguiente;
      });
    }, SALIDA_MS);
  }, []);

  return (
    <>
      {children}
      <div
        aria-label="Notificaciones"
        className="pointer-events-none fixed inset-x-0 top-[68px] z-[100] flex flex-col
          items-center gap-2 px-4"
      >
        {items.map((item) => (
          <Toast
            key={item.id}
            item={item}
            leaving={saliendo.has(item.id)}
            onDismiss={dismissToast}
          />
        ))}
      </div>
    </>
  );
}
