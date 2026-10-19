"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { agruparMiles } from "@/lib/dashboard/moneda";
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
    <div className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="animate-reveal-up ui-card p-6 sm:p-8">
        <h2 className="text-center font-heading text-2xl font-extrabold text-navy">
          {t("calculator.title")}
        </h2>
        <p className="mt-2 mb-8 text-center text-muted-foreground">{t("calculator.subtitle")}</p>
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="ui-label mb-1">
              {t("calculator.weeklyBookings")}
            </label>
            <input
              inputMode="numeric"
              value={turnos}
              onChange={(event) => setTurnos(event.target.value)}
              className="ui-input h-11"
            />
          </div>
          <div>
            <label className="ui-label mb-1">
              {t("calculator.avgValue")}
            </label>
            <input
              inputMode="numeric"
              value={valor}
              onChange={(event) => setValor(event.target.value)}
              className="ui-input h-11"
            />
          </div>
          <div>
            <label className="ui-label mb-1">
              {t("calculator.absenceRate")}
            </label>
            <input
              inputMode="numeric"
              value={tasa}
              onChange={(event) => setTasa(event.target.value)}
              className="ui-input h-11"
            />
          </div>
        </div>
        <p className="mt-2 rounded-lg bg-surface p-4 text-center text-lg text-ink">
          {t("calculator.resultPrefix")}{" "}
          <span className="font-bold text-danger">$ {agruparMiles(Math.round(perdida))}</span>{" "}
          {t("calculator.resultSuffix")}
        </p>
      </div>
    </div>
  );
}
