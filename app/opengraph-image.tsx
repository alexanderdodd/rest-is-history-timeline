import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/site";

export const alt =
  "The Rest Is History Timeline — a visual timeline of human history mapped to podcast episodes";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Auto-generated OpenGraph image for the home page.
 * Lives at `/opengraph-image` after build; Next wires it into the page's
 * og:image and twitter:image automatically (via the file-based convention).
 */
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "80px",
          background:
            "radial-gradient(1400px 900px at 18% -10%, rgba(212, 168, 90, 0.18), transparent 60%), radial-gradient(1100px 700px at 110% 110%, rgba(106, 111, 179, 0.18), transparent 60%), #0c0d12",
          color: "#e7eaf3",
          fontFamily: '"Georgia", serif',
        }}
      >
        <div
          style={{
            fontSize: 28,
            color: "#d4a85a",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          {SITE_NAME}
        </div>
        <div
          style={{
            fontSize: 110,
            fontWeight: 700,
            lineHeight: 1.05,
            marginTop: 28,
            letterSpacing: "-0.02em",
          }}
        >
          A timeline of human history.
        </div>
        <div
          style={{
            fontSize: 38,
            marginTop: 28,
            color: "#9aa0b3",
            maxWidth: 980,
            lineHeight: 1.3,
          }}
        >
          Every episode of The Rest Is History, plotted on the period it covers.
        </div>
        <div
          style={{
            marginTop: "auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            color: "#9aa0b3",
            fontSize: 24,
            fontFamily: "system-ui, sans-serif",
            letterSpacing: "0.04em",
          }}
        >
          <span>3000 BC → present</span>
          <span style={{ color: "#d4a85a", fontWeight: 600 }}>
            Tom Holland · Dominic Sandbrook
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}
