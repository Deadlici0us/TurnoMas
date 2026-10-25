import type { Metadata } from "next";

import LegalDocument, { type LegalSection } from "@/components/legal-document";

export const metadata: Metadata = {
  title: "Términos de servicio | TurnoMas",
  description: "Condiciones de uso, pagos, señas y responsabilidad del servicio TurnoMas.",
  alternates: { canonical: "/terminos" },
};

const SECTIONS: readonly LegalSection[] = [
  {
    title: "Aceptación",
    paragraphs: [
      "Al crear una cuenta, contratar el servicio o usar TurnoMas, aceptás estos términos. Si no estás " +
        "de acuerdo, no uses la plataforma.",
    ],
  },
  {
    title: "Descripción del servicio",
    paragraphs: [
      "TurnoMas es una plataforma de gestión de reservas para profesionales independientes. Permite " +
        "publicar servicios, recibir reservas, cobrar señas y enviar recordatorios.",
      "TurnoMas no presta servicios profesionales de barbería, estética, salud ni de otra índole; el " +
        "negocio es responsable de los servicios que ofrece.",
    ],
  },
  {
    title: "Cuenta y seguridad",
    paragraphs: [
      "Debés proporcionar información veraz y mantenerla actualizada. Sos responsable de la " +
        "confidencialidad de tus credenciales y de la actividad de tu cuenta.",
      "Notificanos de inmediato cualquier uso no autorizado a soporte@turnomas.com.",
    ],
  },
  {
    title: "Prueba, plan y pagos",
    paragraphs: [
      "La prueba gratuita dura 14 días. Luego, el plan cuesta 14.999 ARS por mes, salvo que se indique " +
        "otro precio al momento de la contratación.",
      "La suscripción se cobra a través de MercadoPago. Podés cancelar cuando quieras; la cancelación " +
        "detiene renovaciones futuras, pero no genera reembolsos por períodos ya usados, salvo que la ley " +
        "disponga lo contrario.",
      "Podemos modificar precios con aviso previo razonable. Si no aceptás el nuevo precio, podés " +
        "cancelar antes de la próxima renovación.",
    ],
  },
  {
    title: "Señas y MercadoPago",
    paragraphs: [
      "El negocio define el monto de la seña y las condiciones de su servicio. MercadoPago procesa los " +
        "pagos; TurnoMas no es una entidad financiera ni almacena datos completos de tarjetas.",
      "Las comisiones, contracargos, reembolsos y disputas se rigen por las condiciones de MercadoPago y " +
        "la legislación aplicable. TurnoMas puede suspender el cobro de señas si detecta fraude o uso " +
        "indebido.",
    ],
  },
  {
    title: "Uso aceptable",
    paragraphs: [
      "No podés usar TurnoMas para actividades ilegales, enviar spam, cargar datos de terceros sin " +
        "autorización, vulnerar la seguridad, interferir con el servicio ni reproducir o revender la " +
        "plataforma sin permiso.",
      "Podemos suspender o cancelar cuentas que incumplan estos términos o generen riesgo para otros " +
        "usuarios.",
    ],
  },
  {
    title: "Contenido y propiedad intelectual",
    paragraphs: [
      "El negocio conserva la titularidad de sus datos, marcas, logos y contenidos. Nos otorga una " +
        "licencia limitada para alojarlos y mostrarlos mientras use el servicio.",
      "El software, diseño, marca y documentación de TurnoMas son de nuestra titularidad o de nuestros " +
        "licenciantes. No se concede ninguna licencia implícita.",
    ],
  },
  {
    title: "Disponibilidad y limitaciones",
    paragraphs: [
      "Trabajamos para mantener el servicio disponible, pero puede haber mantenimientos, interrupciones " +
        "o fallas de proveedores externos. No garantizamos disponibilidad ininterrumpida ni ausencia de " +
        "errores.",
    ],
  },
  {
    title: "Limitación de responsabilidad",
    paragraphs: [
      "En la máxima medida permitida por la ley, TurnoMas no responde por daños indirectos, lucro " +
        "cesante, pérdida de datos o perjuicios derivados del uso o la imposibilidad de uso del servicio.",
      "Nada en estos términos limita derechos irrenunciables de consumidores ni la responsabilidad por " +
        "dolo o culpa grave.",
    ],
  },
  {
    title: "Terminación",
    paragraphs: [
      "Podés cerrar tu cuenta cuando quieras. Podemos suspender o terminar el acceso por incumplimientos, " +
        "fraude o riesgo legal. Cuando corresponda, te daremos un plazo razonable para exportar tus datos.",
    ],
  },
  {
    title: "Modificaciones",
    paragraphs: [
      "Podemos actualizar estos términos. Publicaremos la versión vigente con su fecha. Si el cambio es " +
        "sustancial, lo comunicaremos con antelación razonable. El uso continuado implica aceptación.",
    ],
  },
  {
    title: "Ley aplicable y jurisdicción",
    paragraphs: [
      "Estos términos se rigen por las leyes de la República Argentina. Las controversias se someterán a " +
        "los tribunales competentes, sin perjuicio de los derechos que la ley reconozca a los " +
        "consumidores.",
    ],
  },
];

export default function TerminosPage()
{
  return (
    <LegalDocument
      title="Términos de servicio"
      updatedAt="25 de octubre de 2026"
      intro={"Estos términos regulan el uso de TurnoMas. Leelos antes de crear una cuenta o contratar el " +
        "servicio. Si tenés dudas, escribinos antes de continuar."}
      sections={SECTIONS}
      contactEmail="soporte@turnomas.com"
    />
  );
}
