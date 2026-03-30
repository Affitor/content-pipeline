import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const infographic = body?.infographic;
    if (!infographic) {
      return new Response(JSON.stringify({ error: "infographic data required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const { headline, subheadline, items, footer, style } = infographic;

    const image = new ImageResponse(
      (
        <div
          style={{
            width: 1080,
            height: 1350,
            display: "flex",
            flexDirection: "column",
            background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
            padding: "60px",
            fontFamily: "Inter, sans-serif",
          }}
        >
          {/* SP Avatar Badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              marginBottom: "40px",
            }}
          >
            <div
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #1e3a8a, #2563eb)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "22px",
                fontWeight: 700,
                color: "#ffffff",
              }}
            >
              SP
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
              }}
            >
              <span style={{ color: "#ffffff", fontSize: "20px", fontWeight: 600 }}>
                Son Piaz
              </span>
              <span style={{ color: "#64748b", fontSize: "14px" }}>
                Founder & CEO, Affitor
              </span>
            </div>
          </div>

          {/* Headline */}
          <div
            style={{
              fontSize: "48px",
              fontWeight: 700,
              color: "#ffffff",
              lineHeight: 1.2,
              marginBottom: "12px",
              display: "flex",
            }}
          >
            {headline}
          </div>

          {/* Subheadline */}
          {subheadline && (
            <div
              style={{
                fontSize: "22px",
                color: "#94a3b8",
                marginBottom: "40px",
                display: "flex",
              }}
            >
              {subheadline}
            </div>
          )}

          {/* Items */}
          <div
            style={{
              display: "flex",
              flexDirection: style === "grid" ? "row" : "column",
              flexWrap: style === "grid" ? "wrap" : "nowrap",
              gap: "16px",
              flex: 1,
            }}
          >
            {(items || []).slice(0, 8).map(
              (
                item: { label: string; value: string; detail?: string },
                i: number
              ) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    background: "rgba(30, 58, 138, 0.3)",
                    border: "1px solid rgba(59, 130, 246, 0.2)",
                    borderRadius: "12px",
                    padding: "20px 24px",
                    width: style === "grid" ? "46%" : "100%",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      marginBottom: "6px",
                    }}
                  >
                    <span
                      style={{
                        color: "#60a5fa",
                        fontSize: "16px",
                        fontWeight: 600,
                      }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span
                      style={{
                        color: "#ffffff",
                        fontSize: "20px",
                        fontWeight: 600,
                      }}
                    >
                      {item.label}
                    </span>
                  </div>
                  <div
                    style={{
                      color: "#3b82f6",
                      fontSize: "18px",
                      fontWeight: 700,
                      display: "flex",
                    }}
                  >
                    {item.value}
                  </div>
                  {item.detail && (
                    <div
                      style={{
                        color: "#94a3b8",
                        fontSize: "14px",
                        marginTop: "4px",
                        display: "flex",
                      }}
                    >
                      {item.detail}
                    </div>
                  )}
                </div>
              )
            )}
          </div>

          {/* Footer */}
          {footer && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: "30px",
                paddingTop: "24px",
                borderTop: "1px solid rgba(59, 130, 246, 0.2)",
              }}
            >
              <span style={{ color: "#94a3b8", fontSize: "18px" }}>
                {footer}
              </span>
              <span style={{ color: "#3b82f6", fontSize: "16px", fontWeight: 600 }}>
                affitor.com
              </span>
            </div>
          )}
        </div>
      ),
      {
        width: 1080,
        height: 1350,
      }
    );

    return image;
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "OG image failed",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
