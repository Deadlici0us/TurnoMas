"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { buildBusinessUrl } from "@/lib/onboarding/slug";
import { createBusiness } from "@/app/onboarding/actions";
import { resolverTimezoneNegocio } from "@/lib/timezone/timezone";

const DEFAULT_COUNTRY = "ar";

export default function OnboardingWizard()
{
  const t = useTranslations("common");
  const [nombre, setNombre] = useState("Barbería Diego");
  const [pais, setPais] = useState(DEFAULT_COUNTRY);
  const [paso, setPaso] = useState(1);
  const [mpConectado, setMpConectado] = useState(false);
  const [waConectado, setWaConectado] = useState(false);
  const [gcalConectado, setGcalConectado] = useState(false);

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
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8 space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">{t("onboarding.title")}</h1>
          <p className="text-sm text-slate-600">{t("onboarding.subtitle")}</p>
        </div>

        {paso === 1 && (
          <section className="space-y-4">
            <h2 className="font-semibold text-slate-900">{t("onboarding.step1Title")}</h2>
            <p className="text-sm text-slate-600">{t("onboarding.step1Desc")}</p>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {t("auth.businessName")}
              </label>
              <input
                value={nombre}
                onChange={(event) => setNombre(event.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none
                  focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {t("onboarding.country")}
              </label>
              <select
                value={pais}
                onChange={(event) => setPais(event.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none
                  focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="ar">Argentina (ar)</option>
                <option value="mx">México (mx)</option>
              </select>
            </div>
            <p className="text-sm text-slate-600">
              {t("onboarding.urlPreview")}:{" "}
              <span className="font-mono font-semibold text-slate-900">{preview}</span>
            </p>
            <button
              onClick={() => setPaso(2)}
              className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg
                hover:bg-blue-700 transition-colors"
            >
              {t("onboarding.step2Title")}
            </button>
          </section>
        )}

        {paso === 2 && (
          <section className="space-y-4">
            <h2 className="font-semibold text-slate-900">{t("onboarding.step2Title")}</h2>
            <p className="text-sm text-slate-600">{t("onboarding.step2Desc")}</p>
            <button
              onClick={() => setMpConectado(true)}
              className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg
                hover:bg-blue-700 transition-colors"
            >
              {mpConectado ? "✓ " : ""}{t("onboarding.connectMp")}
            </button>
            <div className="flex gap-3">
              <button
                onClick={() => setPaso(1)}
                className="flex-1 border border-slate-300 text-slate-700 font-semibold py-3
                  rounded-lg hover:bg-slate-50 transition-colors"
              >
                ←
              </button>
              <button
                onClick={() => setPaso(3)}
                className="flex-1 border border-slate-300 text-slate-700 font-semibold py-3
                  rounded-lg hover:bg-slate-50 transition-colors"
              >
                {t("onboarding.skipMp")}
              </button>
            </div>
          </section>
        )}

        {paso === 3 && (
          <section className="space-y-4">
            <h2 className="font-semibold text-slate-900">{t("onboarding.step3Title")}</h2>
            <p className="text-sm text-slate-600">{t("onboarding.step3Desc")}</p>
            <button
              onClick={() => setWaConectado(true)}
              className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg
                hover:bg-blue-700 transition-colors"
            >
              {waConectado ? "✓ " : ""}{t("onboarding.connectWa")}
            </button>
            <div className="flex gap-3">
              <button
                onClick={() => setPaso(2)}
                className="flex-1 border border-slate-300 text-slate-700 font-semibold py-3
                  rounded-lg hover:bg-slate-50 transition-colors"
              >
                ←
              </button>
              <button
                onClick={() => setPaso(4)}
                className="flex-1 border border-slate-300 text-slate-700 font-semibold py-3
                  rounded-lg hover:bg-slate-50 transition-colors"
              >
                {t("onboarding.skipWa")}
              </button>
            </div>
          </section>
        )}

        {paso === 4 && (
          <section className="space-y-4">
            <h2 className="font-semibold text-slate-900">{t("onboarding.step4Title")}</h2>
            <p className="text-sm text-slate-600">{t("onboarding.step4Desc")}</p>
            <button
              onClick={() => setGcalConectado(true)}
              className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg
                hover:bg-blue-700 transition-colors"
            >
              {gcalConectado ? "✓ " : ""}{t("onboarding.connectGcal")}
            </button>
            <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-3">
              {t("onboarding.trialNote")}
            </p>
            <form action={createBusiness} className="space-y-4">
              <input type="hidden" name="nombre" value={nombre} />
              <input type="hidden" name="pais" value={pais} />
              <input type="hidden" name="timezone" value={timezoneDetectada} />
              <p className="text-xs text-slate-500">Zona horaria detectada: {timezoneDetectada}.</p>
              <button
                type="submit"
                className="block text-center w-full bg-blue-600 text-white font-semibold py-3
                  rounded-lg hover:bg-blue-700 transition-colors"
              >
                {t("onboarding.finish")}
              </button>
            </form>
            <button
              onClick={() => setPaso(3)}
              className="w-full border border-slate-300 text-slate-700 font-semibold py-3
                rounded-lg hover:bg-slate-50 transition-colors"
            >
              ←
            </button>
          </section>
        )}
      </div>
    </div>
  );
}
