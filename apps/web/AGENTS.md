# Repository Guidelines

## Project Structure & Module Organization

This `apps/web` workspace uses Next.js App Router. Keep routes, layouts, loading states, and handlers in `src/app/`. Follow the Feature-Sliced Design layout: `src/screens/` composes pages, `src/widgets/` holds shared blocks, `src/features/` contains user actions, `src/entities/` holds domain models and API calls, and `src/shared/` contains reusable API clients, UI, and utilities. Put static assets in `public/`. Use `@/` for imports from `src/`.

## Build, Test, and Development Commands

Run these commands from `apps/web`:

- `npm run dev` starts Next.js on port 5173.
- `npm run build` creates a production build; `npm run typecheck` checks TypeScript without emitting files.
- `npm run lint` runs ESLint with zero warnings allowed.
- `npm test` runs Vitest once; `npm run test:watch` runs it interactively.

The root workspace also exposes equivalent npm scripts. Install web dependencies from the repository root with `npm install <package> -w apps/web` so the root lockfile stays current.

## Coding Style & Naming Conventions

Use TypeScript and TSX, two-space indentation, single quotes, and Prettier formatting (`.prettierrc`). ESLint enforces Next.js rules and sorted imports and exports. Name React components and files in PascalCase (`SkillsSection.tsx`), utilities in camelCase (`getEmptySkillsMessage.ts`), and tests `*.test.ts`. Prefer interfaces for object-shaped domain data and component props. Keep request-only parameter interfaces beside their API function; place reusable domain models in `entities/*/model/`. Avoid deeply nested conditional JSX; extract components or small helpers.

## Testing Guidelines

Vitest runs `src/**/*.test.ts` in Node. Keep tests near the code, typically in `__tests__/`. Test meaningful edge cases, especially parsing and shared utilities. No coverage threshold is configured. Before a PR, run `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build`.

## Commit & Pull Request Guidelines

Recent commits commonly use a short imperative subject with a type and optional scope, such as `feat(web): add role-based routes` or `fix: correct session handling`. Keep each branch and PR focused on one task. Use the repository PR template to describe changes, verification, and any environment or API compatibility impact. Link the relevant issue when one exists; include screenshots for visible UI changes. Ask another developer to review before merging.

## Configuration & Security

Copy settings from `.env.example`; do not commit `.env` or secrets. `API_PROXY_TARGET` controls the server-side API proxy. Treat every `NEXT_PUBLIC_*` value as visible to browser users.
