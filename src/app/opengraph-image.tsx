import { ImageResponse } from "next/og";

export const runtime = "nodejs";

export const alt = "AgentCloud — Agenti AI per la tua azienda";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background:
            "linear-gradient(135deg, #0a0a0f 0%, #12121a 58%, #0a0a0f 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: 40,
            fontWeight: 800,
            letterSpacing: "-0.02em",
          }}
        >
          <span style={{ color: "#0389fe" }}>Agent</span>
          <span style={{ color: "#ffffff" }}>Cloud</span>
        </div>

        <div
          style={{
            marginTop: 30,
            fontSize: 64,
            fontWeight: 800,
            lineHeight: 1.05,
            maxWidth: 940,
            display: "flex",
          }}
        >
          Agenti AI che automatizzano la tua azienda
        </div>

        <div
          style={{
            marginTop: 26,
            fontSize: 30,
            color: "#a3a3a3",
            maxWidth: 940,
            display: "flex",
          }}
        >
          Automatizza workflow, supporto e vendite — senza codice.
        </div>
      </div>
    ),
    { ...size },
  );
}
