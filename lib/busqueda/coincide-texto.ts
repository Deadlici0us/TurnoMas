const MIN_DIGITOS_BUSQUEDA = 3;

/**
 * Normaliza un texto para comparaciones de búsqueda.
 *
 * @param valor Texto original.
 * @return Texto sin acentos, en minúsculas y con espacios colapsados.
 */
export function normalizarTexto(valor: string): string
{
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Indica si alguno de los campos coincide con la consulta.
 *
 * Las consultas numéricas necesitan al menos tres dígitos para evitar
 * coincidencias demasiado amplias con teléfonos.
 *
 * @param campos Valores donde buscar.
 * @param consulta Texto escrito por la persona usuaria.
 * @return true si hay coincidencia o la consulta está vacía.
 */
export function coincideTexto(
  campos: readonly (string | null | undefined)[],
  consulta: string,
): boolean
{
  const query = normalizarTexto(consulta);

  if (query.length === 0)
  {
    return true;
  }

  const soloDigitos = /^\d+$/.test(query);
  const digitosConsulta = query.replace(/\D/g, "");

  if (soloDigitos && digitosConsulta.length < MIN_DIGITOS_BUSQUEDA)
  {
    return false;
  }

  return campos.some((campo) =>
  {
    if (typeof campo !== "string" || campo.length === 0)
    {
      return false;
    }

    const texto = normalizarTexto(campo);

    if (texto.includes(query))
    {
      return true;
    }

    if (digitosConsulta.length < MIN_DIGITOS_BUSQUEDA)
    {
      return false;
    }

    return texto.replace(/\D/g, "").includes(digitosConsulta);
  });
}
