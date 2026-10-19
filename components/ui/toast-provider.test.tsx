import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ToastProvider from "./toast-provider";
import { resetToasts } from "./toast-store";
import { useToast } from "./use-toast";

function Disparador({ tone = "success" }: { readonly tone?: "success" | "error" })
{
  const { showToast } = useToast();

  return (
    <button
      type="button"
      onClick={() => showToast({
        tone,
        title: tone === "success" ? "Listo" : "Error",
        message: tone === "success" ? "Servicio creado" : "No pudimos guardar",
      })}
    >
      Mostrar toast
    </button>
  );
}

describe("ToastProvider",
() =>
{
  beforeEach(() =>
  {
    vi.useFakeTimers();
  });

  afterEach(() =>
  {
    act(() =>
    {
      resetToasts();
    });
    vi.useRealTimers();
  });

  it("debería mostrar un toast de éxito y cerrarlo solo",
  () =>
  {
    render(
      <ToastProvider>
        <Disparador />
      </ToastProvider>,
    );

    act(() =>
    {
      fireEvent.click(screen.getByRole("button", { name: "Mostrar toast" }));
    });

    expect(screen.getByText("Servicio creado")).toBeDefined();
    expect(screen.getByRole("status")).toBeDefined();

    act(() =>
    {
      vi.advanceTimersByTime(4300);
    });

    expect(screen.queryByText("Servicio creado")).toBeNull();
  });

  it("debería anunciar los errores como alert",
  () =>
  {
    render(
      <ToastProvider>
        <Disparador tone="error" />
      </ToastProvider>,
    );

    act(() =>
    {
      fireEvent.click(screen.getByRole("button", { name: "Mostrar toast" }));
    });

    expect(screen.getByRole("alert")).toBeDefined();
    expect(screen.getByText("No pudimos guardar")).toBeDefined();
  });

  it("debería apilar como máximo tres toasts",
  () =>
  {
    render(
      <ToastProvider>
        <Disparador />
      </ToastProvider>,
    );

    const boton = screen.getByRole("button", { name: "Mostrar toast" });

    act(() =>
    {
      fireEvent.click(boton);
      fireEvent.click(boton);
      fireEvent.click(boton);
      fireEvent.click(boton);
    });

    expect(screen.getAllByRole("status")).toHaveLength(3);
  });
});
