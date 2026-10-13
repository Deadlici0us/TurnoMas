import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import SeccionConfig from "./seccion-config";

describe("SeccionConfig",
() =>
{
  it("debería mostrar icono, título y ayuda en lenguaje simple",
  () =>
  {
    render(<SeccionConfig
      icono="tienda"
      titulo="Tu negocio"
      ayuda="Cómo se llama y en qué horario mostramos tus turnos."
    >
      <p>Contenido</p>
    </SeccionConfig>);

    expect(screen.getByRole("heading", { name: "Tu negocio" })).toBeDefined();
    expect(screen.getByText("Cómo se llama y en qué horario mostramos tus turnos.")).toBeDefined();
    expect(screen.getByText("Contenido")).toBeDefined();
  });

  it("debería marcar las secciones avanzadas como opcionales y colapsadas",
  () =>
  {
    render(<SeccionConfig
      icono="carta"
      titulo="Tus mensajes"
      ayuda="Textos que enviamos por vos."
      avanzada={true}
    >
      <p>Detalle avanzado</p>
    </SeccionConfig>);

    expect(screen.getByText("Opcional")).toBeDefined();
    expect(screen.getByText("Detalle avanzado")).toBeDefined();
  });

  it("debería mostrar la insignia básica en las secciones esenciales",
  () =>
  {
    render(<SeccionConfig icono="reloj" titulo="Tus horarios" ayuda="Cuándo atendés.">
      <p>Hola</p>
    </SeccionConfig>);

    expect(screen.getByText("Paso esencial")).toBeDefined();
  });
});
