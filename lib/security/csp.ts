/**
 * Content-Security-Policy (defensa XSS con nonce por request).
 *
 * `script-src` usa un `nonce` por request (Next lo inyecta en sus scripts) y
 * permite sólo scripts propios. `style-src` deja `'unsafe-inline'` porque React
 * y Tailwind usan atributos/etiquetas de estilo inline. Función pura para TDD.
 */

/**
 * Arma el header CSP para un nonce dado.
 *
 * @param nonce Nonce base64 generado por request.
 * @param isDev En desarrollo se permite `'unsafe-eval'` (Fast Refresh) y se
 *   omite `upgrade-insecure-requests` para no romper localhost.
 * @return Valor del header `Content-Security-Policy`.
 */
export function buildCspPolicy(nonce: string, isDev = false): string
{
  const scripts = ["'self'", `'nonce-${nonce}'`];

  if (isDev)
  {
    scripts.push("'unsafe-eval'");
  }

  const directives = [
    "default-src 'self'",
    `script-src ${scripts.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https:",
    "object-src 'none'",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
  ];

  if (!isDev)
  {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
}
