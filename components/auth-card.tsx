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
    <div className="min-h-screen flex items-center justify-center bg-transparent">
      <div className="max-w-md w-full px-8 py-12">
        <div className="animate-reveal-up rounded-2xl border border-white/10 bg-white/5 p-8 space-y-6
          backdrop-blur-xl shadow-[0_8px_40px_-12px_rgba(0,0,0,0.6)]">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-2">{title}</h1>
            <p className="text-sm text-slate-400">{subtitle}</p>
          </div>
          {error !== undefined && error !== null && error.length > 0 && (
            <p role="alert" className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl p-3">
              {error}
            </p>
          )}
          {children}
          {footer !== undefined && (
            <div className="text-center text-sm text-slate-400">{footer}</div>
          )}
        </div>
      </div>
    </div>
  );
}
