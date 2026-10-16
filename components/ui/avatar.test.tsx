import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import Avatar, { inicialesDe } from "./avatar";

describe("inicialesDe",
() =>
{
  it("debería tomar hasta dos iniciales",
  () =>
  {
    expect(inicialesDe("Barbería Diego")).toBe("BD");
    expect(inicialesDe("Peluquería Sur Centro")).toBe("PS");
  });

  it("debería tomar una inicial con una sola palabra",
  () =>
  {
    expect(inicialesDe("Diego")).toBe("D");
  });

  it("debería caer a '?' sin nombre",
  () =>
  {
    expect(inicialesDe("   ")).toBe("?");
  });
});

describe("Avatar",
() =>
{
  it("debería mostrar iniciales sin imagen",
  () =>
  {
    render(<Avatar name="Barbería Diego" />);

    expect(screen.getByText("BD")).toBeDefined();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("debería mostrar la imagen cuando hay src",
  () =>
  {
    const { container } = render(<Avatar name="Peluquería Sur" src="https://cdn/x.png" />);
    const img = container.querySelector("img");

    expect(img).not.toBeNull();
    expect(img).toHaveAttribute("src", "https://cdn/x.png");
    expect(img).toHaveAttribute("alt", "Peluquería Sur");
  });
});
