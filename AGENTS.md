# Repository Guidelines

## General Instructions

- ALWAYS • run•bun run lint'
  after making any changes = fix any linting errors you get
- ALWAYS check for type errors via 'bun tsc --noEmit'
- ALWAYS run 'bun run format' AFTER you're done with your task and you edited all files that needed editing
- ALWAYS run unit tests via 'bun run test'
- ALWAYS run e2e tests via bun run test:e2e |

## Project Structure & Module Organization

This repository uses Bun, TypeScript, and the Next.js App Router. Route pages and layouts live under `app/` (for example, `app/notes/[id]/page.tsx`); shared React components belong in `src/components/`, and type declarations in `src/types/`. Global styles are in `app/globals.css`. `SPEC.MD` is the product and architecture reference.

## Build, Test, and Development Commands

Use Bun, as declared by the scripts and `bun.lock`:

- `bun run dev` starts the local Next.js development server.
- `bun run build` creates a production build; `bun run start` serves it.
- `bun run lint` runs Oxlint.
- `bun run format` formats supported files with Oxfmt.
- `bunx tsc --noEmit` checks TypeScript types.

No test script or test framework is configured yet.

## Coding Style & Naming Conventions

Use TypeScript and React Server Components by default. Name route files according to Next.js conventions (`page.tsx`, `layout.tsx`, `not-found.tsx`). Use PascalCase for React component names and kebab-case for shared component filenames, such as `page-card.tsx`. Keep shared UI in `src/components/` and reuse it across routes. Run `bun run format` and `bun run lint` before submitting changes.

## Architecture Guidelines

Follow `SPEC.MD`: perform data reads in Server Components through server-side data access, and implement server mutations with Server Actions. Avoid client-side data fetching, mutation API routes, query-parameter features, search, and filtering. Note bodies use TipTap JSON in `content_json`; do not add a `content_text` field. Keep public shared-note rendering sanitized and user-facing errors generic.

## Testing Guidelines

For changes, run `bunx tsc --noEmit` and `bun run lint`; run `bun run build` for route or production-build changes. If a test framework is added, colocate tests with related features and document how to run them.

## Commit & Pull Request Guidelines

The visible history contains an initial commit and file-change summary commits, so no established message convention is evident. Use a short imperative subject, such as `Add notes route scaffold`. Pull requests should summarize behavior and key files, link related issues when available, and include screenshots for visible UI changes. Note validation commands and any failures in the PR description.

## Security & Configuration

Keep secrets and local database files out of version control. Follow the spec's environment variable guidance, enforce ownership on authenticated note operations, and never expose SQL or internal errors in user-facing messages.
