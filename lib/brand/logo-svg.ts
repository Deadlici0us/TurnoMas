export interface LogoOptions
{
  readonly size: number;
  readonly paddingRatio?: number;
  readonly strokeWidth?: number;
  readonly simplified?: boolean;
  readonly rounded?: boolean;
}

const CALENDAR_CLOCK_PATHS = [
  "M16 14v2.2l1.6 1",
  "M16 2v3",
  "M21 7.338V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h2.338",
  "M3 9h5.859",
  "M8 2v3",
] as const;

const SIMPLIFIED_PATHS = [
  "M21 7.338V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h2.338",
  "M3 9h5.859",
] as const;

/**
 * Arma el SVG cuadrado de la marca con el icono blanco centrado.
 *
 * @param options tamaño, padding relativo, grosor, variante y esquinas.
 * @return SVG listo para rasterizar o usar como data URI.
 */
export function buildLogoSvg(options: LogoOptions): string
{
  const {
    size,
    paddingRatio = 0.12,
    strokeWidth = 1.75,
    simplified = false,
    rounded = false,
  } = options;
  const padding = size * paddingRatio;
  const inner = size - padding * 2;
  const scale = inner / 24;
  const radius = rounded ? size * 0.2 : 0;
  const paths = simplified ? SIMPLIFIED_PATHS : CALENDAR_CLOCK_PATHS;
  const pathsMarkup = paths.map((path) => `<path d="${path}"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" ` +
    `viewBox="0 0 ${size} ${size}">` +
    `<rect width="${size}" height="${size}" rx="${radius}" fill="#06adef"/>` +
    `<g transform="translate(${padding} ${padding}) scale(${scale})" fill="none" stroke="#ffffff" ` +
    `stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">` +
    `${pathsMarkup}<circle cx="16" cy="16" r="6"/>` +
    `</g></svg>`;
}
