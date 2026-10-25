"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const SELECTOR = '[data-reveal="true"]';

const OPCIONES: IntersectionObserverInit = {
  threshold: 0.15,
  rootMargin: "0px 0px -10% 0px",
};

/**
 * Indica si el usuario pidió reducir las animaciones.
 *
 * @return `true` cuando `prefers-reduced-motion` está activo.
 */
function prefiereMenosMovimiento(): boolean
{
  return typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Marca un elemento como revelado para disparar su animación.
 *
 * @param elemento Elemento con `data-reveal`.
 */
function revelar(elemento: HTMLElement): void
{
  elemento.dataset.visible = "true";
}

/**
 * Revela los bloques `data-reveal` al entrar en viewport.
 *
 * Usa un único observador y vuelve a registrar los elementos cuando cambia
 * la ruta. Los elementos ya visibles o por encima del viewport se revelan
 * de inmediato para soportar recargas a mitad de página.
 *
 * @return `null`; es un componente sin salida visual.
 */
export default function RevealOnScroll()
{
  const pathname = usePathname();

  useEffect(() =>
  {
    const sinMovimiento = prefiereMenosMovimiento()
      || typeof IntersectionObserver === "undefined";
    const observados = new WeakSet<HTMLElement>();
    const observer = sinMovimiento
      ? null
      : new IntersectionObserver((entries, instancia) =>
      {
        for (const entry of entries)
        {
          if (!entry.isIntersecting)
          {
            continue;
          }

          revelar(entry.target as HTMLElement);
          instancia.unobserve(entry.target);
        }
      }, OPCIONES);

    const procesar = (elemento: HTMLElement): void =>
    {
      if (observados.has(elemento) || elemento.dataset.visible === "true")
      {
        return;
      }

      observados.add(elemento);

      if (observer === null || elemento.getBoundingClientRect().top < window.innerHeight)
      {
        revelar(elemento);
      }
      else
      {
        observer.observe(elemento);
      }
    };

    const procesarNodo = (nodo: Node): void =>
    {
      if (!(nodo instanceof HTMLElement))
      {
        return;
      }

      if (nodo.matches(SELECTOR))
      {
        procesar(nodo);
      }

      for (const elemento of nodo.querySelectorAll<HTMLElement>(SELECTOR))
      {
        procesar(elemento);
      }
    };

    for (const elemento of document.querySelectorAll<HTMLElement>(SELECTOR))
    {
      procesar(elemento);
    }

    const mutaciones = typeof MutationObserver === "undefined"
      ? null
      : new MutationObserver((registros) =>
      {
        for (const registro of registros)
        {
          for (const nodo of registro.addedNodes)
          {
            procesarNodo(nodo);
          }
        }
      });

    mutaciones?.observe(document.body, { childList: true, subtree: true });

    return () =>
    {
      mutaciones?.disconnect();
      observer?.disconnect();
    };
  }, [pathname]);

  return null;
}
