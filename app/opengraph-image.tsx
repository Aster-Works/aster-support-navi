import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Aster Support Navi";

// 既定のOG画像。和文フォント・絵文字グリフの動的取得を避け、英字＋図形のみで構成する。
export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0d1b2a",
          color: "#ffffff",
          padding: 80,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              background: "#d4a24c",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: "50%",
                background: "#0d1b2a",
              }}
            />
          </div>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 700 }}>
            Aster Support Navi
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 64,
              fontWeight: 700,
              lineHeight: 1.15,
            }}
          >
            <div style={{ display: "flex" }}>Find local support</div>
            <div style={{ display: "flex" }}>you might be missing.</div>
          </div>
          <div style={{ display: "flex", fontSize: 26, color: "#d4a24c" }}>
            Tokyo wards - childbirth &amp; childcare support
          </div>
        </div>

        <div
          style={{ display: "flex", fontSize: 22, color: "rgba(255,255,255,0.7)" }}
        >
          Aster Works - small tools for the everyday paperwork of life
        </div>
      </div>
    ),
    { ...size },
  );
}
