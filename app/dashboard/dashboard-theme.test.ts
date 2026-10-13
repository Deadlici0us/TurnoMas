import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Auditoría estática del tema oscuro unificado del dashboard.
 *
 * El dashboard vive sobre fondo slate-950 (AnimatedBackground + shell
 * oscuro): cualquier isla bg-white o texto slate-900/600 se ve en blanco
 * o se mezcla con el fondo. Este test falla mientras quede una clase
 * clara hardcodeada en el scope del dashboard.
 */

const RAIZ = join(process.cwd(), "app/dashboard");

const COMP_RAIZ = join(process.cwd(), "components");

const LIB_RAIZ = join(process.cwd(), "lib/dashboard");

const PAGINAS = [
  "page.tsx",
  "agenda/page.tsx",
  "staff/page.tsx",
  "servicios/page.tsx",
  "clientes/page.tsx",
  "pagos/page.tsx",
  "config/page.tsx",
  "checkout/page.tsx",
  "facturacion/page.tsx",
];

const COMPONENTES = [
  "../components/agenda-calendar.tsx",
  "../components/agenda-week-grid.tsx",
  "../components/demo-editable-banner.tsx",
  "../components/demo-readonly-banner.tsx",
  "../components/formulario-servicio.tsx",
  "../components/campos-servicio.tsx",
  "../components/copiar-comprobante.tsx",
  "../components/staff-delete-form.tsx",
  "../components/zona-peligro-eliminar.tsx",
  "../components/dashboard-sidebar.tsx",
];

const LIB = ["../../lib/dashboard/estados-colores.ts"];

function leer(rel: string): string
{
  return readFileSync(join(RAIZ, rel), "utf8");
}

function fuentes(): Array<{ nombre: string; contenido: string }>
{
  const salida: Array<{ nombre: string; contenido: string }> = [];

  for (const p of PAGINAS)
  {
    salida.push({ nombre: `app/dashboard/${p}`, contenido: leer(p) });
  }

  for (const c of COMPONENTES)
  {
    salida.push({ nombre: c.replace("../components/", "components/"), contenido: readFileSync(join(COMP_RAIZ, c.split("/").pop() as string), "utf8") });
  }

  for (const l of LIB)
  {
    salida.push({ nombre: l.replace("../../lib/", "lib/"), contenido: readFileSync(join(LIB_RAIZ, l.split("/").pop() as string), "utf8") });
  }

  return salida;
}

/** Clases claras que rompen el tema oscuro (islas blancas / bordes invisibles).
 *
 * Nota: se matchean con límite de clase (regex) para no marcar falsos
 * positivos como `bg-green-500/10` (que contiene el substring `bg-green-50`).
 */
const PROHIBIDAS_EXACTAS = [
  "border-slate-200",
  "border-slate-300",
  "divide-slate-100",
  "bg-slate-50",
  "bg-slate-100",
  "bg-slate-200",
  "bg-violet-100",
  "bg-amber-100",
  "bg-green-100",
  "bg-cyan-100",
  "bg-blue-100",
  "bg-red-50",
  "bg-green-50",
  "bg-blue-50",
  "bg-amber-50",
  "bg-indigo-100",
  "bg-amber-200",
  "bg-blue-200",
  "bg-green-200",
  "bg-indigo-200",
  "bg-red-200",
  "bg-slate-300/70",
  "text-slate-900",
  "hover:bg-slate-50",
  "hover:bg-slate-100",
];

/** bg-white sólido (sin /opacidad) rompe el tema, salvo botón activo
 * `bg-white text-slate-950` (contraste intencional sobre oscuro, ventana ±2 líneas). */
const BG_WHITE_SOLIDO = /\bbg-white(?![/\w-])/;

/** Textos oscuros ilegibles sobre fondo slate-950. */
const TEXTOS_OSCUROS = [
  "text-slate-600",
  "text-slate-700",
  "text-slate-800",
  "text-violet-700",
  "text-amber-700",
  "text-green-700",
  "text-red-700",
  "text-blue-700",
  "text-blue-800",
  "text-blue-900",
  "text-amber-800",
  "text-amber-900",
  "text-red-800",
  "text-red-900",
];

describe("dashboard tema oscuro unificado",
() =>
{
  it("debería anclar fondo oscuro en el shell del dashboard",
  () =>
  {
    const layout = leer("layout.tsx");

    expect(layout).toMatch(/bg-slate-950/);
    expect(layout).toMatch(/text-slate-100/);
  });

  it("debería no tener islas claras ni bordes slate en el dashboard",
  () =>
  {
    const errores: string[] = [];

    for (const { nombre, contenido } of fuentes())
    {
      const lineas = contenido.split("\n");

      for (const [i, linea] of lineas.entries())
      {
        const ventana = lineas.slice(Math.max(0, i - 2), i + 3).join("\n");
        const esPrimario = ventana.includes("text-slate-950");

        for (const clase of PROHIBIDAS_EXACTAS)
        {
          const patron = new RegExp(`\\b${clase.replaceAll("/", "\\/")}(?![\\w/-])`);

          if (patron.test(linea) && !(clase === "bg-slate-200" && esPrimario))
          {
            errores.push(`${nombre}:${i + 1}: contiene "${clase}"`);
          }
        }

        if (BG_WHITE_SOLIDO.test(linea) && !esPrimario)
        {
          errores.push(`${nombre}:${i + 1}: contiene "bg-white" sólido`);
        }
      }
    }

    expect(errores).toEqual([]);
  });

  it("debería no tener textos oscuros que se mezclan con el fondo",
  () =>
  {
    const errores: string[] = [];

    for (const { nombre, contenido } of fuentes())
    {
      for (const clase of TEXTOS_OSCUROS)
      {
        const patron = new RegExp(`\\b${clase.replaceAll("/", "\\/")}(?![\\w/-])`);

        if (patron.test(contenido))
        {
          errores.push(`${nombre}: contiene "${clase}"`);
        }
      }
    }

    expect(errores).toEqual([]);
  });

  it("debería usar un solo ancho y escala tipográfica en checkout/facturación",
  () =>
  {
    const checkout = leer("checkout/page.tsx");
    const facturacion = leer("facturacion/page.tsx");

    for (const [nombre, contenido] of [["checkout", checkout], ["facturacion", facturacion]] as const)
    {
      expect(contenido, nombre).not.toContain("max-w-7xl");
      expect(contenido, nombre).not.toContain("text-3xl");
    }
  });

  it("debería documentar el scope auditado",
  () =>
  {
    const archivos = readdirSync(join(RAIZ, "agenda"));

    expect(archivos).toContain("page.tsx");
    expect(statSync(join(RAIZ, "layout.tsx")).isFile()).toBe(true);
  });
});
