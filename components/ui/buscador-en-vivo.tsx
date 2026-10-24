import { Search } from "lucide-react";

interface BuscadorEnVivoProps
{
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder: string;
  readonly label?: string;
  readonly className?: string;
}

/**
 * Campo de búsqueda que notifica cada cambio sin esperar a un submit.
 *
 * @param props Valor controlado, callback y textos accesibles.
 * @return Input de búsqueda con ícono.
 */
export default function BuscadorEnVivo({
  value,
  onChange,
  placeholder,
  label,
  className,
}: BuscadorEnVivoProps)
{
  return (
    <div className={`relative ${className ?? ""}`}>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={label ?? placeholder}
        className="ui-input pl-9"
      />
    </div>
  );
}
