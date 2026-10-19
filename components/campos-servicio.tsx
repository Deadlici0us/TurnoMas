"use client";

import { useState } from "react";

export interface CamposServicioValue
{
  readonly nombre?: string;
  readonly duracion_min?: number;
  readonly precio_base?: number;
  readonly precio_promocional?: number | null;
  readonly sena_requerida?: boolean;
  readonly sena_porcentaje?: number;
  readonly remarketing?: boolean | null;
  readonly remarketing_dias?: number | null;
}

/**
 * Campos de crear/editar servicio con tildes de seña y promo.
 * Cuando el tilde está apagado, el valor se grisa y deshabilita;
 * el backend ignora el número (seña → 0/confirmado, promo → null).
 */
export default function CamposServicio({ servicio }: { readonly servicio?: CamposServicioValue })
{
  const [exigeSena, setExigeSena] = useState(servicio?.sena_requerida ?? true);
  const [promoActiva, setPromoActiva] = useState(servicio?.precio_promocional !== null
    && servicio?.precio_promocional !== undefined);
  const [remarketingActivo, setRemarketingActivo] = useState(servicio?.remarketing !== false);

  const inputBase = "ui-input mt-1";
  const inputDeshabilitado = "opacity-60";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <label className="block ui-label sm:col-span-2">
        {"Nombre"}
        <input
          type="text"
          name="nombre"
          required
          minLength={2}
          maxLength={80}
          defaultValue={servicio?.nombre ?? ""}
          className={inputBase}
        />
      </label>
      <label className="block ui-label">
        {"Duración (min)"}
        <input
          type="number"
          name="duracionMin"
          required
          min={1}
          defaultValue={servicio?.duracion_min ?? 30}
          className={inputBase}
        />
      </label>
      <label className="block ui-label">
        {"Precio base"}
        <input
          type="number"
          name="precioBase"
          required
          min={1}
          defaultValue={servicio?.precio_base ?? ""}
          placeholder="Ej: 15000"
          className={inputBase}
        />
      </label>
      <div className="block ui-label">
        <label className="flex items-center gap-2 mb-1">
          <input
            type="checkbox"
            name="promoActiva"
            checked={promoActiva}
            onChange={(event) => setPromoActiva(event.target.checked)}
            className="ui-checkbox"
          />
          {"Precio promo"}
        </label>
        <input
          type="number"
          name="precioPromocional"
          min={1}
          disabled={!promoActiva}
          defaultValue={servicio?.precio_promocional ?? ""}
          placeholder={promoActiva ? "Ej: 12000" : "Activá el tilde para usar promo"}
          className={`${inputBase}${promoActiva ? "" : inputDeshabilitado}`}
        />
      </div>
      <label className="flex items-center gap-2 ui-label">
        <input
          type="checkbox"
          name="senaRequerida"
          checked={exigeSena}
          onChange={(event) => setExigeSena(event.target.checked)}
          className="ui-checkbox"
        />
        {"Exige seña"}
      </label>
      <label className="block ui-label">
        {"Seña (%)"}
        <input
          type="number"
          name="senaPorcentaje"
          required={exigeSena}
          min={0}
          max={100}
          disabled={!exigeSena}
          defaultValue={servicio?.sena_porcentaje ?? 50}
          placeholder={exigeSena ? "0 a 100" : "Sin seña"}
          className={`${inputBase}${exigeSena ? "" : inputDeshabilitado}`}
        />
      </label>
      <label className="flex items-center gap-2 ui-label">
        <input
          type="checkbox"
          name="remarketingActivo"
          checked={remarketingActivo}
          onChange={(event) => setRemarketingActivo(event.target.checked)}
          className="ui-checkbox"
        />
        {"Remarketing"}
      </label>
      <label className="block ui-label">
        {"Remarketing (días)"}
        <input
          type="number"
          name="remarketingDias"
          min={1}
          max={90}
          disabled={!remarketingActivo}
          defaultValue={servicio?.remarketing_dias ?? ""}
          placeholder={remarketingActivo ? "Vacío = 30 del negocio" : "Desactivado"}
          className={`${inputBase}${remarketingActivo ? "" : inputDeshabilitado}`}
        />
      </label>
    </div>
  );
}
