/**
 * Carga única del script de Google Identity Services en el navegador.
 *
 * Google exige cargar `gsi/client` desde accounts.google.com y no permite
 * self-hosting. El script se reutiliza entre montajes del botón.
 */

export const GOOGLE_GIS_SCRIPT_URL = "https://accounts.google.com/gsi/client";

let pending: Promise<void> | null = null;

/**
 * Resuelve cuando `window.google.accounts.id` está disponible.
 *
 * @return Promesa que se resuelve al cargar GIS.
 */
export function loadGoogleIdentityServices(): Promise<void>
{
  if (typeof window === "undefined")
  {
    return Promise.reject(new Error("Google Identity Services solo está disponible en el navegador."));
  }

  if (window.google?.accounts?.id !== undefined)
  {
    return Promise.resolve();
  }

  if (pending !== null)
  {
    return pending;
  }

  pending = new Promise((resolve, reject) =>
  {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GOOGLE_GIS_SCRIPT_URL}"]`);

    if (existing !== null)
    {
      if (existing.dataset.gisLoaded === "true")
      {
        pending = null;
        reject(new Error("No pudimos cargar Google Identity Services."));

        return;
      }

      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () =>
      {
        pending = null;
        reject(new Error("No pudimos cargar Google Identity Services."));
      }, { once: true });

      return;
    }

    const script = document.createElement("script");
    script.src = GOOGLE_GIS_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", () =>
    {
      script.dataset.gisLoaded = "true";
      resolve();
    }, { once: true });
    script.addEventListener("error", () =>
    {
      pending = null;
      reject(new Error("No pudimos cargar Google Identity Services."));
    }, { once: true });
    document.head.appendChild(script);
  });

  return pending;
}
