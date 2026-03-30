import { NextRequest, NextResponse } from "next/server";
import type { ResearchArticle } from "@/lib/types";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { topic } = await req.json();

    if (!topic || typeof topic !== "string") {
      return NextResponse.json(
        { error: "Topic is required" },
        { status: 400 }
      );
    }

    const braveApiKey = process.env.BRAVE_SEARCH_API_KEY;
    if (!braveApiKey) {
      return NextResponse.json(
        { error: "Brave Search API key not configured" },
        { status: 500 }
      );
    }

    // Search with Brave
    const searchUrl = new URL("https://api.search.brave.com/res/v1/web/search");
    searchUrl.searchParams.set("q", topic);
    searchUrl.searchParams.set("count", "20");
    searchUrl.searchParams.set("freshness", "pm"); // past month
    searchUrl.searchParams.set("text_decorations", "false");

    const searchRes = await fetch(searchUrl.toString(), {
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": braveApiKey,
      },
    });

    if (!searchRes.ok) {
      const errText = await searchRes.text();
      return NextResponse.json(
        { error: `Brave Search failed: ${searchRes.status} ${errText}` },
        { status: 502 }
      );
    }

    const searchData = await searchRes.json();
    const webResults = searchData.web?.results || [];

    // Structure Brave results directly — no Claude call needed
    // This keeps the research step fast (<3s)
    const articles: ResearchArticle[] = webResults
      .filter((r: { title?: string; url?: string }) => r.title && r.url)
      .map((r: { title: string; url: string; description?: string; age?: string; page_age?: string; meta_url?: { hostname?: string } }, i: number) => {
        // Extract source from hostname
        const hostname = r.meta_url?.hostname || new URL(r.url).hostname;
        const source = hostname
          .replace(/^www\./, "")
          .replace(/\.com$|\.org$|\.net$|\.io$/, "")
          .split(".")
          .pop() || hostname;
        const sourceName = source.charAt(0).toUpperCase() + source.slice(1);

        // Extract date from age field
        const age = r.age || r.page_age || "";
        let date = "Recent";
        if (age) {
          // Brave returns things like "2 days ago", "March 15, 2026"
          date = age;
        }

        return {
          id: `article-${i}-${Date.now()}`,
          title: r.title,
          source: sourceName,
          url: r.url,
          date,
          summary: r.description || "",
          keyData: "",
          selected: false,
        };
      })
      .slice(0, 15);

    return NextResponse.json({ articles });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Research failed" },
      { status: 500 }
    );
  }
}
