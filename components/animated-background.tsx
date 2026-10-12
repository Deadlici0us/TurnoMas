/**
 * Fondo animado oscuro elegante para el panel.
 *
 * Tres brillos de marca (violeta, fucsia, cian) a la deriva sobre
 * `slate-950` más una viñeta radial. Puro CSS, sin librerías:
 * respeta `prefers-reduced-motion` y es invisible para lectores.
 *
 * @return Contenedor fijo de fondo sin contenido textual.
 */
export default function AnimatedBackground()
{
  return (
    <div
      data-testid="fondo-animado"
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 overflow-hidden bg-slate-950"
    >
      <div className="animate-drift-a absolute -top-40 -left-40 h-[42rem] w-[42rem] rounded-full bg-brand-500/30 blur-3xl" />
      <div className="animate-drift-b absolute top-1/3 -right-48 h-[38rem] w-[38rem] rounded-full bg-fuchsia-600/20 blur-3xl" />
      <div className="animate-drift-c absolute -bottom-56 left-1/4 h-[36rem] w-[36rem] rounded-full bg-cyan-500/15 blur-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(2,6,23,0.55)_100%)]" />
    </div>
  );
}
