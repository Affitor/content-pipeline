import { NextRequest, NextResponse } from "next/server";
import type { ResearchArticle } from "@/lib/types";

export const maxDuration = 60;

interface BraveWebResult {
  title: string;
  url: string;
  description?: string;
  age?: string;
  page_age?: string;
  meta_url?: { hostname?: string };
}

interface BraveNewsResult {
  title: string;
  url: string;
  description?: string;
  age?: string;
  meta_url?: { hostname?: string; netloc?: string };
}

function parseAge(age: string): number {
  // Convert Brave age strings to hours for sorting
  // "2 hours ago" → 2, "3 days ago" → 72, "1 week ago" → 168
  const match = age.match(/(\d+)\s*(hour|day|week|month)/i);
  if (!match) return 9999;
  const num = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  if (unit === "hour") return num;
  if (unit === "day") return num * 24;
  if (unit === "week") return num * 168;
  if (unit === "month") return num * 720;
  return 9999;
}

function extractSource(url: string, metaUrl?: { hostname?: string; netloc?: string }): string {
  let hostname = metaUrl?.hostname || metaUrl?.netloc || "";
  if (!hostname) {
    try { hostname = new URL(url).hostname; } catch { hostname = url; }
  }
  const clean = hostname
    .replace(/^www\./, "")
    .replace(/\.com$|\.org$|\.net$|\.io$|\.co$/, "");
  // Map known domains
  const domainMap: Record<string, string> = {
    techcrunch: "TechCrunch",
    crunchbase: "Crunchbase",
    forbes: "Forbes",
    bloomberg: "Bloomberg",
    reuters: "Reuters",
    cnbc: "CNBC",
    venturebeat: "VentureBeat",
    theverge: "The Verge",
    wired: "Wired",
    sifted: "Sifted",
    pitchbook: "PitchBook",
    "the-information": "The Information",
    axios: "Axios",
    businessinsider: "Business Insider",
    linkedin: "LinkedIn",
  };
  const key = clean.split(".").pop() || clean;
  return domainMap[key] || key.charAt(0).toUpperCase() + key.slice(1);
}

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

    const headers = {
      Accept: "application/json",
      "Accept-Encoding": "gzip",
      "X-Subscription-Token": braveApiKey,
    };

    // Run Web Search + News Search in parallel for best coverage
    const [webRes, newsRes] = await Promise.all([
      fetch(
        `https://api.search.brave.com/res/v1/web/search?${new URLSearchParams({
          q: topic,
          count: "20",
          freshness: "pm",
          text_decorations: "false",
        })}`,
        { headers }
      ),
      fetch(
        `https://api.search.brave.com/res/v1/news/search?${new URLSearchParams({
          q: topic,
          count: "15",
          freshness: "pw", // past week for news — most recent
        })}`,
        { headers }
      ).catch(() => null), // News search may fail on some plans
    ]);

    if (!webRes.ok) {
      const errText = await webRes.text();
      return NextResponse.json(
        { error: `Brave Search failed: ${webRes.status} ${errText}` },
        { status: 502 }
      );
    }

    const webData = await webRes.json();
    const webResults: BraveWebResult[] = webData.web?.results || [];

    let newsResults: BraveNewsResult[] = [];
    if (newsRes?.ok) {
      const newsData = await newsRes.json();
      newsResults = newsData.results || [];
    }

    // Combine and deduplicate by URL
    const seen = new Set<string>();
    const combined: { title: string; url: string; description: string; age: string; source: string; isNews: boolean }[] = [];

    // News results first — they're fresher and more relevant
    for (const r of newsResults) {
      if (!r.title || !r.url || seen.has(r.url)) continue;
      seen.add(r.url);
      combined.push({
        title: r.title,
        url: r.url,
        description: r.description || "",
        age: r.age || "",
        source: extractSource(r.url, r.meta_url),
        isNews: true,
      });
    }

    // Then web results
    for (const r of webResults) {
      if (!r.title || !r.url || seen.has(r.url)) continue;
      seen.add(r.url);
      combined.push({
        title: r.title,
        url: r.url,
        description: r.description || "",
        age: r.age || r.page_age || "",
        source: extractSource(r.url, r.meta_url),
        isNews: false,
      });
    }

    // Sort: news first, then by freshness (smallest age = most recent)
    combined.sort((a, b) => {
      // News always on top
      if (a.isNews && !b.isNews) return -1;
      if (!a.isNews && b.isNews) return 1;
      // Then by age (most recent first)
      return parseAge(a.age) - parseAge(b.age);
    });

    const articles: ResearchArticle[] = combined.slice(0, 15).map((r, i) => ({
      id: `article-${i}-${Date.now()}`,
      title: r.title,
      source: r.source,
      url: r.url,
      date: r.age || "Recent",
      summary: r.description,
      keyData: r.isNews ? "News" : "",
      selected: false,
    }));

    return NextResponse.json({ articles });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Research failed" },
      { status: 500 }
    );
  }
}
