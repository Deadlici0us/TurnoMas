import Link from "next/link";

export interface LegalLinksProps
{
  readonly privacyLabel: string;
  readonly termsLabel: string;
}

/**
 * Enlaces legales para los pies de las pantallas de autenticación.
 *
 * @param props etiquetas traducidas de privacidad y términos.
 * @return Línea con ambos enlaces separados por un punto medio.
 */
export default function LegalLinks(props: LegalLinksProps)
{
  return (
    <p className="text-xs text-muted-foreground">
      <Link href="/privacidad" className="ui-link">
        {props.privacyLabel}
      </Link>
      <span aria-hidden="true"> · </span>
      <Link href="/terminos" className="ui-link">
        {props.termsLabel}
      </Link>
    </p>
  );
}
