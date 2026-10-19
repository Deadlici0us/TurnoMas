"use client";

import { pushToast, removeToast } from "./toast-store";
import type { ToastApi } from "./toast-types";

const API: ToastApi =
{
  showToast: pushToast,
  dismissToast: removeToast,
};

/**
 * Acceso al sistema global de toasts.
 *
 * El store vive fuera de React para sobrevivir a revalidaciones y remounts
 * del árbol de Server Components.
 *
 * @return Acciones para mostrar y cerrar notificaciones.
 */
export function useToast(): ToastApi
{
  return API;
}
