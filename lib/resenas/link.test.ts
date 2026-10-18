import { describe, expect, it } from "vitest";

import { googleReviewUrl } from "./link";

describe("googleReviewUrl",
() =>
{
  it("debería preferir el place_id con el link directo de escribir reseña",
  () =>
  {
    expect(googleReviewUrl("ChIJ123", "https://maps.app.goo.gl/abc", "Barbería"))
      .toBe("https://search.google.com/local/writereview?placeid=ChIJ123");
  });

  it("debería codificar el place_id",
  () =>
  {
    expect(googleReviewUrl("a b/c", null, "Barbería"))
      .toBe("https://search.google.com/local/writereview?placeid=a%20b%2Fc");
  });

  it("debería usar el link de Maps cuando no hay place_id",
  () =>
  {
    expect(googleReviewUrl(null, "https://maps.app.goo.gl/abc", "Barbería"))
      .toBe("https://maps.app.goo.gl/abc");
  });

  it("debería caer a búsqueda por nombre sin place_id ni maps",
  () =>
  {
    expect(googleReviewUrl(undefined, "", "Barbería Diego"))
      .toBe("https://www.google.com/maps/search/?api=1&query=Barber%C3%ADa%20Diego");
  });
});
