"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { createNoncePair } from "@/lib/auth/google-identity";
import type { GoogleCredentialResponse } from "@/lib/auth/google-identity";
import { loadGoogleIdentityServices } from "@/lib/auth/google-gis-loader";
import { sanitizeNextPath } from "@/lib/auth/oauth";
import { getSupabaseBrowser } from "@/lib/supabase/client";

export interface SocialLoginButtonProps
{
  readonly label: string;
  readonly errorLabel?: string;
  readonly next?: string;
  readonly clientId: string;
}

/**
 * Botón de Google Identity Services que canjea el ID token en Supabase.
 *
 * @param props Etiqueta accesible, mensaje de error y destino `next` opcional.
 * @return Contenedor del botón oficial de Google y sus errores.
 */
export default function SocialLoginButton(props: SocialLoginButtonProps)
{
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const nonceRef = useRef<string | null>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const clientId = props.clientId;

  const handleCredential = useCallback(async (response: GoogleCredentialResponse) =>
  {
    setPending(true);
    setFailed(false);

    try
    {
      const supabase = getSupabaseBrowser();
      const { error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: response.credential,
        nonce: nonceRef.current ?? undefined,
      });

      if (error !== null)
      {
        throw error;
      }

      router.replace(sanitizeNextPath(props.next ?? null) ?? "/");
    }
    catch (cause)
    {
      console.error("No se pudo iniciar sesión con Google:", cause);
      setFailed(true);
    }
    finally
    {
      setPending(false);
    }
  }, [props.next, router]);

  useEffect(() =>
  {
    let cancelled = false;

    async function initialize(): Promise<void>
    {
      if (typeof clientId !== "string" || clientId.trim().length === 0)
      {
        setFailed(true);

        return;
      }

      try
      {
        await loadGoogleIdentityServices();
      }
      catch
      {
        if (!cancelled)
        {
          setFailed(true);
        }

        return;
      }

      if (cancelled || buttonRef.current === null)
      {
        return;
      }

      const pair = await createNoncePair();
      const googleId = window.google?.accounts?.id;

      if (cancelled || googleId === undefined)
      {
        setFailed(true);

        return;
      }

      nonceRef.current = pair.raw;
      googleId.initialize({
        client_id: clientId,
        callback: (response) =>
        {
          void handleCredential(response);
        },
        nonce: pair.hashed,
        use_fedcm_for_prompt: true,
      });
      googleId.renderButton(buttonRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "rectangular",
        width: 320,
      });
    }

    void initialize();

    return () =>
    {
      cancelled = true;
      window.google?.accounts?.id?.cancel?.();
    };
  }, [clientId, handleCredential]);

  return (
    <div className="space-y-2">
      <div
        ref={buttonRef}
        role="group"
        aria-label={props.label}
        aria-busy={pending}
        className="flex min-h-10 w-full justify-center"
      />
      {failed && props.errorLabel !== undefined && (
        <p role="alert" className="text-sm text-danger bg-rose-500/10 border border-rose-500/30 rounded-xl p-3">
          {props.errorLabel}
        </p>
      )}
    </div>
  );
}
