import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import BookingFlow from "@/components/booking-flow";
import { getDemoBusiness } from "@/lib/portal/demo-business";

describe("BookingFlow",
() =>
{
  it("debería avanzar de profesional a servicio al hacer click",
  async () =>
  {
    const user = userEvent.setup();
    const business = getDemoBusiness("ar", "barberia-diego");

    expect(business).not.toBeNull();

    render(
      <BookingFlow
        negocioNombre={business!.nombre}
        staff={business!.staff}
        servicios={business!.servicios}
        turnos={business!.turnos}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Diego" }));

    expect(screen.getByRole("heading", { name: "2. Elegí tu servicio" })).toBeDefined();
  });
});
