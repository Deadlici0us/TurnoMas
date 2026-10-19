/**
 * Mapa pequeño del local para el portal público.
 *
 * Usa el embed clásico de Google Maps (sin API key) centrado en las
 * coordenadas extraídas del link del negocio. Si no hay coordenadas válidas
 * no renderiza nada.
 */

export interface PortalMapaProps
{
  readonly lat: number;
  readonly lng: number;
  readonly nombre: string;
  /** Link original de Google Maps para abrir en otra pestaña (opcional). */
  readonly href?: string | null;
}

/**
 * Arma la URL del embed centrado en un punto, con marcador.
 *
 * @param lat Latitud.
 * @param lng Longitud.
 * @return URL del iframe de Google Maps.
 */
function urlEmbed(lat: number, lng: number): string
{
  const punto = encodeURIComponent(`${lat},${lng}`);

  return `https://www.google.com/maps?q=${punto}&z=16&hl=es&output=embed`;
}

/**
 * Mapa embebido de la ubicación del local.
 *
 * @param props Coordenadas, nombre del negocio y link opcional.
 * @return Iframe accesible o null si las coordenadas no son válidas.
 */
export default function PortalMapa({ lat, lng, nombre, href }: PortalMapaProps)
{
  if (!Number.isFinite(lat) || !Number.isFinite(lng))
  {
    return null;
  }

  return (
    <section className="space-y-2" aria-label={`Ubicación de ${nombre}`}>
      <iframe
        title={`Ubicación de ${nombre}`}
        src={urlEmbed(lat, lng)}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="h-[180px] w-full rounded-2xl border border-white/10"
      />
      {typeof href === "string" && href.length > 0 ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center text-xs font-semibold text-slate-400 underline
            underline-offset-4 hover:text-white"
        >
          Ver en Google Maps
        </a>
      ) : null}
    </section>
  );
}
