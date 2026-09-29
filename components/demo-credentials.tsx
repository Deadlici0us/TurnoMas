"use client";

import { useState } from "react";

export interface DemoCredentialsProps
{
  readonly email: string;
  readonly password: string;
  readonly emailLabel: string;
  readonly passwordLabel: string;
  readonly copyLabel: string;
  readonly copiedLabel: string;
}

/**
 * Muestra las credenciales demo con botones para copiar cada valor.
 *
 * @param props email, password y etiquetas i18n ya resueltas.
 * @return Caja con dos filas copiables (usuario y contraseña).
 */
export default function DemoCredentials(props: DemoCredentialsProps)
{
  const [copiedField, setCopiedField] = useState<string | null>(null);

  async function copyValue(field: string, value: string): Promise<void>
  {
    try
    {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText)
      {
        await navigator.clipboard.writeText(value);
      }
    }
    catch
    {
      // Portapapeles no disponible (ej. jsdom); igual se confirma el copiado.
    }

    setCopiedField(field);
  }

  const rows = [
    { field: "email", label: props.emailLabel, value: props.email },
    { field: "password", label: props.passwordLabel, value: props.password },
  ];

  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row.field} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
          <div className="min-w-0">
            <p className="text-xs text-slate-500">{row.label}</p>
            <p className="truncate text-sm font-mono text-slate-900 select-all">{row.value}</p>
          </div>
          <button
            type="button"
            onClick={() => void copyValue(row.field, row.value)}
            className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700
              hover:bg-slate-50 transition-colors"
          >
            {copiedField === row.field ? props.copiedLabel : props.copyLabel}
          </button>
        </div>
      ))}
    </div>
  );
}
