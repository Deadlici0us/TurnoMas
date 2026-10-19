import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Auditoría estática del tema claro unificado del dashboard.
 *
 * El dashboard vive sobre fondo `surface` con tarjetas blancas. Cualquier
 * superficie oscura hardcodeada (slate-950/900, white/5, scheme-dark)
 * rompe la legibilidad y la consistencia con el diseño SimplyBook.
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
  "clientes/[id]/page.tsx",
  "pagos/page.tsx",
  "config/page.tsx",
  "checkout/page.tsx",
  "suscripcion/page.tsx",
  "resenas/page.tsx",
  "remarketing/page.tsx",
];

const COMPONENTES = [
  "agenda-calendar.tsx",
  "agenda-citas-dia.tsx",
  "leyenda-estados.tsx",
  "demo-editable-banner.tsx",
  "demo-readonly-banner.tsx",
  "formulario-servicio.tsx",
  "campos-servicio.tsx",
  "copiar-comprobante.tsx",
  "staff-delete-form.tsx",
  "zona-peligro-eliminar.tsx",
  "dashboard-sidebar.tsx",
  "seccion-config.tsx",
  "editor-horarios-semanales.tsx",
  "fila-dia-horario.tsx",
  "detalle-dia-horario.tsx",
  "lista-resenas.tsx",
  "lista-remarketing.tsx",
  "suscripcion-form.tsx",
  "verificar-pago.tsx",
  "onboarding-wizard.tsx",
  "pago-pendiente-banner.tsx",
  "foto-staff-uploader.tsx",
  "logo-negocio-uploader.tsx",
  "perfil-staff-form.tsx",
  "guia-whatsapp.tsx",
];

const LIB = ["estados-colores.ts"];

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
    const ruta = join(COMP_RAIZ, c);

    try
    {
      salida.push({ nombre: `components/${c}`, contenido: readFileSync(ruta, "utf8") });
    }
    catch
    {
      // Componente opcional que puede no existir en este checkout.
    }
  }

  for (const l of LIB)
  {
    salida.push({ nombre: `lib/dashboard/${l}`, contenido: readFileSync(join(LIB_RAIZ, l), "utf8") });
  }

  return salida;
}

/** Clases oscuras que no deben quedar en el scope del dashboard. */
const PROHIBIDAS_EXACTAS = [
  "bg-slate-950",
  "bg-slate-900",
  "bg-white/5",
  "bg-white/10",
  "bg-white/15",
  "border-white/10",
  "border-white/15",
  "divide-white/10",
  "text-slate-100",
  "text-slate-200",
  "text-slate-300",
  "text-slate-400",
  "text-slate-500",
  "shadow-black",
  "scheme-dark",
  "ring-offset-slate-900",
];

/** Clases oscuras que rompen el fondo claro dentro del dashboard. */
const TEXTOS_OSCUROS = [
  "text-slate-600",
  "text-slate-700",
  "text-slate-800",
];

describe("dashboard tema claro unificado",
() =>
{
  it("debería anclar fondo claro en el shell del dashboard",
  () =>
  {
    const layout = leer("layout.tsx");

    expect(layout).toMatch(/bg-surface|bg-\[#F8FAFF\]/);
    expect(layout).toMatch(/text-ink|text-\[#253246\]/);
    expect(layout).not.toMatch(/bg-slate-950/);
    expect(layout).not.toMatch(/scheme-dark/);
  });

  it("debería usar el sidebar navy y el activo teal",
  () =>
  {
    const sidebar = readFileSync(join(COMP_RAIZ, "dashboard-sidebar.tsx"), "utf8");

    expect(sidebar).toMatch(/bg-sidebar/);
    expect(sidebar).toMatch(/bg-primary/);
  });

  it("debería no tener superficies ni textos oscuros en el dashboard",
  () =>
  {
    const errores: string[] = [];

    for (const { nombre, contenido } of fuentes())
    {
      const lineas = contenido.split("\n");

      for (const [i, linea] of lineas.entries())
      {
        for (const clase of PROHIBIDAS_EXACTAS)
        {
          const patron = new RegExp(`\\b${clase.replaceAll("/", "\\/")}(?![\\w/-])`);

          if (patron.test(linea))
          {
            errores.push(`${nombre}:${i + 1}: contiene "${clase}"`);
          }
        }
      }

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

  it("debería usar colores claros en los estados de la agenda",
  () =>
  {
    const estados = readFileSync(join(LIB_RAIZ, "estados-colores.ts"), "utf8");

    expect(estados).not.toMatch(/text-(amber|green|blue|indigo|red)-300/);
    expect(estados).toMatch(/text-\[#/);
  });

  it("debería usar un solo ancho y escala tipográfica en checkout/suscripción",
  () =>
  {
    const checkout = leer("checkout/page.tsx");
    const suscripcion = leer("suscripcion/page.tsx");

    for (const [nombre, contenido] of [["checkout", checkout], ["suscripcion", suscripcion]] as const)
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
