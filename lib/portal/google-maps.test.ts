import { afterEach, describe, expect, it, vi } from "vitest";

import { extraerCoordenadasMaps, resolverUbicacionMaps } from "./google-maps";

describe("extraerCoordenadasMaps",
() =>
{
  it("debería extraer coordenadas del formato @lat,lng",
  () =>
  {
    expect(extraerCoordenadasMaps("https://www.google.com/maps/@-34.6037,-58.3816,17z"))
      .toEqual({ lat: -34.6037, lng: -58.3816 });
  });

  it("debería priorizar el marcador !3d...!4d... sobre el centro del mapa",
  () =>
  {
    expect(extraerCoordenadasMaps(
      "https://www.google.com/maps/place/Bar/@-34.1,-58.1,17z/data=!3d-34.6037!4d-58.3816"))
      .toEqual({ lat: -34.6037, lng: -58.3816 });
  });

  it("debería extraer coordenadas de parámetros q/query/ll/center",
  () =>
  {
    expect(extraerCoordenadasMaps("https://www.google.com/maps?q=-34.6037,-58.3816"))
      .toEqual({ lat: -34.6037, lng: -58.3816 });
    expect(extraerCoordenadasMaps("https://www.google.com/maps?query=loc:-34.6037,-58.3816"))
      .toEqual({ lat: -34.6037, lng: -58.3816 });
    expect(extraerCoordenadasMaps("https://maps.google.com/maps?ll=-34.6037,-58.3816"))
      .toEqual({ lat: -34.6037, lng: -58.3816 });
    expect(extraerCoordenadasMaps("https://www.google.com/maps?center=-34.6037,-58.3816"))
      .toEqual({ lat: -34.6037, lng: -58.3816 });
  });

  it("debería devolver null sin coordenadas o con valores inválidos",
  () =>
  {
    expect(extraerCoordenadasMaps("https://www.google.com/maps/place/Barberia")).toBeNull();
    expect(extraerCoordenadasMaps("https://www.google.com/maps/@-91,-58.3816,17z")).toBeNull();
    expect(extraerCoordenadasMaps("https://www.google.com/maps/@-34.6037,181,17z")).toBeNull();
    expect(extraerCoordenadasMaps("no es una url")).toBeNull();
    expect(extraerCoordenadasMaps(null)).toBeNull();
    expect(extraerCoordenadasMaps(123)).toBeNull();
  });
});

describe("resolverUbicacionMaps",
() =>
{
  afterEach(() =>
  {
    vi.restoreAllMocks();
  });

  it("debería resolver un link largo sin hacer fetch",
  async () =>
  {
    const fetchMock = vi.spyOn(globalThis, "fetch");

    await expect(resolverUbicacionMaps("https://www.google.com/maps/@-34.6037,-58.3816,17z"))
      .resolves.toEqual({ lat: -34.6037, lng: -58.3816 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("debería resolver un link corto siguiendo el redirect",
  async () =>
  {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      url: "https://www.google.com/maps/@-34.6037,-58.3816,17z",
    } as Response);

    await expect(resolverUbicacionMaps("https://maps.app.goo.gl/abc123"))
      .resolves.toEqual({ lat: -34.6037, lng: -58.3816 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("debería cachear la resolución de un link corto",
  async () =>
  {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      url: "https://www.google.com/maps/@-34.7001,-58.4001,17z",
    } as Response);

    const primero = await resolverUbicacionMaps("https://maps.app.goo.gl/cacheame");
    const segundo = await resolverUbicacionMaps("https://maps.app.goo.gl/cacheame");

    expect(primero).toEqual({ lat: -34.7001, lng: -58.4001 });
    expect(segundo).toEqual(primero);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("debería devolver null si el fetch falla o el redirect no es de Google",
  async () =>
  {
    vi.spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new Error("sin red"))
      .mockResolvedValueOnce({
        url: "https://ejemplo.com/maps/@-34.6037,-58.3816,17z",
      } as Response);

    await expect(resolverUbicacionMaps("https://maps.app.goo.gl/falla"))
      .resolves.toBeNull();

    await expect(resolverUbicacionMaps("https://maps.app.goo.gl/otro-host"))
      .resolves.toBeNull();
  });

  it("debería devolver null con links inválidos o que no son de Google Maps",
  async () =>
  {
    const fetchMock = vi.spyOn(globalThis, "fetch");

    await expect(resolverUbicacionMaps("https://ejemplo.com/maps/@-34.6,-58.3,17z"))
      .resolves.toBeNull();
    await expect(resolverUbicacionMaps("https://www.google.com/maps/place/SinCoords"))
      .resolves.toBeNull();
    await expect(resolverUbicacionMaps(null)).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
