import Link from "next/link";

import { resetDemoData } from "@/app/dashboard/demo/actions";

/**
 * Banner informativo para la cuenta demo editable.
 *
 * @return Banner azul con explicación, botón de restablecer y CTA a registro.
 */
export default function DemoEditableBanner()
{
  return (
    <div className="mb-6 ui-alert ui-alert-info p-4 text-sm">
      <p className="font-semibold text-[#0b6e93]">
        Estás en la cuenta demo: podés crear, editar y eliminar datos.
      </p>
      <p className="mt-1 text-[#0b6e93]">
        Los cambios son públicos y se pierden al restablecer. Usala para probar sin riesgo.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <form action={resetDemoData}>
          <button
            type="submit"
            className="ui-btn ui-btn-outline ui-btn-sm"
          >
            Restablecer datos demo
          </button>
        </form>
        <Link
          href="/register"
          className="ui-btn ui-btn-primary ui-btn-sm"
        >
          Creá tu cuenta gratis
        </Link>
      </div>
    </div>
  );
}
