import Link from "next/link";

export interface LegalSection
{
  readonly title: string;
  readonly paragraphs: readonly string[];
}

export interface LegalDocumentProps
{
  readonly title: string;
  readonly updatedAt: string;
  readonly intro: string;
  readonly sections: readonly LegalSection[];
  readonly contactEmail: string;
}

/**
 * Documento legal reutilizable para privacidad y términos.
 *
 * @param props título, fecha, introducción, secciones y correo de contacto.
 * @return Página legal con ancho de lectura y jerarquía de títulos.
 */
export default function LegalDocument(props: LegalDocumentProps)
{
  return (
    <main className="min-h-screen bg-surface">
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold tracking-widest text-primary uppercase">Legal</p>
        <h1 className="mt-2 font-heading text-4xl font-extrabold tracking-tight text-navy">
          {props.title}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Última actualización: {props.updatedAt}
        </p>
        <article className="ui-card mt-8 space-y-8 p-6 sm:p-10">
          <p className="text-sm leading-relaxed text-muted-foreground">{props.intro}</p>
          {props.sections.map((section) => (
            <section key={section.title} className="space-y-3">
              <h2 className="font-heading text-xl font-bold text-navy">{section.title}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="text-sm leading-relaxed text-muted-foreground">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
          <section className="space-y-3">
            <h2 className="font-heading text-xl font-bold text-navy">Contacto</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Por consultas sobre este documento, escribinos a{" "}
              <a href={`mailto:${props.contactEmail}`} className="ui-link">
                {props.contactEmail}
              </a>
              .
            </p>
          </section>
        </article>
        <Link href="/" className="ui-btn ui-btn-outline mt-6">
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
