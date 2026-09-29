"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { estimateMonthlyLoss } from "@/lib/onboarding/loss-calculator";

function toNumber(value: string, fallback: number): number
{
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function LossCalculator()
{
  const t = useTranslations("common");
  const [turnos, setTurnos] = useState("20");
  const [valor, setValor] = useState("15000");
  const [tasa, setTasa] = useState("20");

  let perdida = 0;

  try
  {
    perdida = estimateMonthlyLoss({
      turnosPorSemana: toNumber(turnos, 0),
      valorPromedio: toNumber(valor, 0),
      tasaAusencia: toNumber(tasa, 0) / 100,
    });
  }
  catch
  {
    perdida = 0;
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-8 py-16">
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-2 text-center">{t("calculator.title")}</h2>
        <p className="text-slate-600 text-center mb-8">{t("calculator.subtitle")}</p>
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t("calculator.weeklyBookings")}
            </label>
            <input
              inputMode="numeric"
              value={turnos}
              onChange={(event) => setTurnos(event.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none
                focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t("calculator.avgValue")}
            </label>
            <input
              inputMode="numeric"
              value={valor}
              onChange={(event) => setValor(event.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none
                focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t("calculator.absenceRate")}
            </label>
            <input
              inputMode="numeric"
              value={tasa}
              onChange={(event) => setTasa(event.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none
                focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        <p className="text-center text-lg text-slate-700">
          {t("calculator.resultPrefix")}{" "}
          <span className="font-bold text-red-600">$ {perdida.toLocaleString("es-AR")}</span>{" "}
          {t("calculator.resultSuffix")}
        </p>
      </div>
    </div>
  );
}
