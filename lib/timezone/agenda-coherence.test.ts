import { describe, expect, it } from "vitest";

import
{
  claveDeDiaCivil,
  formatearEnZona,
  inicioSemanaCivil,
  minutosEnZona,
  sumarDiasCiviles,
} from "@/lib/timezone/timezone";

describe("coherencia agenda lista vs grilla",
() =>
{
  it("debería mostrar la misma hora civil en lista y en posición de grilla",
  () =>
  {
    const iso = "2026-09-30T17:00:00.000Z";
    const zona = "America/Argentina/Buenos_Aires";
    const fecha = new Date(iso);
    const etiqueta = formatearEnZona(fecha, zona);
    const minutos = minutosEnZona(fecha, zona);

    // Lista dice 14:00 y la grilla posiciona a 14*60 minutos.
    expect(etiqueta).toBe("30/09 14:00");
    expect(minutos).toBe(14 * 60);
    expect(etiqueta.slice(-5)).toBe("14:00");
  });

  it("debería navegar semanas por días civiles sin deriva por DST",
  () =>
  {
    // DST USA 2026: domingo 08/03 adelanta 1h. La semana del lunes 09/03 debe seguir siendo lunes.
    const base = new Date("2026-03-10T15:00:00.000Z");
    const lunes = inicioSemanaCivil(base, "America/New_York");

    expect(claveDeDiaCivil(lunes)).toBe("2026-03-09");
    expect(claveDeDiaCivil(sumarDiasCiviles(lunes, 7))).toBe("2026-03-16");
    expect(claveDeDiaCivil(sumarDiasCiviles(lunes, -7))).toBe("2026-03-02");
  });
});
