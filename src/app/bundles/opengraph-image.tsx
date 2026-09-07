import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "AgentCloud — Bundle di Agenti AI con sconti fino al 30%";
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
        {/* Brand */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: 36,
            fontWeight: 800,
            letterSpacing: "-0.02em",
          }}
        >
          <span style={{ color: "#0389fe" }}>Agent</span>
          <span style={{ color: "#ffffff" }}>Cloud</span>
          <span
            style={{
              marginLeft: 16,
              fontSize: 18,
              fontWeight: 700,
              color: "#0389fe",
              background: "rgba(3,139,254,0.15)",
              padding: "6px 14px",
              borderRadius: 20,
            }}
          >
            BUNDLES
          </span>
        </div>

        {/* Title */}
        <div
          style={{
            marginTop: 40,
            fontSize: 60,
            fontWeight: 800,
            lineHeight: 1.1,
            maxWidth: 900,
          }}
        >
          Bundle di Agenti AI
        </div>

        {/* Subtitle */}
        <div
          style={{
            marginTop: 20,
            fontSize: 28,
            color: "#a3a3a3",
            maxWidth: 800,
          }}
        >
          Risparmia fino al 30% con piani trimestrali e annuali
        </div>

        {/* Savings badges */}
        <div
          style={{
            marginTop: 40,
            display: "flex",
            gap: 20,
          }}
        >
          {[
            { text: "-15% Trimestrale", color: "#10b981" },
            { text: "-30% Annuale", color: "#10b981" },
            { text: "4 Bundle", color: "#0389fe" },
          ].map((badge) => (
            <div
              key={badge.text}
              style={{
                display: "flex",
                alignItems: "center",
                fontSize: 22,
                fontWeight: 700,
                color: badge.color,
                background: `${badge.color}15`,
                padding: "10px 20px",
                borderRadius: 12,
              }}
            >
              {badge.text}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
