/**
 * Fondo animado oscuro inmersivo para el sitio público.
 *
 * Capa aurora cónica de marca, grilla con máscara radial, tres brillos
 * de marca (violeta, fucsia, cian) con flotación compuesta y viñeta.
 * Puro CSS, sin librerías: respeta `prefers-reduced-motion` y es
 * invisible para lectores.
 *
 * @return Contenedor fijo de fondo sin contenido textual.
 */
export default function AnimatedBackground()
{
  return (
    <div
      data-testid="fondo-animado"
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-slate-950"
    >
      <div className="animate-aurora absolute -top-1/4 left-1/2 h-[60rem] w-[90rem] -translate-x-1/2 rounded-[100%] bg-[conic-gradient(from_90deg_at_50%_50%,rgba(139,92,246,0.22),rgba(217,70,239,0.16),rgba(34,211,238,0.14),rgba(139,92,246,0.22))] blur-3xl" />
      <div className="animate-grid-pan absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.09)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.09)_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,black_30%,transparent_75%)]" />
      <div className="animate-float-a absolute -top-40 -left-40 h-[42rem] w-[42rem] rounded-full bg-brand-500/40 blur-3xl" />
      <div className="animate-float-b absolute top-1/3 -right-48 h-[38rem] w-[38rem] rounded-full bg-fuchsia-600/25 blur-3xl" />
      <div className="animate-float-c absolute -bottom-56 left-1/4 h-[36rem] w-[36rem] rounded-full bg-cyan-500/20 blur-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(2,6,23,0.55)_100%)]" />
    </div>
  );
}
