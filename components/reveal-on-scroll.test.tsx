import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import RevealOnScroll from "./reveal-on-scroll";

const ruta = vi.hoisted(() => ({ actual: "/" }));

vi.mock("next/navigation", () =>
{
  return { usePathname: () => ruta.actual };
});

interface EntradaFalsa
{
  readonly target: Element;
  readonly isIntersecting: boolean;
}

class ObservadorFalso
{
  public static instancias: ObservadorFalso[] = [];

  public readonly observe = vi.fn();
  public readonly unobserve = vi.fn();
  public readonly disconnect = vi.fn();

  private readonly callback: IntersectionObserverCallback;

  public constructor(callback: IntersectionObserverCallback)
  {
    this.callback = callback;
    ObservadorFalso.instancias.push(this);
  }

  public disparar(entradas: readonly EntradaFalsa[]): void
  {
    this.callback(
      entradas as IntersectionObserverEntry[],
      this as unknown as IntersectionObserver,
    );
  }
}

let topRect = 900;

function rect(top: number): DOMRect
{
  return {
    top,
    bottom: top + 100,
    left: 0,
    right: 0,
    width: 0,
    height: 100,
    x: 0,
    y: top,
    toJSON: () => ({}),
  } as DOMRect;
}

describe("RevealOnScroll",
() =>
{
  beforeEach(() =>
  {
    ObservadorFalso.instancias = [];
    topRect = 900;
    ruta.actual = "/";
    vi.stubGlobal("IntersectionObserver", ObservadorFalso);
    vi.stubGlobal("innerHeight", 800);
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false })));
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockImplementation(() => rect(topRect));
  });

  afterEach(() =>
  {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("debería observar los bloques que están debajo del viewport",
  () =>
  {
    render(
      <>
        <div data-reveal="true" data-testid="bloque" />
        <RevealOnScroll />
      </>,
    );

    const bloque = screen.getByTestId("bloque");
    const observador = ObservadorFalso.instancias[0];

    expect(observador?.observe).toHaveBeenCalledWith(bloque);
    expect(bloque.dataset.visible).toBeUndefined();
  });

  it("debería revelar solo cuando el bloque intersecta",
  () =>
  {
    render(
      <>
        <div data-reveal="true" data-testid="bloque" />
        <RevealOnScroll />
      </>,
    );

    const bloque = screen.getByTestId("bloque");
    const observador = ObservadorFalso.instancias[0];

    act(() =>
    {
      observador?.disparar([{ target: bloque, isIntersecting: false }]);
    });

    expect(bloque.dataset.visible).toBeUndefined();

    act(() =>
    {
      observador?.disparar([{ target: bloque, isIntersecting: true }]);
    });

    expect(bloque.dataset.visible).toBe("true");
    expect(observador?.unobserve).toHaveBeenCalledWith(bloque);
  });

  it("debería empezar a observar bloques agregados después del montaje",
  async () =>
  {
    const { rerender } = render(<RevealOnScroll />);
    const observador = ObservadorFalso.instancias[0];

    rerender(
      <>
        <RevealOnScroll />
        <div data-reveal="true" data-testid="bloque" />
      </>,
    );

    await waitFor(() =>
    {
      expect(observador?.observe).toHaveBeenCalledWith(screen.getByTestId("bloque"));
    });
  });

  it("debería revelar de inmediato los bloques ya visibles o por encima",
  () =>
  {
    topRect = -200;

    render(
      <>
        <div data-reveal="true" data-testid="bloque" />
        <RevealOnScroll />
      </>,
    );

    expect(screen.getByTestId("bloque").dataset.visible).toBe("true");
  });

  it("debería revelar todo con prefers-reduced-motion",
  () =>
  {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));

    render(
      <>
        <div data-reveal="true" data-testid="bloque" />
        <RevealOnScroll />
      </>,
    );

    expect(screen.getByTestId("bloque").dataset.visible).toBe("true");
    expect(ObservadorFalso.instancias).toHaveLength(0);
  });

  it("debería volver a observar al cambiar de ruta",
  () =>
  {
    const { rerender } = render(
      <>
        <div data-reveal="true" data-testid="bloque" />
        <RevealOnScroll />
      </>,
    );

    const primero = ObservadorFalso.instancias[0];
    ruta.actual = "/features";

    rerender(
      <>
        <div data-reveal="true" data-testid="bloque" />
        <RevealOnScroll />
      </>,
    );

    const segundo = ObservadorFalso.instancias[1];

    expect(primero?.disconnect).toHaveBeenCalled();
    expect(segundo?.observe).toHaveBeenCalled();
  });

  it("debería desconectar el observador al desmontar",
  () =>
  {
    const { unmount } = render(
      <>
        <div data-reveal="true" data-testid="bloque" />
        <RevealOnScroll />
      </>,
    );

    const observador = ObservadorFalso.instancias[0];

    unmount();

    expect(observador?.disconnect).toHaveBeenCalled();
  });
});
