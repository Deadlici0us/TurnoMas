"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { buildBusinessUrl } from "@/lib/onboarding/slug";
import { createBusiness, saveBusinessWhatsapp } from "@/app/onboarding/actions";
import { resolverTimezoneNegocio } from "@/lib/timezone/timezone";
import { HORARIOS_POR_DEFECTO } from "@/lib/staff/validation";
import EditorHorariosSemanales from "./editor-horarios-semanales";

const DEFAULT_COUNTRY = "ar";

/** Paso inicial desde la query (?paso=2 al volver de crear el negocio). */
function pasoInicial(params: URLSearchParams): number
{
  const crudo = Number(params.get("paso"));

  if (!Number.isInteger(crudo) || crudo < 1 || crudo > 3)
  {
    return 1;
  }

  return crudo;
}

export default function OnboardingWizard()
{
  const t = useTranslations("common");
  const params = useSearchParams();
  const [nombre, setNombre] = useState("Barbería Diego");
  const [pais, setPais] = useState(DEFAULT_COUNTRY);
  const [paso, setPaso] = useState(() => pasoInicial(params));

  const mpOk = params.get("mp") === "ok";
  const errorPaso3 = params.get("error");
  const mpAuthorizeHref = `/api/integrations/mercadopago/authorize?next=${
    encodeURIComponent("/onboarding?paso=2&mp=ok")}`;

  let preview = "";

  let timezoneDetectada = "";

  try
  {
    timezoneDetectada = resolverTimezoneNegocio(
      { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, pais });
  }
  catch
  {
    timezoneDetectada = resolverTimezoneNegocio({ pais });
  }

  try
  {
    preview = buildBusinessUrl(pais, nombre);
  }
  catch
  {
    preview = "/ar/tu-negocio";
  }

  return (
    <div className="max-w-xl w-full px-8 py-12">
      <div data-reveal="true" className="ui-card space-y-8 p-6 sm:p-8">
        <div className="text-center">
          <h1 className="ui-page-title">{t("onboarding.title")}</h1>
          <p className="ui-page-subtitle mx-auto">{t("onboarding.subtitle")}</p>
        </div>
        <ol className="grid grid-cols-3 gap-2" aria-label="Progreso del onboarding">
          {[1, 2, 3].map((n) => (
            <li
              key={n}
              className={`h-1.5 rounded-full transition-colors duration-300
                ${n <= paso ? "bg-primary" : "bg-line"}`}
            />
          ))}
        </ol>

        {paso === 1 && (
          <form action={createBusiness} className="space-y-4">
            <h2 className="ui-section-title">{t("onboarding.step1Title")}</h2>
            <p className="text-sm text-muted-foreground">{t("onboarding.step1Desc")}</p>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">
                {t("auth.businessName")}
              </label>
              <input
                name="nombre"
                value={nombre}
                onChange={(event) => setNombre(event.target.value)}
                className="ui-input h-11"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">
                {t("onboarding.country")}
              </label>
              <select
                name="pais"
                value={pais}
                onChange={(event) => setPais(event.target.value)}
                className="ui-input h-11"
              >
                <option value="ar">Argentina (ar)</option>
                <option value="mx">México (mx)</option>
              </select>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("onboarding.urlPreview")}:{" "}
              <span className="font-mono font-semibold text-navy">{preview}</span>
            </p>
            <input type="hidden" name="timezone" value={timezoneDetectada} />
            <p className="text-xs text-muted-foreground">Zona horaria detectada: {timezoneDetectada}.</p>
            <div>
              <p className="block text-sm font-medium text-ink mb-2">
                Horarios del negocio (podés cambiarlos después)
              </p>
              <EditorHorariosSemanales inicial={HORARIOS_POR_DEFECTO} />
            </div>
            <button
              type="submit"
              className="ui-btn ui-btn-primary w-full"
            >
              {t("onboarding.crearNegocio")}
            </button>
          </form>
        )}

        {paso === 2 && (
          <section className="space-y-4">
            <h2 className="ui-section-title">{t("onboarding.step2Title")}</h2>
            <p className="text-sm text-muted-foreground">{t("onboarding.step2Desc")}</p>
            {mpOk ? (
              <>
                <p className="ui-alert ui-alert-success text-sm font-semibold">
                  {"✓ "}{t("onboarding.mpConectado")}
                </p>
                <button
                  onClick={() => setPaso(3)}
                  className="ui-btn ui-btn-primary w-full"
                >
                  {t("onboarding.continuar")}
                </button>
              </>
            ) : (
              <>
                <Link
                  href={mpAuthorizeHref}
                  className="ui-btn ui-btn-primary w-full"
                >
                  {t("onboarding.connectMp")}
                </Link>
                <p className="ui-alert ui-alert-info text-xs">
                  {t("onboarding.mpObligatorio")}
                </p>
              </>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setPaso(1)}
                className="ui-btn ui-btn-outline w-full"
              >
                ←
              </button>
            </div>
          </section>
        )}

        {paso === 3 && (
          <section className="space-y-4">
            <h2 className="ui-section-title">{t("onboarding.step3Title")}</h2>
            <p className="text-sm text-muted-foreground">{t("onboarding.step3Desc")}</p>
            {errorPaso3 === "whatsapp" && (
              <p role="alert" className="ui-alert ui-alert-danger text-sm font-semibold">
                {t("onboarding.whatsappError")}
              </p>
            )}
            {errorPaso3 === "guardado" && (
              <p role="alert" className="ui-alert ui-alert-danger text-sm font-semibold">
                {t("onboarding.whatsappGuardadoError")}
              </p>
            )}
            {errorPaso3 === "inesperado" && (
              <p role="alert" className="ui-alert ui-alert-danger text-sm font-semibold">
                {t("onboarding.unexpectedError")}
              </p>
            )}
            <form action={saveBusinessWhatsapp} className="space-y-4">
              <div>
                <label htmlFor="business-whatsapp"
                  className="block text-sm font-medium text-ink mb-1">
                  {t("onboarding.whatsappLabel")}
                </label>
                <input
                  id="business-whatsapp"
                  name="whatsapp"
                  type="tel"
                  required
                  maxLength={25}
                  autoComplete="tel"
                  placeholder={t("onboarding.whatsappPlaceholder")}
                  className="ui-input h-11"
                />
                <p className="text-xs text-muted-foreground mt-2">{t("onboarding.whatsappHelp")}</p>
              </div>
              <button type="submit" className="ui-btn ui-btn-primary w-full">
                {t("onboarding.guardarWhatsapp")}
              </button>
              <button type="button" onClick={() => setPaso(2)} className="ui-btn ui-btn-outline w-full">
                ←
              </button>
            </form>
            <p className="ui-alert ui-alert-info text-xs">
              {t("onboarding.trialNote")}
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
