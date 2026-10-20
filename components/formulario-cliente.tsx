"use client";

import { useId, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";

import { useToast } from "@/components/ui/use-toast";
import { analizarWhatsappCliente } from "@/lib/clientes/whatsapp";
import { normalizarEmailCliente } from "@/lib/validation/email";

interface ClienteInicial
{
  readonly nombre: string;
  readonly whatsapp: string;
  readonly email: string | null;
}

export interface FormularioClienteProps
{
  readonly action: (formData: FormData) => Promise<void>;
  readonly titulo: string;
  readonly cta: string;
  readonly successMessage: string;
  readonly cliente?: ClienteInicial;
  readonly className?: string;
}

/**
 * Formulario de alta y edición de clientes con validación visible.
 *
 * Muestra el WhatsApp canónico antes de guardar, bloquea caracteres raros y
 * valida el email en el navegador. El servidor vuelve a validar todo.
 *
 * @param props Acción, textos y datos iniciales del cliente.
 * @return Formulario con feedback inline y toast de resultado.
 */
export default function FormularioCliente({
  action,
  titulo,
  cta,
  successMessage,
  cliente,
  className = "ui-card p-5 sm:p-6",
}: FormularioClienteProps)
{
  const router = useRouter();
  const { showToast } = useToast();
  const id = useId();
  const [nombre, setNombre] = useState(cliente?.nombre ?? "");
  const [whatsapp, setWhatsapp] = useState(cliente?.whatsapp ?? "");
  const [email, setEmail] = useState(cliente?.email ?? "");
  const [errorNombre, setErrorNombre] = useState<string | null>(null);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [pendiente, setPendiente] = useState(false);

  const analisisWhatsapp = analizarWhatsappCliente(whatsapp);
  const errorWhatsapp = whatsapp.trim().length > 0 && !analisisWhatsapp.ok
    ? analisisWhatsapp.error
    : null;
  let emailNormalizado: string | null = null;
  let errorEmail: string | null = null;

  try
  {
    emailNormalizado = normalizarEmailCliente(email);
  }
  catch (error)
  {
    errorEmail = error instanceof Error ? error.message : "Revisá el email del cliente.";
  }

  const whatsappCanonico = analisisWhatsapp.ok ? analisisWhatsapp.valor : null;
  const mostrarPreviewWhatsapp = whatsappCanonico !== null
    && whatsapp.trim().length > 0
    && whatsappCanonico !== whatsapp.trim();
  const mostrarPreviewEmail = emailNormalizado !== null && emailNormalizado !== email;

  async function enviar(event: FormEvent<HTMLFormElement>): Promise<void>
  {
    event.preventDefault();

    if (pendiente)
    {
      return;
    }

    setErrorGeneral(null);
    const nombreLimpio = nombre.trim();

    if (nombreLimpio.length < 2 || nombreLimpio.length > 80)
    {
      setErrorNombre("El nombre tiene que tener entre 2 y 80 caracteres.");
      return;
    }

    setErrorNombre(null);

    if (!analisisWhatsapp.ok)
    {
      return;
    }

    if (errorEmail !== null)
    {
      return;
    }

    setPendiente(true);
    const datos = new FormData();
    datos.set("nombre", nombreLimpio);
    datos.set("whatsapp", analisisWhatsapp.valor);
    datos.set("email", emailNormalizado ?? "");

    try
    {
      await action(datos);
      setWhatsapp(analisisWhatsapp.valor);
      setEmail(emailNormalizado ?? "");
      showToast({ tone: "success", title: "Listo", message: successMessage });

      if (cliente === undefined)
      {
        setNombre("");
        setWhatsapp("");
        setEmail("");
      }

      router.refresh();
    }
    catch (error)
    {
      const mensaje = error instanceof Error && error.message.length > 0
        ? error.message
        : "No pudimos guardar el cliente. Probá de nuevo.";
      setErrorGeneral(mensaje);
      showToast({ tone: "error", title: "No se pudo guardar", message: mensaje });
    }
    finally
    {
      setPendiente(false);
    }
  }

  return (
    <form onSubmit={(event) => { void enviar(event); }} noValidate className={className}>
      <h2 className="ui-section-title mb-4">{titulo}</h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div>
          <label htmlFor={`${id}-nombre`} className="ui-label mb-1">Nombre</label>
          <input
            id={`${id}-nombre`}
            name="nombre"
            type="text"
            required
            minLength={2}
            maxLength={80}
            autoComplete="name"
            placeholder="Nombre y apellido"
            value={nombre}
            onChange={(event) => setNombre(event.target.value)}
            aria-invalid={errorNombre !== null}
            className="ui-input"
          />
          {errorNombre !== null ? <p className="ui-error mt-1" role="alert">{errorNombre}</p> : null}
        </div>
        <div>
          <label htmlFor={`${id}-whatsapp`} className="ui-label mb-1">WhatsApp</label>
          <input
            id={`${id}-whatsapp`}
            name="whatsapp"
            type="tel"
            required
            inputMode="tel"
            autoComplete="tel"
            placeholder="+54 9 11 6453-4124"
            value={whatsapp}
            onChange={(event) => setWhatsapp(event.target.value)}
            aria-invalid={errorWhatsapp !== null}
            aria-describedby={`${id}-whatsapp-ayuda`}
            className="ui-input"
          />
          <div id={`${id}-whatsapp-ayuda`} className="mt-1">
            {errorWhatsapp !== null ? (
              <p className="ui-error" role="alert">{errorWhatsapp}</p>
            ) : mostrarPreviewWhatsapp ? (
              <p className="ui-hint">
                Se guardará como <span className="font-semibold text-ink">{whatsappCanonico}</span>
              </p>
            ) : (
              <p className="ui-hint">Acepta +54 9 11 15..., +54 11... o 11...</p>
            )}
          </div>
        </div>
        <div>
          <label htmlFor={`${id}-email`} className="ui-label mb-1">Email (opcional)</label>
          <input
            id={`${id}-email`}
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            spellCheck={false}
            maxLength={254}
            placeholder="nombre@dominio.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={errorEmail !== null}
            aria-describedby={`${id}-email-ayuda`}
            className="ui-input"
          />
          <div id={`${id}-email-ayuda`} className="mt-1">
            {errorEmail !== null ? (
              <p className="ui-error" role="alert">{errorEmail}</p>
            ) : mostrarPreviewEmail ? (
              <p className="ui-hint">
                Se guardará como <span className="font-semibold text-ink">{emailNormalizado}</span>
              </p>
            ) : (
              <p className="ui-hint">Sin espacios ni caracteres raros.</p>
            )}
          </div>
        </div>
      </div>
      {errorGeneral !== null ? (
        <p className="ui-alert ui-alert-danger mt-4" role="alert">{errorGeneral}</p>
      ) : null}
      <div className="mt-4 flex items-center gap-3">
        <button type="submit" disabled={pendiente} className="ui-btn ui-btn-primary">
          {pendiente ? (
            <>
              <span className="ui-spinner" aria-hidden="true" />
              Guardando...
            </>
          ) : cta}
        </button>
      </div>
    </form>
  );
}
