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
    <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm">
      <p className="font-semibold text-blue-900">
        Estás en la cuenta demo: podés crear, editar y eliminar datos.
      </p>
      <p className="mt-1 text-blue-800">
        Los cambios son públicos y se pierden al restablecer. Usala para probar sin riesgo.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <form action={resetDemoData}>
          <button
            type="submit"
            className="inline-block rounded-lg border border-blue-300 px-4 py-2 text-xs font-semibold
              text-blue-700 hover:bg-blue-100 transition-colors"
          >
            Restablecer datos demo
          </button>
        </form>
        <Link
          href="/register"
          className="inline-block rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white
            hover:bg-blue-700 transition-colors"
        >
          Creá tu cuenta gratis
        </Link>
      </div>
    </div>
  );
}
