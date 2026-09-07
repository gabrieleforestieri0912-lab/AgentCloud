import { ImageResponse } from "next/og";
import { BUNDLES, getBundleBySlug, getBundleAgents } from "@/lib/bundles";

export const runtime = "nodejs";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return BUNDLES.map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const bundle = getBundleBySlug(slug);
  return {
    title: bundle?.name ?? "Bundle",
    description: bundle?.description ?? "",
  };
}

export default async function Image({ params }: Props) {
  const { slug } = await params;
  const bundle = getBundleBySlug(slug);

  if (!bundle) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#0a0a0f",
            color: "white",
            fontSize: 40,
            fontFamily: "sans-serif",
          }}
        >
          AgentCloud
        </div>
      ),
      { width: 1200, height: 630 },
    );
  }

  const agents = getBundleAgents(bundle);
  const priceMo = `€${(bundle.pricing.yearly / 100).toFixed(2).replace(".", ",")}/mo`;

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
            fontSize: 32,
            fontWeight: 800,
            letterSpacing: "-0.02em",
          }}
        >
          <span style={{ color: "#0389fe" }}>Agent</span>
          <span style={{ color: "#ffffff" }}>Cloud</span>
          <span
            style={{
              marginLeft: 14,
              fontSize: 16,
              fontWeight: 700,
              color: "#10b981",
              background: "rgba(16,185,129,0.15)",
              padding: "5px 12px",
              borderRadius: 16,
            }}
          >
            BUNDLE
          </span>
        </div>

        {/* Bundle name */}
        <div
          style={{
            marginTop: 36,
            fontSize: 56,
            fontWeight: 800,
            lineHeight: 1.1,
            maxWidth: 900,
          }}
        >
          {bundle.name}
        </div>

        {/* Description */}
        <div
          style={{
            marginTop: 16,
            fontSize: 24,
            color: "#a3a3a3",
            maxWidth: 800,
            lineHeight: 1.4,
          }}
        >
          {bundle.description}
        </div>

        {/* Agents count + price */}
        <div
          style={{
            marginTop: 40,
            display: "flex",
            alignItems: "center",
            gap: 30,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: 24,
              fontWeight: 700,
              color: "#e3e3e8",
              background: "rgba(255,255,255,0.06)",
              padding: "12px 24px",
              borderRadius: 12,
            }}
          >
            {agents.length} agenti inclusi
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 8,
            }}
          >
            <span
              style={{
                fontSize: 36,
                fontWeight: 800,
                color: "#0389fe",
              }}
            >
              {priceMo}
            </span>
            <span style={{ fontSize: 18, color: "#71738e" }}>
              · fino a -30%
            </span>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
