import { describe, expect, it } from "vitest";

import
{
  convertirHorariosAUI,
  errorDeFranjas,
  formatearHoraCorta,
  horaAMinutos,
  minutosAHora,
  PRESET_CORRIDO,
  PRESET_CORTADO,
  PRESET_SABADO,
  resumenSemana,
  serializarDia,
} from "./modelo-ui";

describe("minutosAHora",
() =>
{
  it("debería formatear minutos como HH:MM",
  () =>
  {
    expect(minutosAHora(540)).toBe("09:00");
    expect(minutosAHora(1140)).toBe("19:00");
    expect(minutosAHora(0)).toBe("00:00");
  });
});

describe("horaAMinutos",
() =>
{
  it("debería parsear HH:MM estricto",
  () =>
  {
    expect(horaAMinutos("09:00")).toBe(540);
    expect(horaAMinutos("19:30")).toBe(1170);
  });

  it("debería tolerar hora sin cero inicial",
  () =>
  {
    expect(horaAMinutos("9:00")).toBe(540);
    expect(horaAMinutos(" 9:30 ")).toBe(570);
  });

  it("debería rechazar valores inválidos",
  () =>
  {
    expect(() => horaAMinutos("")).toThrow(RangeError);
    expect(() => horaAMinutos("25:00")).toThrow(RangeError);
    expect(() => horaAMinutos("09-00")).toThrow(RangeError);
  });
});

describe("serializarDia",
() =>
{
  it("debería serializar franjas al formato legacy con comas",
  () =>
  {
    expect(serializarDia([])).toBe("");
    expect(serializarDia([{ openMinutes: 540, closeMinutes: 1140 }])).toBe("09:00-19:00");
    expect(serializarDia([
      { openMinutes: 540, closeMinutes: 780 },
      { openMinutes: 900, closeMinutes: 1200 },
    ])).toBe("09:00-13:00, 15:00-20:00");
  });
});

describe("convertirHorariosAUI",
() =>
{
  it("debería convertir strings y arrays a DayRange",
  () =>
  {
    const ui = convertirHorariosAUI({ lun: "09:00-19:00", mar: ["09:00-13:00", "15:00-20:00"] });

    expect(ui.lun).toEqual([{ openMinutes: 540, closeMinutes: 1140 }]);
    expect(ui.mar).toEqual([
      { openMinutes: 540, closeMinutes: 780 },
      { openMinutes: 900, closeMinutes: 1200 },
    ]);
    expect(ui.dom).toEqual([]);
  });

  it("debería tratar nulos, vacíos e inválidos como cerrado",
  () =>
  {
    const ui = convertirHorariosAUI({ lun: null, mar: "", mié: 123, jue: "9-10" });

    expect(ui.lun).toEqual([]);
    expect(ui.mar).toEqual([]);
    expect(ui.mié).toEqual([]);
    expect(ui.jue).toEqual([]);
  });

  it("debería devolver semana cerrada para horarios ausentes",
  () =>
  {
    const ui = convertirHorariosAUI(null);

    expect(ui.lun).toEqual([]);
    expect(ui.dom).toEqual([]);
  });
});

describe("errorDeFranjas",
() =>
{
  it("debería aceptar franjas válidas",
  () =>
  {
    expect(errorDeFranjas([])).toBeNull();
    expect(errorDeFranjas([{ openMinutes: 540, closeMinutes: 1140 }])).toBeNull();
  });

  it("debería rechazar cierre anterior a apertura",
  () =>
  {
    expect(errorDeFranjas([{ openMinutes: 1140, closeMinutes: 540 }]))
      .toBe("El cierre tiene que ser después de la apertura.");
  });

  it("debería rechazar franjas superpuestas",
  () =>
  {
    expect(errorDeFranjas([
      { openMinutes: 540, closeMinutes: 780 },
      { openMinutes: 700, closeMinutes: 1200 },
    ])).toBe("Esos turnos se superponen. Separalos o unilos en uno solo.");
  });
});

describe("presets",
() =>
{
  it("debería exponer jornada corrida, cortada y sábado",
  () =>
  {
    expect(PRESET_CORRIDO).toEqual([{ openMinutes: 540, closeMinutes: 1140 }]);
    expect(PRESET_CORTADO).toEqual([
      { openMinutes: 540, closeMinutes: 780 },
      { openMinutes: 900, closeMinutes: 1200 },
    ]);
    expect(PRESET_SABADO).toEqual([{ openMinutes: 540, closeMinutes: 840 }]);
  });
});

describe("formatearHoraCorta",
() =>
{
  it("debería mostrar hora sin minutos cuando es en punto",
  () =>
  {
    expect(formatearHoraCorta(540)).toBe("9");
    expect(formatearHoraCorta(570)).toBe("9:30");
    expect(formatearHoraCorta(1140)).toBe("19");
  });
});

describe("resumenSemana",
() =>
{
  it("debería resumir semana corrida con sábado y domingo cerrado",
  () =>
  {
    const ui = convertirHorariosAUI({
      lun: "09:00-19:00",
      mar: "09:00-19:00",
      mié: "09:00-19:00",
      jue: "09:00-19:00",
      vie: "09:00-19:00",
      sáb: "09:00-14:00",
      dom: "",
    });

    expect(resumenSemana(ui)).toBe("Lun a Vie 9 a 19 · Sáb 9 a 14 · Dom cerrado");
  });

  it("debería indicar todo cerrado",
  () =>
  {
    expect(resumenSemana(convertirHorariosAUI({}))).toBe("Todo cerrado");
  });
});
