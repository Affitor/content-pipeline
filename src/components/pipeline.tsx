"use client";

import { useState, useCallback } from "react";
import type { ResearchArticle, ContentFormat, GeneratedPost, PostLength } from "@/lib/types";
import { POST_LENGTHS, TONE_PRESETS } from "@/lib/types";

const STEPS = ["Research", "Select", "Format", "Write"] as const;
const FORMATS: { value: ContentFormat; label: string; icon: string; desc: string }[] = [
  { value: "toplist", label: "Toplist", icon: "📋", desc: "Numbered list of items with data" },
  { value: "pov", label: "POV", icon: "💡", desc: "Bold opinion backed by data" },
  { value: "case-study", label: "Case Study", icon: "🏢", desc: "Deep-dive into one company" },
];

export default function Pipeline() {
  const [step, setStep] = useState(0);
  const [topic, setTopic] = useState("");
  const [articles, setArticles] = useState<ResearchArticle[]>([]);
  const [format, setFormat] = useState<ContentFormat>("toplist");
  const [postLength, setPostLength] = useState<PostLength>("medium");
  const [outputCount, setOutputCount] = useState(1);
  const [tone, setTone] = useState("default");
  const [customTone, setCustomTone] = useState("");
  const [posts, setPosts] = useState<GeneratedPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [writingIndex, setWritingIndex] = useState(-1);
  const [imageLoadingIds, setImageLoadingIds] = useState<Set<string>>(new Set());

  const selectedArticles = articles.filter((a) => a.selected);

  // Step 1: Research
  const handleResearch = useCallback(async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Research failed");
      setArticles(data.articles);
      setOutputCount(1); // reset output count on new research
      setStep(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Research failed");
    } finally {
      setLoading(false);
    }
  }, [topic]);

  // Step 2: Toggle article selection
  const toggleArticle = (id: string) => {
    setArticles((prev) =>
      prev.map((a) => (a.id === id ? { ...a, selected: !a.selected } : a))
    );
  };
  const selectAll = () => setArticles((prev) => prev.map((a) => ({ ...a, selected: true })));
  const clearAll = () => setArticles((prev) => prev.map((a) => ({ ...a, selected: false })));

  // Step 4: Write posts (streaming)
  const handleWrite = useCallback(async () => {
    const selected = articles.filter((a) => a.selected);
    if (selected.length === 0) return;
    setStep(3);
    setLoading(true);
    setError(null);
    setPosts([]);

    const count = Math.min(outputCount, selected.length);

    for (let i = 0; i < count; i++) {
      setWritingIndex(i);
      const primaryArticle = selected[i];
      const postId = `post-${Date.now()}-${i}`;

      setPosts((prev) => [
        ...prev,
        {
          id: postId,
          articleId: primaryArticle.id,
          format,
          content: "",
          createdAt: new Date().toISOString(),
        },
      ]);

      try {
        const res = await fetch("/api/write", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            article: primaryArticle,
            format,
            length: postLength,
            allArticles: selected,
            postIndex: i,
            totalPosts: count,
            tone,
            customTone: tone === "custom" ? customTone : undefined,
          }),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Write failed");
        }

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        if (reader) {
          let done = false;
          while (!done) {
            const { value, done: readerDone } = await reader.read();
            done = readerDone;
            if (value) {
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              // Keep last incomplete line in buffer
              buffer = lines.pop() || "";
              for (const line of lines) {
                if (line.startsWith("data: ") && line !== "data: [DONE]") {
                  try {
                    const parsed = JSON.parse(line.slice(6));
                    if (parsed.text) {
                      setPosts((prev) =>
                        prev.map((p) =>
                          p.id === postId
                            ? { ...p, content: p.content + parsed.text }
                            : p
                        )
                      );
                    }
                  } catch {
                    // skip malformed SSE lines
                  }
                }
              }
            }
          }
          // Process any remaining buffer
          if (buffer.startsWith("data: ") && buffer !== "data: [DONE]") {
            try {
              const parsed = JSON.parse(buffer.slice(6));
              if (parsed.text) {
                setPosts((prev) =>
                  prev.map((p) =>
                    p.id === postId
                      ? { ...p, content: p.content + parsed.text }
                      : p
                  )
                );
              }
            } catch {
              // skip
            }
          }
        }
      } catch (err) {
        // Mark the failed post with error content
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId && !p.content
              ? { ...p, content: "[Error: failed to generate this post]" }
              : p
          )
        );
        setError(err instanceof Error ? err.message : "Write failed");
        break; // Stop the loop on error
      }
    }
    setWritingIndex(-1);
    setLoading(false);
  }, [articles, format, postLength, outputCount, tone, customTone]);

  // Generate image for a post
  const handleGenerateImage = useCallback(
    async (postId: string) => {
      const post = posts.find((p) => p.id === postId);
      if (!post || !post.content) return;

      setImageLoadingIds((prev) => new Set(prev).add(postId));

      try {
        const dataRes = await fetch("/api/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            postContent: post.content,
            title: articles.find((a) => a.id === post.articleId)?.title || "",
            format: post.format,
          }),
        });
        const dataJson = await dataRes.json();
        if (!dataRes.ok) throw new Error(dataJson.error);

        const ogRes = await fetch("/api/og", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ infographic: dataJson.infographic }),
        });

        if (!ogRes.ok) throw new Error("Image render failed");

        const blob = await ogRes.blob();
        const imageUrl = URL.createObjectURL(blob);

        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, imageUrl, imageHtml: JSON.stringify(dataJson.infographic) }
              : p
          )
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Image generation failed");
      } finally {
        setImageLoadingIds((prev) => {
          const next = new Set(prev);
          next.delete(postId);
          return next;
        });
      }
    },
    [posts, articles]
  );

  // Copy post to clipboard
  const copyPost = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  // Download image
  const downloadImage = (imageUrl: string, postId: string) => {
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = `affitor-${postId}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(imageUrl);
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold">
            Affitor <span className="text-blue-400">Content Pipeline</span>
          </h1>
          <p className="text-slate-400 mt-1">
            Research → Select Articles → Choose Format → Write (EN + Image)
          </p>
        </div>
      </header>

      {/* Step Indicator */}
      <div className="max-w-4xl mx-auto px-6 py-6">
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <button
                onClick={() => i < step && !loading && setStep(i)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  i === step
                    ? "bg-blue-600 text-white"
                    : i < step && !loading
                    ? "bg-blue-600/20 text-blue-400 cursor-pointer hover:bg-blue-600/30"
                    : "bg-white/5 text-slate-500"
                }`}
              >
                {i + 1} {s}
              </button>
              {i < STEPS.length - 1 && (
                <span className="text-slate-600">→</span>
              )}
            </div>
          ))}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
            ✕ {error}
            <button
              onClick={() => setError(null)}
              className="ml-3 text-red-300 hover:text-white"
            >
              dismiss
            </button>
          </div>
        )}

        {/* Step 1: Research */}
        {step === 0 && (
          <section className="space-y-4">
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h2 className="text-lg font-semibold mb-4">📝 Topic</h2>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleResearch()}
                placeholder='e.g. "AI startups funding rounds March 2026"'
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50"
              />
              <button
                onClick={handleResearch}
                disabled={loading || !topic.trim()}
                className="mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-xl font-medium transition-colors"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Spinner /> Researching...
                  </span>
                ) : (
                  "🔍 Research"
                )}
              </button>
            </div>
          </section>
        )}

        {/* Step 2: Select Articles */}
        {step === 1 && (
          <section className="space-y-4">
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">
                  📄 Articles Found - pick the ones you want to use
                </h2>
                <span className="text-slate-400 text-sm">
                  {selectedArticles.length} selected
                </span>
              </div>
              <div className="flex gap-3 mb-4">
                <button
                  onClick={selectAll}
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  Select all
                </button>
                <button
                  onClick={clearAll}
                  className="text-sm text-slate-400 hover:text-slate-300"
                >
                  Clear
                </button>
              </div>
              <div className="space-y-3">
                {articles.map((article) => (
                  <div
                    key={article.id}
                    onClick={() => toggleArticle(article.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      article.selected
                        ? "bg-blue-600/10 border-blue-500/30"
                        : "bg-white/3 border-white/10 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-5 h-5 mt-0.5 rounded flex items-center justify-center text-xs flex-shrink-0 ${
                          article.selected
                            ? "bg-blue-600 text-white"
                            : "bg-white/10 text-transparent"
                        }`}
                      >
                        ✓
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-white">
                          {article.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 text-sm text-slate-400">
                          <span className="text-blue-400">{article.source}</span>
                          <span>·</span>
                          <span>{article.date}</span>
                          {article.keyData === "News" && (
                            <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded font-medium">
                              NEWS
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-400 mt-2">
                          {article.summary}
                        </p>
                        <p className="text-xs text-slate-500 mt-1 truncate">
                          {article.url}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {selectedArticles.length > 0 && (
              <button
                onClick={() => {
                  // Clamp outputCount to new selection size
                  setOutputCount((prev) => Math.min(prev, selectedArticles.length));
                  setStep(2);
                }}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-medium transition-colors"
              >
                Continue with {selectedArticles.length} article
                {selectedArticles.length > 1 ? "s" : ""} →
              </button>
            )}
          </section>
        )}

        {/* Step 3: Choose Format */}
        {step === 2 && (
          <section className="space-y-4">
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h2 className="text-lg font-semibold mb-4">🎯 Content Format</h2>
              <div className="grid grid-cols-3 gap-3">
                {FORMATS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setFormat(f.value)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      format === f.value
                        ? "bg-blue-600/20 border-blue-500/40 ring-1 ring-blue-500/30"
                        : "bg-white/3 border-white/10 hover:border-white/20"
                    }`}
                  >
                    <div className="text-2xl mb-2">{f.icon}</div>
                    <div className="font-medium">{f.label}</div>
                    <div className="text-sm text-slate-400 mt-1">{f.desc}</div>
                  </button>
                ))}
              </div>

              <h2 className="text-lg font-semibold mt-6 mb-4">🎤 Tone</h2>
              <div className="grid grid-cols-3 gap-2">
                {TONE_PRESETS.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTone(t.value)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      tone === t.value
                        ? "bg-blue-600/20 border-blue-500/40 ring-1 ring-blue-500/30"
                        : "bg-white/3 border-white/10 hover:border-white/20"
                    }`}
                  >
                    <div className="font-medium text-sm">{t.label}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{t.desc}</div>
                  </button>
                ))}
              </div>
              {tone === "custom" && (
                <textarea
                  value={customTone}
                  onChange={(e) => setCustomTone(e.target.value)}
                  placeholder="Describe the tone you want. E.g.: 'Write like a VC partner sharing insider knowledge with founders. Casual but authoritative.'"
                  className="mt-3 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 text-sm min-h-[80px]"
                />
              )}

              <div className="grid grid-cols-2 gap-6 mt-6">
                <div>
                  <h2 className="text-lg font-semibold mb-4">📏 Post Length</h2>
                  <div className="space-y-2">
                    {POST_LENGTHS.map((l) => (
                      <button
                        key={l.value}
                        onClick={() => setPostLength(l.value)}
                        className={`w-full p-3 rounded-xl border text-left transition-all ${
                          postLength === l.value
                            ? "bg-blue-600/20 border-blue-500/40 ring-1 ring-blue-500/30"
                            : "bg-white/3 border-white/10 hover:border-white/20"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{l.label}</span>
                          <span className="text-sm text-blue-400">{l.words}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h2 className="text-lg font-semibold mb-4">📊 Output Posts</h2>
                  <p className="text-sm text-slate-400 mb-3">
                    {selectedArticles.length} articles selected as source material.
                    How many posts do you want?
                  </p>
                  <div className="flex gap-2">
                    {[1, 2, 3, 5].filter(n => n <= selectedArticles.length).map((n) => (
                      <button
                        key={n}
                        onClick={() => setOutputCount(n)}
                        className={`flex-1 p-3 rounded-xl border text-center transition-all ${
                          outputCount === n
                            ? "bg-blue-600/20 border-blue-500/40 ring-1 ring-blue-500/30"
                            : "bg-white/3 border-white/10 hover:border-white/20"
                        }`}
                      >
                        <div className="text-xl font-bold">{n}</div>
                        <div className="text-xs text-slate-400">post{n > 1 ? "s" : ""}</div>
                      </button>
                    ))}
                  </div>
                  {outputCount > 1 && (
                    <p className="text-xs text-slate-500 mt-2">
                      Each post will focus on a different angle using all {selectedArticles.length} articles as context.
                    </p>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={handleWrite}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 rounded-xl font-medium transition-colors"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Spinner /> Writing...
                </span>
              ) : (
                "✍️ Write with Claude"
              )}
            </button>
          </section>
        )}

        {/* Step 4: Posts Output */}
        {step === 3 && (
          <section className="space-y-6">
            {loading && writingIndex >= 0 && (
              <div className="flex items-center gap-3 text-blue-400">
                <Spinner />
                Writing post {writingIndex + 1} of {Math.min(outputCount, selectedArticles.length)}...
              </div>
            )}
            {posts.map((post, i) => {
              const article = articles.find((a) => a.id === post.articleId);
              const isImageLoading = imageLoadingIds.has(post.id);
              const hasContent = post.content && !post.content.startsWith("[Error:");
              return (
                <div
                  key={post.id}
                  className="bg-white/5 rounded-2xl p-6 border border-white/10"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-sm text-blue-400 font-medium">
                        Post {i + 1}
                      </span>
                      {article && (
                        <span className="text-sm text-slate-500 ml-2">
                          from: {article.title}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => copyPost(post.content)}
                        disabled={!hasContent}
                        className="px-3 py-1.5 text-sm bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors"
                        title="Copy to clipboard"
                      >
                        📋 Copy
                      </button>
                      {!post.imageUrl && !isImageLoading && (
                        <button
                          onClick={() => handleGenerateImage(post.id)}
                          disabled={loading || !hasContent}
                          className="px-3 py-1.5 text-sm bg-blue-600/20 hover:bg-blue-600/30 disabled:opacity-30 disabled:cursor-not-allowed text-blue-400 rounded-lg transition-colors"
                        >
                          🖼️ Generate Image
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="whitespace-pre-wrap text-slate-200 text-sm leading-relaxed bg-white/3 rounded-xl p-4 max-h-[500px] overflow-y-auto">
                    {post.content || (
                      <span className="text-slate-500 flex items-center gap-2">
                        <Spinner /> Generating...
                      </span>
                    )}
                  </div>
                  {/* Image */}
                  {isImageLoading && (
                    <div className="mt-4 flex items-center gap-2 text-blue-400 text-sm">
                      <Spinner /> Generating infographic...
                    </div>
                  )}
                  {post.imageUrl && (
                    <div className="mt-4">
                      <img
                        src={post.imageUrl}
                        alt="Infographic"
                        className="rounded-xl max-w-[400px] border border-white/10"
                      />
                      <button
                        onClick={() => downloadImage(post.imageUrl!, post.id)}
                        className="mt-2 px-3 py-1.5 text-sm bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg transition-colors"
                      >
                        ⬇️ Download PNG
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            {!loading && posts.length > 0 && (
              <button
                onClick={() => {
                  setStep(0);
                  setPosts([]);
                  setArticles([]);
                  setTopic("");
                  setOutputCount(1);
                }}
                className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-medium transition-colors"
              >
                ↻ Start New Pipeline
              </button>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
