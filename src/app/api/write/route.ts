import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;
import type { ResearchArticle, ContentFormat } from "@/lib/types";
import { toplistPrompt } from "@/lib/prompts/toplist";
import { povPrompt } from "@/lib/prompts/pov";
import { caseStudyPrompt } from "@/lib/prompts/case-study";

const promptFns: Record<ContentFormat, (a: ResearchArticle) => string> = {
  toplist: toplistPrompt,
  pov: povPrompt,
  "case-study": caseStudyPrompt,
};

export async function POST(req: NextRequest) {
  try {
    const { article, format } = (await req.json()) as {
      article: ResearchArticle;
      format: ContentFormat;
    };

    if (!article || !format) {
      return new Response(JSON.stringify({ error: "article and format required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const promptFn = promptFns[format];
    if (!promptFn) {
      return new Response(JSON.stringify({ error: `Unknown format: ${format}` }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const client = new Anthropic();

    const stream = await client.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: promptFn(article),
        },
      ],
    });

    // Stream the response as SSE
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              const data = JSON.stringify({ text: event.delta.text });
              controller.enqueue(
                encoder.encode(`data: ${data}\n\n`)
              );
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : "Stream error";
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: errMsg })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Write failed",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
