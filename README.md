# STOCKROLL

Frame your photos, keep your film recipes, and share your signature look

A personal photo-framing PWA for the step after Lightroom. It adds a shooting-info frame (camera, lens, film, Fujifilm simulation) to an edited photo and exports it at the right ratio for each platform. Photos are processed on-device only and are never stored on a server.

## Getting started

```bash
pnpm install
cp .env.example .env.local   # Supabase values are optional — framing works without them
pnpm dev
```

| Command                                        | Purpose                                                               |
| ---------------------------------------------- | --------------------------------------------------------------------- |
| `pnpm dev`                                     | Dev server                                                            |
| `pnpm build`                                   | Type check + production build (`dist/`, including the service worker) |
| `pnpm lint` / `pnpm check-types` / `pnpm test` | Lint / type check / Vitest                                            |
| `pnpm commit`                                  | Create a commit message with an allowed type                          |

## Docs

- [AGENTS.md](AGENTS.md) — single source of truth for architecture, styling and domain rules
- [docs/architecture.md](docs/architecture.md) — technical design and the reasoning behind it
- [docs/verification.md](docs/verification.md) — how to check what unit tests cannot reach (signed-in screens, migrations, devices)
