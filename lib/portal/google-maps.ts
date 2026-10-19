/**
 * Extracción de la ubicación del local desde un link de Google Maps.
 *
 * La app no usa API keys de Google: intenta leer las coordenadas que el
 * propio link de Maps ya contiene (`@lat,lng`, `!3d...!4d...`, `q=lat,lng`).
 * Para los links cortos de "Compartir" (`maps.app.goo.gl`) se resuelve el
 * redirect del lado del servidor, con timeout y cache. Si no se pueden
 * obtener coordenadas válidas, el portal simplemente no muestra el mapa.
 */

export interface CoordenadasMaps
{
  readonly lat: number;
  readonly lng: number;
}

const MAX_URL = 500;
const TTL_EXITO_MS = 24 * 60 * 60 * 1000;
const TTL_FALLO_MS = 5 * 60 * 1000;
const TIMEOUT_RESOLUCION_MS = 3000;

const CACHE = new Map<string, { readonly valor: CoordenadasMaps | null; readonly expira: number }>();

/** Normaliza una URL https o devuelve null. */
function normalizarUrl(valor: unknown): URL | null
{
  if (typeof valor !== "string")
  {
    return null;
  }

  const texto = valor.trim().slice(0, MAX_URL);

  if (texto.length === 0)
  {
    return null;
  }

  try
  {
    const url = new URL(texto);

    return url.protocol === "https:" ? url : null;
  }
  catch
  {
    return null;
  }
}

/** Host de Google Maps largo (google.com, www.google.com.ar, maps.google.com…). */
function esHostGoogleMaps(host: string): boolean
{
  return /(^|\.)google\.[a-z.]+$/i.test(host);
}

/** Link corto de Google Maps (`maps.app.goo.gl` o `goo.gl/maps`). */
function esLinkCorto(url: URL): boolean
{
  if (url.hostname.toLowerCase() === "maps.app.goo.gl")
  {
    return true;
  }

  return url.hostname.toLowerCase() === "goo.gl" && url.pathname.startsWith("/maps");
}

/** Indica si la URL pertenece a Google Maps y puede consultarse. */
function esUrlMapsPermitida(url: URL): boolean
{
  if (esLinkCorto(url))
  {
    return true;
  }

  return esHostGoogleMaps(url.hostname) && url.pathname.startsWith("/maps");
}

/** Valida rango geográfico y arma el resultado. */
function aCoordenadas(lat: number, lng: number): CoordenadasMaps | null
{
  if (!Number.isFinite(lat) || !Number.isFinite(lng))
  {
    return null;
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180)
  {
    return null;
  }

  return { lat, lng };
}

/** Busca un par `lat,lng` dentro de un texto. */
function parDeTexto(texto: string): CoordenadasMaps | null
{
  const match = /(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)/.exec(texto);

  if (match === null)
  {
    return null;
  }

  return aCoordenadas(Number(match[1]), Number(match[2]));
}

/**
 * Extrae coordenadas de un link de Google Maps sin hacer requests.
 *
 * Prioriza el marcador real (`!3d...!4d...`) sobre el centro del viewport
 * (`@lat,lng`) y, por último, parámetros de búsqueda (`q`, `query`, `ll`…).
 *
 * @param valor Link crudo.
 * @return Coordenadas válidas o null.
 */
export function extraerCoordenadasMaps(valor: unknown): CoordenadasMaps | null
{
  const url = normalizarUrl(valor);

  if (url === null)
  {
    return null;
  }

  const crudo = url.toString();
  const marcador = /!3d(-?\d{1,3}(?:\.\d+)?)!4d(-?\d{1,3}(?:\.\d+)?)/.exec(crudo);

  if (marcador !== null)
  {
    const coordenadas = aCoordenadas(Number(marcador[1]), Number(marcador[2]));

    if (coordenadas !== null)
    {
      return coordenadas;
    }
  }

  const centro = /@(-?\d{1,3}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)/.exec(crudo);

  if (centro !== null)
  {
    const coordenadas = aCoordenadas(Number(centro[1]), Number(centro[2]));

    if (coordenadas !== null)
    {
      return coordenadas;
    }
  }

  for (const clave of ["q", "query", "ll", "center", "destination"])
  {
    const parametro = url.searchParams.get(clave);

    if (parametro !== null)
    {
      const coordenadas = parDeTexto(parametro);

      if (coordenadas !== null)
      {
        return coordenadas;
      }
    }
  }

  return null;
}

/** Lee la cache vigente para una URL corta. */
function leerCache(clave: string): CoordenadasMaps | null | undefined
{
  const entrada = CACHE.get(clave);

  if (entrada === undefined)
  {
    return undefined;
  }

  if (entrada.expira <= Date.now())
  {
    CACHE.delete(clave);
    return undefined;
  }

  return entrada.valor;
}

/** Guarda en cache una resolución (éxito o fallo). */
function guardarCache(clave: string, valor: CoordenadasMaps | null): void
{
  CACHE.set(clave, {
    valor,
    expira: Date.now() + (valor !== null ? TTL_EXITO_MS : TTL_FALLO_MS),
  });
}

/** Resuelve un link corto siguiendo el redirect, sin propagar errores. */
async function resolverLinkCorto(url: URL): Promise<CoordenadasMaps | null>
{
  try
  {
    const respuesta = await fetch(url.toString(), {
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_RESOLUCION_MS),
      headers: { "User-Agent": "TurnoMas/1.0" },
    });
    const destino = normalizarUrl(respuesta.url);

    // El redirect debe terminar en un host de Google (evita SSRF / spoofing).
    if (destino === null || !esHostGoogleMaps(destino.hostname))
    {
      return null;
    }

    return extraerCoordenadasMaps(destino.toString());
  }
  catch
  {
    return null;
  }
}

/**
 * Resuelve la ubicación del local a partir del link de Google Maps.
 *
 * Los links largos se parsean en memoria. Los cortos se resuelven una vez y
 * se cachean. Cualquier error (URL inválida, timeout, redirect a otro host)
 * devuelve null para que el portal omita el mapa.
 *
 * @param valor Link guardado por el negocio.
 * @return Coordenadas válidas o null.
 */
export async function resolverUbicacionMaps(valor: unknown): Promise<CoordenadasMaps | null>
{
  const url = normalizarUrl(valor);

  if (url === null || !esUrlMapsPermitida(url))
  {
    return null;
  }

  const directas = extraerCoordenadasMaps(url.toString());

  if (directas !== null)
  {
    return directas;
  }

  if (!esLinkCorto(url))
  {
    return null;
  }

  const clave = url.toString();
  const cacheada = leerCache(clave);

  if (cacheada !== undefined)
  {
    return cacheada;
  }

  const resueltas = await resolverLinkCorto(url);

  guardarCache(clave, resueltas);

  return resueltas;
}
