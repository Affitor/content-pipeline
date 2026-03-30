# Contributing

Thanks for your interest in contributing to Content Pipeline!

## Reporting Issues

- Use [GitHub Issues](https://github.com/Affitor/content-pipeline/issues) to report bugs
- Include steps to reproduce, expected vs actual behavior, and your environment

## Proposing Features

- Open a [Feature Request](https://github.com/Affitor/content-pipeline/issues/new?template=feature_request.md) issue
- Describe the problem, your proposed solution, and any alternatives considered

## Submitting PRs

1. Fork the repo and create a branch from `main`
2. Name your branch `feat/description` or `fix/description`
3. Make your changes and ensure `npm run build` passes
4. Write a clear PR description explaining what changed and why
5. Submit the PR against `main`

## Local Development

```bash
git clone https://github.com/Affitor/content-pipeline.git
cd content-pipeline
npm install
cp .env.example .env.local
# Add your API keys to .env.local
npm run dev
```

## Code Style

- TypeScript strict mode
- ESLint config is included — run `npm run lint` before submitting
- Follow existing patterns in the codebase
