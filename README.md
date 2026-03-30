<p align="center">
  <img src="public/affitor-logo.svg" height="32" alt="Affitor" />
</p>

<h1 align="center">Content Pipeline</h1>

<p align="center">
  Research trending topics, select sources, and generate LinkedIn posts with branded infographics - powered by AI.
</p>

<p align="center">
  <a href="https://github.com/Affitor/content-pipeline/blob/main/LICENSE"><img src="https://img.shields.io/github/license/Affitor/content-pipeline" alt="License" /></a>
  <a href="https://github.com/Affitor/content-pipeline/stargazers"><img src="https://img.shields.io/github/stars/Affitor/content-pipeline" alt="Stars" /></a>
</p>

---

## Features

- **Research** - Search the web for trending articles using Brave Search API. Filter by News, LinkedIn, YouTube, or Blogs.
- **Select** - Browse results with auto-tags (Funding, AI, SaaS, Tools, Trends, Startup, Growth) and pick your sources.
- **Format** - Choose content format (Toplist, POV, Case Study, How-to), tone, length, language (EN/VN), and output count.
- **Write** - Generate LinkedIn posts with Claude Sonnet 4, streamed in real-time. All selected articles used as context.
- **Image** - Create branded infographics rendered server-side with Satori.

## How It Works

```
Topic
  → Brave Search (Web + News, sorted by freshness)
  → Select articles as source material
  → Configure: format, tone, length, language, output count
  → Claude writes posts (streaming, each with a different angle)
  → Satori renders branded infographics (1080x1350 LinkedIn optimal)
```

Select 7 articles but only output 2 posts? Each post uses all 7 as context but focuses on a different primary source - producing unique angles with richer data.

## Running Locally

```bash
git clone https://github.com/Affitor/content-pipeline.git
cd content-pipeline
npm install
cp .env.example .env.local
```

Add your API keys to `.env.local`:

```bash
# Get yours at https://console.anthropic.com/
ANTHROPIC_API_KEY=

# Get yours at https://brave.com/search/api/
BRAVE_SEARCH_API_KEY=
```

Then start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## One-Click Deploy

Deploy your own instance to Vercel:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Affitor/content-pipeline&env=ANTHROPIC_API_KEY,BRAVE_SEARCH_API_KEY&envDescription=API%20keys%20needed%20to%20run%20this%20app&envLink=https://github.com/Affitor/content-pipeline%23running-locally)

## Tech Stack

| Technology | Purpose |
|-----------|---------|
| [Next.js 16](https://nextjs.org) | App Router, API Routes, Edge Runtime |
| [Anthropic Claude](https://anthropic.com) | Content generation (Sonnet 4) |
| [Brave Search API](https://brave.com/search/api/) | Web + News search |
| [Satori](https://github.com/vercel/satori) | Server-side image generation |
| [Tailwind CSS v4](https://tailwindcss.com) | Styling |
| [TypeScript](https://typescriptlang.org) | Type safety |

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT - see [LICENSE](LICENSE) for details.

---

<p align="center">
  Built by <a href="https://affitor.com">Affitor</a>
</p>
