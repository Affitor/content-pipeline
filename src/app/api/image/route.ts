import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { postContent, title, format } = await req.json();

    if (!postContent) {
      return NextResponse.json(
        { error: "postContent is required" },
        { status: 400 }
      );
    }

    const client = new Anthropic();

    // Ask Claude to generate structured data for the infographic
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `You are an infographic designer for LinkedIn posts. Create structured data for a branded infographic.

## Brand Design System
- Background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%)
- Primary color: #3b82f6 (blue-500)
- Accent gradient: linear-gradient(135deg, #1e3a8a, #2563eb)
- Heading text: #ffffff
- Body text: #94a3b8
- Accent text: #60a5fa
- Card background: rgba(30, 58, 138, 0.3) with border 1px solid rgba(59, 130, 246, 0.2)
- Border radius: 12px
- Font: Space Grotesk for headings, Inter for body
- Size: 1080x1350px
- "SP" avatar badge in top-left corner

## Post Content
${postContent}

## Post Title (for header)
${title || ""}

## Format
${format || "toplist"}

## Instructions
Extract the key data points from the post and return a JSON object for rendering.

Return ONLY valid JSON, no markdown:
{
  "headline": "Short punchy headline (max 60 chars)",
  "subheadline": "One line context (max 80 chars)",
  "items": [
    {
      "label": "Item name",
      "value": "Key metric/detail",
      "detail": "Optional extra context"
    }
  ],
  "footer": "Takeaway line or CTA (max 80 chars)",
  "style": "grid" | "list" | "single"
}

- For toplist: use "grid" or "list" style, 4-8 items
- For POV: use "single" style, 2-3 key stats as items
- For case-study: use "list" style, 3-5 items showing the narrative arc
- Keep text concise — this is visual, not a wall of text`,
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Failed to generate infographic data" },
        { status: 500 }
      );
    }

    const infographicData = JSON.parse(jsonMatch[0]);

    return NextResponse.json({ infographic: infographicData });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Image generation failed" },
      { status: 500 }
    );
  }
}
