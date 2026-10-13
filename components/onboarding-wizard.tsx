"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { buildBusinessUrl } from "@/lib/onboarding/slug";
import { createBusiness } from "@/app/onboarding/actions";
import { resolverTimezoneNegocio } from "@/lib/timezone/timezone";

const DEFAULT_COUNTRY = "ar";

/** Paso inicial desde la query (?paso=2 al volver de crear el negocio). */
function pasoInicial(params: URLSearchParams): number
{
  const crudo = Number(params.get("paso"));

  if (!Number.isInteger(crudo) || crudo < 1 || crudo > 4)
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
  const [waConectado, setWaConectado] = useState(false);
  const [gcalConectado, setGcalConectado] = useState(false);

  const mpOk = params.get("mp") === "ok";
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
      <div className="animate-reveal-up rounded-2xl border border-white/10 bg-white/5 p-8 space-y-8
        backdrop-blur-xl shadow-[0_8px_40px_-12px_rgba(0,0,0,0.6)]">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">{t("onboarding.title")}</h1>
          <p className="text-sm text-slate-400">{t("onboarding.subtitle")}</p>
        </div>

        {paso === 1 && (
          <form action={createBusiness} className="space-y-4">
            <h2 className="font-semibold text-white">{t("onboarding.step1Title")}</h2>
            <p className="text-sm text-slate-400">{t("onboarding.step1Desc")}</p>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                {t("auth.businessName")}
              </label>
              <input
                name="nombre"
                value={nombre}
                onChange={(event) => setNombre(event.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white rounded-xl outline-none
                  focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                {t("onboarding.country")}
              </label>
              <select
                name="pais"
                value={pais}
                onChange={(event) => setPais(event.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white rounded-xl outline-none
                  focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition"
              >
                <option value="ar">Argentina (ar)</option>
                <option value="mx">México (mx)</option>
              </select>
            </div>
            <p className="text-sm text-slate-400">
              {t("onboarding.urlPreview")}:{" "}
              <span className="font-mono font-semibold text-white">{preview}</span>
            </p>
            <input type="hidden" name="timezone" value={timezoneDetectada} />
            <p className="text-xs text-slate-400">Zona horaria detectada: {timezoneDetectada}.</p>
            <button
              type="submit"
              className="group relative w-full overflow-hidden bg-brand-600 text-white font-semibold py-3
                rounded-xl hover:bg-brand-500 transition-all duration-300"
            >
              <span className="animate-shimmer pointer-events-none absolute inset-y-0 w-1/3
                bg-gradient-to-r from-transparent via-white/30 to-transparent" aria-hidden="true" />
              {t("onboarding.crearNegocio")}
            </button>
          </form>
        )}

        {paso === 2 && (
          <section className="space-y-4">
            <h2 className="font-semibold text-white">{t("onboarding.step2Title")}</h2>
            <p className="text-sm text-slate-400">{t("onboarding.step2Desc")}</p>
            {mpOk ? (
              <>
                <p className="text-sm font-semibold text-emerald-300 bg-emerald-500/10 border
                  border-emerald-500/30 rounded-xl p-3">
                  {"✓ "}{t("onboarding.mpConectado")}
                </p>
                <button
                  onClick={() => setPaso(3)}
                  className="w-full bg-brand-600 text-white font-semibold py-3 rounded-xl
                    hover:bg-brand-500 transition-colors"
                >
                  {t("onboarding.continuar")}
                </button>
              </>
            ) : (
              <>
                <Link
                  href={mpAuthorizeHref}
                  className="block text-center w-full bg-brand-600 text-white font-semibold py-3
                    rounded-xl hover:bg-brand-500 transition-colors"
                >
                  {t("onboarding.connectMp")}
                </Link>
                <p className="text-xs text-slate-400 bg-white/5 border border-white/10 rounded-xl p-3">
                  {t("onboarding.mpObligatorio")}
                </p>
              </>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setPaso(1)}
                className="flex-1 border border-white/15 text-slate-200 font-semibold py-3
                  rounded-xl hover:bg-white/10 transition-colors"
              >
                ←
              </button>
            </div>
          </section>
        )}

        {paso === 3 && (
          <section className="space-y-4">
            <h2 className="font-semibold text-white">{t("onboarding.step3Title")}</h2>
            <p className="text-sm text-slate-400">{t("onboarding.step3Desc")}</p>
            <button
              onClick={() => setWaConectado(true)}
              className="w-full bg-brand-600 text-white font-semibold py-3 rounded-xl
                hover:bg-brand-500 transition-colors"
            >
              {waConectado ? "✓ " : ""}{t("onboarding.connectWa")}
            </button>
            <div className="flex gap-3">
              <button
                onClick={() => setPaso(2)}
                className="flex-1 border border-white/15 text-slate-200 font-semibold py-3
                  rounded-xl hover:bg-white/10 transition-colors"
              >
                ←
              </button>
              <button
                onClick={() => setPaso(4)}
                className="flex-1 border border-white/15 text-slate-200 font-semibold py-3
                  rounded-xl hover:bg-white/10 transition-colors"
              >
                {t("onboarding.skipWa")}
              </button>
            </div>
          </section>
        )}

        {paso === 4 && (
          <section className="space-y-4">
            <h2 className="font-semibold text-white">{t("onboarding.step4Title")}</h2>
            <p className="text-sm text-slate-400">{t("onboarding.step4Desc")}</p>
            <button
              onClick={() => setGcalConectado(true)}
              className="w-full bg-brand-600 text-white font-semibold py-3 rounded-xl
                hover:bg-brand-500 transition-colors"
            >
              {gcalConectado ? "✓ " : ""}{t("onboarding.connectGcal")}
            </button>
            <p className="text-xs text-slate-400 bg-white/5 border border-white/10 rounded-xl p-3">
              {t("onboarding.trialNote")}
            </p>
            <Link
              href="/dashboard"
              className="block text-center w-full bg-brand-600 text-white font-semibold py-3
                rounded-xl hover:bg-brand-500 transition-colors"
            >
              {t("onboarding.finish")}
            </Link>
            <button
              onClick={() => setPaso(3)}
              className="w-full border border-white/15 text-slate-200 font-semibold py-3
                rounded-xl hover:bg-white/10 transition-colors"
            >
              ←
            </button>
          </section>
        )}
      </div>
    </div>
  );
}
