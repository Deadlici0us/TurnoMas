"use client";

import { useState } from "react";

import { getSupabaseBrowser } from "@/lib/supabase/client";

export interface SocialLoginButtonProps
{
  readonly label: string;
  readonly errorLabel?: string;
  readonly next?: string;
}

/**
 * Botón de login social con Google vía Supabase OAuth.
 *
 * @param props Etiqueta visible, mensaje de error y destino `next` opcional.
 * @return Botón que redirige al proveedor OAuth y muestra errores.
 */
export default function SocialLoginButton(props: SocialLoginButtonProps)
{
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function startOAuth(): Promise<void>
  {
    setPending(true);
    setFailed(false);

    try
    {
      const origin = window.location.origin.replace(/\/+$/, "");
      const callback = `${origin}/auth/callback`;
      const redirectTo = props.next === undefined || props.next.trim().length === 0
        ? callback
        : `${callback}?next=${encodeURIComponent(props.next.trim())}`;
      const supabase = getSupabaseBrowser();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: { access_type: "offline", prompt: "consent" },
        },
      });

      if (error !== null)
      {
        setFailed(true);
      }
    }
    catch
    {
      setFailed(true);
    }
    finally
    {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => void startOAuth()}
        className="w-full flex items-center justify-center gap-2 border border-slate-300 bg-white
          text-slate-700 font-semibold py-3 rounded-lg hover:bg-slate-50 transition-colors
          disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
          />
          <path
            fill="#34A853"
            d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"
          />
          <path
            fill="#FBBC05"
            d="M3.97 10.72a5.41 5.41 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"
          />
          <path
            fill="#EA4335"
            d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.9 11.42 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
          />
        </svg>
        {pending ? "..." : props.label}
      </button>
      {failed && props.errorLabel !== undefined && (
        <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
          {props.errorLabel}
        </p>
      )}
    </div>
  );
}
