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
    <div className="flex min-h-[calc(100vh-60px)] items-center justify-center bg-surface px-4 py-10">
      <div className="w-full max-w-md">
        <div className="animate-reveal-up ui-card space-y-6 p-6 sm:p-8">
          <div className="text-center">
            <h1 className="ui-page-title">{title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
          </div>
          {error !== undefined && error !== null && error.length > 0 && (
            <p role="alert" className="ui-alert ui-alert-danger">{error}</p>
          )}
          {children}
          {footer !== undefined && (
            <div className="text-center text-sm text-muted-foreground">{footer}</div>
          )}
        </div>
      </div>
    </div>
  );
}
