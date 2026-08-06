# Pulse

This repository uses a minimal pnpm workspace. It intentionally does not use Nx, Lerna, or another monorepo orchestrator.

## Layout

- `packages/` contains all workspace packages, including applications, shared libraries, and configuration packages.

## Commands

```sh
pnpm install
pnpm dev
pnpm build
pnpm lint
pnpm test
pnpm typecheck
```

The root commands run the matching script in each workspace package that defines it.
