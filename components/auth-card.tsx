import type { ReactNode } from "react";

export interface AuthCardProps
{
  readonly title: string;
  readonly subtitle: string;
  readonly error?: string | null;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
}

/**
 * Tarjeta común de login/register para que ambos flujos no deriven.
 * Mismo layout, mismo tratamiento de errores y mismo pie.
 */
export default function AuthCard({ title, subtitle, error, children, footer }: AuthCardProps)
{
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="max-w-md w-full px-8 py-12">
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8 space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">{title}</h1>
            <p className="text-sm text-slate-600">{subtitle}</p>
          </div>
          {error !== undefined && error !== null && error.length > 0 && (
            <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              {error}
            </p>
          )}
          {children}
          {footer !== undefined && (
            <div className="text-center text-sm">{footer}</div>
          )}
        </div>
      </div>
    </div>
  );
}
