import type { Metadata } from "next";

import LegalDocument, { type LegalSection } from "@/components/legal-document";

export const metadata: Metadata = {
  title: "Política de privacidad | TurnoMas",
  description: "Cómo TurnoMas recopila, usa, comparte y protege los datos personales.",
  alternates: { canonical: "/privacidad" },
};

const SECTIONS: readonly LegalSection[] = [
  {
    title: "Responsable del tratamiento",
    paragraphs: [
      "TurnoMas es el responsable del tratamiento de los datos personales recolectados a través de " +
        "turnomas.com y de la aplicación. Domicilio: Argentina. Contacto: soporte@turnomas.com.",
      "Para iniciar sesión con Google usamos Supabase Auth. Por eso, el selector de cuentas de Google " +
        "puede mostrar un dominio terminado en supabase.co. Es nuestro proveedor de autenticación y no " +
        "un sitio externo.",
    ],
  },
  {
    title: "Datos que recopilamos",
    paragraphs: [
      "Datos de cuenta: nombre, dirección de email y, si iniciás sesión con Google, imagen de perfil. " +
        "Si usás email y contraseña, guardamos la contraseña cifrada con hash; nunca la contraseña en " +
        "texto plano.",
      "Datos del negocio: nombre, país, enlace público de reservas, logo, horarios, servicios y miembros " +
        "del equipo.",
      "Datos de reservas: nombre, email, teléfono o WhatsApp, servicio, fecha y hora, y notas que el " +
        "negocio o el cliente final ingresan.",
      "Datos de pagos: estado de señas y suscripciones e identificadores de MercadoPago. No almacenamos " +
        "números de tarjeta ni códigos de seguridad.",
      "Datos técnicos: dirección IP, registros de acceso, tipo de dispositivo y cookies estrictamente " +
        "necesarias para mantener la sesión.",
    ],
  },
  {
    title: "Para qué usamos los datos",
    paragraphs: [
      "Prestar el servicio, crear y administrar tu cuenta, gestionar reservas y disponibilidad, cobrar " +
        "señas y suscripciones, enviar recordatorios y notificaciones, brindar soporte, prevenir fraudes " +
        "y mejorar la plataforma.",
      "La base legal es la ejecución del contrato, tu consentimiento, el interés legítimo en operar y " +
        "proteger el servicio, y el cumplimiento de obligaciones legales.",
    ],
  },
  {
    title: "Con quién compartimos datos",
    paragraphs: [
      "Supabase (autenticación y base de datos), Vercel (alojamiento), Google (inicio de sesión), " +
        "MercadoPago (pagos) y Resend (emails transaccionales).",
      "Estos proveedores pueden procesar datos fuera de Argentina. Aplicamos medidas contractuales y " +
        "técnicas razonables para proteger la información.",
      "También podemos divulgar datos si la ley lo exige o para proteger derechos, seguridad e integridad " +
        "de TurnoMas, los negocios o los clientes.",
    ],
  },
  {
    title: "Cookies y tecnologías similares",
    paragraphs: [
      "Usamos cookies de sesión estrictamente necesarias para autenticación y seguridad. No usamos " +
        "cookies publicitarias ni vendemos datos a terceros.",
      "Si en el futuro incorporamos analíticas o publicidad, actualizaremos esta política y, cuando " +
        "corresponda, pediremos consentimiento.",
    ],
  },
  {
    title: "Cuánto tiempo conservamos los datos",
    paragraphs: [
      "Mientras tu cuenta esté activa y durante los plazos necesarios para cumplir obligaciones legales, " +
        "resolver disputas y prevenir fraudes.",
      "Los datos de reservas y pagos pueden conservarse según las obligaciones fiscales, contables y " +
        "comerciales aplicables. Cuando dejan de ser necesarios, los eliminamos o anonimizamos.",
    ],
  },
  {
    title: "Tus derechos",
    paragraphs: [
      "Podés solicitar acceso, rectificación, actualización, supresión, oposición y portabilidad de tus " +
        "datos, y revocar el consentimiento cuando corresponda.",
      "Escribinos a soporte@turnomas.com. También podés presentar una reclamación ante la Agencia de " +
        "Acceso a la Información Pública (AAIP) de Argentina.",
    ],
  },
  {
    title: "Seguridad",
    paragraphs: [
      "Aplicamos medidas técnicas y organizativas razonables, como cifrado en tránsito, control de acceso " +
        "y contraseñas con hash. Ningún sistema es 100% seguro; si detectamos un incidente relevante, " +
        "actuaremos según la normativa aplicable.",
    ],
  },
  {
    title: "Menores de edad",
    paragraphs: [
      "El servicio está dirigido a personas mayores de 18 años. No recolectamos deliberadamente datos de " +
        "menores. Si detectamos una cuenta de un menor, la eliminaremos.",
    ],
  },
  {
    title: "Cambios a esta política",
    paragraphs: [
      "Podemos actualizar esta política para reflejar cambios en el servicio o en la normativa. " +
        "Publicaremos la versión vigente con su fecha de actualización. Si el cambio es sustancial, lo " +
        "comunicaremos por los medios disponibles.",
    ],
  },
];

export default function PrivacidadPage()
{
  return (
    <LegalDocument
      title="Política de privacidad"
      updatedAt="25 de octubre de 2026"
      intro={"En TurnoMas cuidamos los datos personales de quienes usan la plataforma. Esta política explica " +
        "qué datos recopilamos, para qué los usamos, con quién los compartimos y cómo podés ejercer tus " +
        "derechos."}
      sections={SECTIONS}
      contactEmail="soporte@turnomas.com"
    />
  );
}
