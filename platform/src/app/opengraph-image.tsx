import { ImageResponse } from "next/og";

export const alt = "Nival Tech — Cobra, haz que vuelvan y crece";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px 78px",
        background: "radial-gradient(circle at 80% 20%, rgba(190,157,83,.28), transparent 34%), #101010",
        color: "#f7f4ed",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <div style={{ width: 58, height: 58, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", background: "#b99a55", color: "#111", fontSize: 34, fontWeight: 900 }}>N</div>
        <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.03em" }}>Nival Tech</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 980 }}>
        <div style={{ color: "#bfa363", fontSize: 20, fontWeight: 800, letterSpacing: ".12em" }}>TECNOLOGÍA PARA NEGOCIOS</div>
        <div style={{ fontSize: 68, lineHeight: 1.02, fontWeight: 800, letterSpacing: "-0.055em" }}>Cobra mejor. Haz que vuelvan. Sabe qué hacer para crecer.</div>
        <div style={{ color: "#aaa59b", fontSize: 27, lineHeight: 1.4 }}>Nival Pay · Nival Puntos · Nival Intelligence</div>
      </div>
    </div>,
    size,
  );
}
