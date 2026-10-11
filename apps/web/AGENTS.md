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

Use TypeScript and TSX, two-space indentation, single quotes, and Prettier formatting (`.prettierrc`). ESLint enforces Next.js rules and sorted imports and exports. Name React components and files in PascalCase (`SkillsSection.tsx`), utilities in camelCase (`getEmptySkillsMessage.ts`), hooks `useSomething.ts`, and tests `*.test.ts`.

- Use `interface` only for React component props, named `ComponentNameProps`. Props that inherit existing props without adding fields use a named `type` alias instead of an empty interface. Use `type` for domain models, API payloads, hook options, form values, and other data. Library module augmentation in `.d.ts` files may require an interface for declaration merging.
- Keep request-only types beside their API function. Put domain types in `entities/*/model/` and Zod validation schemas in the feature's `constants/`.
- Export modules through `index.ts` barrels. Import across segments through barrels, for example `import type { ProfileFormValues } from '../model'`. Inside a segment, direct imports are allowed to avoid circular dependencies.
- Keep server-only API exports in a separate `api/server.ts` barrel; never re-export them from a barrel consumed by client components.
- Put `'use client'` at the server/client entry boundary. Its props must be serializable. Nested components inherit the client context and may receive ordinary callbacks without their own directive; do not rename client callbacks to `*Action` to suppress diagnostics.
- Use arrow functions and named React imports, including `import type { ComponentProps } from 'react'`; avoid `React.ComponentProps` and namespace imports.
- Split large UI components by responsibility. Avoid nested ternaries; extract message selection and other branching logic into helpers.
- Keep reusable hooks in `shared/hooks/` and shared dictionaries in the existing `shared/contants/` directory. Use shadcn components through `shared/ui/`.
- Use React Hook Form with Zod for forms. Display experience in years rounded to tenths and send months to the API; preserve existing months when experience is unchanged.

## Testing Guidelines

Vitest runs `src/**/*.test.ts` in Node. Keep tests near the code, typically in `__tests__/`. Test meaningful edge cases, especially parsing and shared utilities. No coverage threshold is configured. Before a PR, run `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build`.

## Commit & Pull Request Guidelines

Recent commits commonly use a short imperative subject with a type and optional scope, such as `feat(web): add role-based routes` or `fix: correct session handling`. Keep each branch and PR focused on one task. Use the repository PR template to describe changes, verification, and any environment or API compatibility impact. Link the relevant issue when one exists; include screenshots for visible UI changes. Ask another developer to review before merging.

## Configuration & Security

Copy settings from `.env.example`; do not commit `.env` or secrets. `API_PROXY_TARGET` controls the server-side API proxy. Treat every `NEXT_PUBLIC_*` value as visible to browser users.
