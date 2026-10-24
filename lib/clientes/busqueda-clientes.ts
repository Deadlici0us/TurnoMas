import { coincideTexto } from "@/lib/busqueda/coincide-texto";
import { analizarWhatsappCliente } from "@/lib/clientes/whatsapp";

export interface ClienteBuscable
{
  readonly nombre: string;
  readonly whatsapp: string;
  readonly email?: string | null;
}

/**
 * Determina si un cliente coincide con la búsqueda por nombre, WhatsApp o email.
 *
 * @param cliente Datos mínimos del cliente.
 * @param consulta Texto escrito por la persona usuaria.
 * @return true si el cliente coincide o la consulta está vacía.
 */
export function coincideBusquedaCliente(cliente: ClienteBuscable, consulta: string): boolean
{
  if (consulta.trim().length === 0)
  {
    return true;
  }

  const whatsapp = analizarWhatsappCliente(consulta);

  if (whatsapp.ok && whatsapp.valor === cliente.whatsapp)
  {
    return true;
  }

  return coincideTexto(
    [cliente.nombre, cliente.whatsapp, cliente.email],
    consulta,
  );
}
