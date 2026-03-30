# Content Pipeline

An AI-powered content pipeline that researches trending topics, lets you select sources, and generates LinkedIn posts with branded infographics.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Affitor/content-pipeline&env=ANTHROPIC_API_KEY,BRAVE_SEARCH_API_KEY&envDescription=API%20keys%20needed%20to%20run%20this%20app&envLink=https://github.com/Affitor/content-pipeline%23environment-variables)

## Features

- **Research** - Search the web for trending articles using Brave Search API (filter by News, LinkedIn, YouTube, Blogs)
- **Select** - Browse results with auto-tags (Funding, AI, SaaS, Tools, Trends) and pick your sources
- **Format** - Choose content format (Toplist, POV, Case Study, How-to), tone, length, language (EN/VN), and output count
- **Write** - Generate LinkedIn posts with Claude, streamed in real-time
- **Image** - Create branded infographics rendered server-side with Satori

## How It Works

```
Topic → Brave Search (Web + News) → Select articles → Configure format
  → Claude writes posts (streaming) → Satori renders infographics
```

Each post uses all selected articles as context but focuses on a different primary source, producing unique angles across multiple outputs.

## Tech Stack

- [Next.js 16](https://nextjs.org) - App Router, API Routes, Edge Runtime
- [Anthropic Claude](https://anthropic.com) - Content generation (Sonnet 4)
- [Brave Search API](https://brave.com/search/api/) - Web + News search
- [Satori / @vercel/og](https://github.com/vercel/satori) - Server-side image generation
- [Tailwind CSS v4](https://tailwindcss.com) - Styling
- [TypeScript](https://typescriptlang.org) - Type safety

## Running Locally

```bash
git clone https://github.com/Affitor/content-pipeline.git
cd content-pipeline
npm install
cp .env.example .env.local
```

Add your API keys to `.env.local`, then:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Claude API key from [console.anthropic.com](https://console.anthropic.com/) |
| `BRAVE_SEARCH_API_KEY` | Yes | Brave Search API key from [brave.com/search/api](https://brave.com/search/api/) |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[MIT](LICENSE)
