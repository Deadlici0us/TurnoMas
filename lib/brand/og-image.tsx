import { ImageResponse } from "next/og";

import { buildLogoSvg } from "@/lib/brand/logo-svg";

export const OG_ALT = "TurnoMas — Reservas, señas y recordatorios";
export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = "image/png";

const LOGO_DATA_URI = `data:image/svg+xml;base64,${btoa(buildLogoSvg({ size: 512 }))}`;

/**
 * Genera la imagen de preview para redes con la marca y la propuesta de valor.
 *
 * @return Respuesta PNG de 1200x630.
 */
export function renderOgImage(): ImageResponse
{
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          backgroundImage: "linear-gradient(135deg, #f8faff 0%, #e8f7ff 100%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <img
            src={LOGO_DATA_URI}
            width={120}
            height={120}
            alt=""
            style={{ borderRadius: 24 }}
          />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 76, fontWeight: 700, color: "#0b3052", letterSpacing: -3 }}>
              TurnoMas
            </div>
            <div style={{ fontSize: 28, color: "#475569" }}>
              Reservas, señas y recordatorios
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 34, fontWeight: 600, color: "#0b3052", maxWidth: 760 }}>
              Menos ausencias. Más agenda.
            </div>
            <div style={{ fontSize: 24, fontWeight: 600, color: "#06adef" }}>
              turnomas.com
            </div>
          </div>
          <div
            style={{
              display: "flex",
              padding: "14px 22px",
              borderRadius: 999,
              backgroundColor: "#06adef",
              color: "#ffffff",
              fontSize: 24,
              fontWeight: 600,
            }}
          >
            Probalo gratis
          </div>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
