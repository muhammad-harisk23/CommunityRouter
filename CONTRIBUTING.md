# Contributing to CommunityRouter

Thank you for your interest in contributing to CommunityRouter — pre-post onboarding infrastructure for Reddit communities.

This document provides guidelines for contributing to the project, including setup instructions, coding standards, and the pull request process.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [TypeScript & Type Safety](#typescript--type-safety)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Commit Messages](#commit-messages)
- [Reporting Issues](#reporting-issues)
- [Feature Requests](#feature-requests)
- [Documentation](#documentation)

---

## Code of Conduct

This project adheres to a code of conduct that all contributors are expected to follow. In short:

- **Be respectful.** Disagreement is fine, personal attacks are not.
- **Be constructive.** Criticism should be specific, actionable, and kind.
- **Be inclusive.** We welcome contributors of all backgrounds and experience levels.

---

## Getting Started

### Prerequisites

- **Node.js >= 22.2.0** (required by Devvit runtime)
- **Reddit Developer Account** — [developers.reddit.com](https://developers.reddit.com)
- **Devvit CLI** — installed via `npm create devvit@latest`
- **Git**

### Local Setup

```bash
# 1. Clone the repository
git clone https://github.com/your-org/communityrouter.git
cd communityrouter

# 2. Install dependencies
npm install

# 3. Run type checking (verify everything compiles)
npm run type-check

# 4. Run tests
npm run test

# 5. Start Devvit playtest (requires Devvit login)
npm run dev
```

### First-time Devvit Setup

If you haven't used Devvit before:

```bash
# Install the Devvit CLI
npm create devvit@latest

# Log in to your Reddit developer account
npx devvit login

# Link the project (follow the prompts)
npx devvit upload
```

---

## Development Workflow

### Branch Strategy

- `main` — stable, deployable state. Protected.
- Feature branches: `feature/<short-description>` (e.g., `feature/guided-refinement`)
- Bug fix branches: `fix/<short-description>` (e.g., `fix/race-condition-routing`)
- Chore branches: `chore/<short-description>` (e.g., `chore/update-deps`)

### Local Development Loop

```bash
# 1. TypeScript type checking (always first)
npm run type-check

# 2. Lint
npm run lint

# 3. Build
npm run build

# 4. Test
npm run test
```

### Devvit-Specific Workflow

CommunityRouter runs inside Reddit's Devvit sandbox. The development cycle differs from a standard web app:

1. **Build** the client and server with `npm run build`
2. **Upload** to Devvit with `npx devvit upload`
3. **Playtest** on your test subreddit via the Devvit dashboard

For quick UI iteration, you can serve the client build locally using `serve-test.mjs`:

```bash
# Build the client
npx vite build

# Serve the client build locally at http://localhost:5175
node serve-test.mjs
```

> **Note:** The local server serves a static build without backend API connectivity. Analytics and Redis persistence will not be available.

---

## Project Structure

```
communityrouter/
├── src/
│   ├── client/          # React frontend (runs in Reddit iFrame)
│   │   ├── splash.tsx   # Inline post preview (lightweight entrypoint)
│   │   ├── game.tsx     # Expanded view (main app)
│   │   ├── ErrorBoundary.tsx
│   │   ├── index.css    # Tailwind + theme CSS variables
│   │   └── trpc.ts      # tRPC client
│   ├── server/          # Devvit serverless backend
│   │   ├── index.ts     # Hono server entry
│   │   ├── trpc.ts      # tRPC router
│   │   ├── core/        # Business logic + Redis
│   │   └── routes/      # Menu and trigger handlers
│   └── shared/          # Types and validation (shared client/server)
├── assets/screenshots/  # README screenshots
├── tools/               # TypeScript project references
└── config files         # vite, vitest, eslint, prettier, etc.
```

### Key Files

| File | Purpose |
|---|---|
| `src/client/splash.tsx` | Lightweight entry point shown in the Reddit feed. Keep dependencies minimal. |
| `src/client/game.tsx` | Full app with onboarding panel, moderator dashboard, analytics, and live preview. |
| `src/server/trpc.ts` | tRPC router. Add new queries and mutations here. |
| `src/server/core/communityRouter.ts` | Redis persistence layer and analytics engine. |
| `src/shared/communityRouter.ts` | Zod schemas, TypeScript types, and default data. |
| `devvit.json` | Devvit entrypoint and permission configuration. |
| `master-context.md` | Product vision document. Read this before making architectural decisions. |
| `AGENTS.md` | AI coding assistant guide with tech stack and conventions. |

---

## Coding Standards

### General Principles

- **Simplicity over complexity.** Prefer clear, readable code over clever abstractions.
- **Minimal changes.** Make the smallest change possible to achieve the goal.
- **Consistency.** Match the style and patterns of surrounding code.
- **Intent over implementation.** Code should communicate *why* it exists, not just *what* it does.

### TypeScript & Type Safety

- **Prefer type aliases** over interfaces.
- **Prefer named exports** over default exports.
- **Never cast with `as any`** — use proper type narrowing or Zod validation.
- **Avoid type assertions** (`as Type`) unless absolutely necessary for tRPC or Devvit interop.
- **Use Zod schemas** for runtime validation at the server boundary.

### React

- **Use functional components** with hooks.
- **Keep components focused.** If a file exceeds 400 lines, consider extracting sub-components.
- **Use `useCallback` and `useMemo`** for referential stability where it matters (e.g., effect dependencies).
- **Avoid prop drilling.** Extract state into the parent component or use composition.
- **Error boundaries** should wrap major sections of the app (see `ErrorBoundary.tsx`).

### CSS & Styling

- **Use Tailwind CSS 4 utility classes.** Avoid custom CSS files except for animations and theme variables.
- **Theme variables** are defined in `index.css` as CSS custom properties. Use `var(--token)` for theme-aware styling.
- **Light mode** must be explicitly handled via `[data-theme='light']` overrides in `index.css`.
- **Animations** should be subtle (180–400ms) and respect `prefers-reduced-motion`.

### Navigation

- **Use `navigateTo` from `@devvit/web/client`** — not `window.location` or `window.assign`.
- **Use `requestExpandedMode`** to transition from splash (inline) to game (expanded) view.

### Data Fetching

- Use **tRPC** for all client-server communication.
- Add procedures to `src/server/trpc.ts` and call them via the client instance in `src/client/trpc.ts`.
- Handle loading, error, and empty states for every query.

---

## Testing

### Running Tests

```bash
# Run all tests
npm run test

# Run a specific test file
npm run test -- src/client/splash.test.ts

# Run with coverage
npx vitest run --coverage
```

### Writing Tests

- **Test behavior, not implementation.** Prefer testing user-facing outcomes over internal state.
- **Cover edge cases:** loading states, empty states, error states, and success paths.
- **Use descriptive test names** that explain the scenario and expected behavior.
- **Keep tests small and focused** — one assertion per test where possible.

### Test File Placement

- Place test files adjacent to the source file they test.
- Name convention: `*.test.ts` or `*.test.tsx`.

---

## Pull Request Process

### Before Submitting

1. **Rebase on `main`** to keep history clean.
2. **Run the full validation suite:**
   ```bash
   npm run type-check
   npm run lint
   npm run test
   npm run build
   ```
3. **Review your own diff.** Look for:
   - Unused imports or variables
   - Debugging code (console.log, commented-out code)
   - Missing edge case handling
   - Inconsistent naming or formatting
4. **Write a clear PR description** (see template below).

### PR Template

```markdown
## Summary

One-sentence description of what this PR does.

## Changes

- List of specific changes (bullet points)
- Focus on WHAT changed, not why

## Testing

- [ ] Type-check passes (`npm run type-check`)
- [ ] Lint passes (`npm run lint`)
- [ ] Tests pass (`npm run test`)
- [ ] Build succeeds (`npm run build`)

## Screenshots

<!-- If UI changes, add before/after screenshots -->

## Related Issues

Closes #N
```

### Review Process

1. At least one maintainer must review and approve.
2. All CI checks must pass.
3. Address review feedback with additional commits (no force-pushing).
4. Squash and merge into `main` once approved.

---

## Commit Messages

We follow a lightweight conventional commit format:

```
<type>: <short description>

<optional body>
```

### Types

| Type | Use Case |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `style` | Formatting, missing semicolons, etc. (no logic change) |
| `docs` | Documentation only |
| `test` | Adding or updating tests |
| `chore` | Build process, tooling, dependencies |
| `perf` | Performance improvement |

### Examples

```
feat: add guided refinement step to onboarding flow

Users can now answer follow-up questions (beginner/experienced,
remote/local) after selecting an intent. This personalizes the
recommendation cards they see next.
```

```
fix: cancel pending routing timeout on new category selection

Previously, rapidly clicking multiple categories created race
conditions where stale timeouts would set incorrect routing state.
```

```
docs: add screenshots to README
```

---

## Reporting Issues

### Bug Reports

When reporting a bug, include:

1. **Steps to reproduce** — what did you do?
2. **Expected behavior** — what should have happened?
3. **Actual behavior** — what actually happened?
4. **Environment** — browser, OS, Node version
5. **Screenshots or logs** — if applicable

### Issue Labels

- `bug` — confirmed bug
- `enhancement` — feature request
- `good first issue` — beginner-friendly
- `help wanted` — needs contributor
- `question` — needs clarification

---

## Feature Requests

CommunityRouter is **onboarding infrastructure** — not a feature marketplace. Before proposing a feature, read `master-context.md` to understand the product vision.

### In Scope

- Onboarding UX improvements
- Moderator tooling enhancements
- Accessibility and performance
- Documentation and testing
- Devvit platform integration

### Explicitly Out of Scope

- AI recommendation engines
- Chat or messaging systems
- External API integrations
- Freelancer marketplaces
- Authentication or karma gating
- Payment or subscription systems

If your feature request aligns with the product vision, open an issue with:
1. **Problem** — what pain point does this solve?
2. **Proposed solution** — how would it work?
3. **Alternatives considered** — what else did you think about?

---

## Documentation

Good documentation is as important as good code.

### Where to Document

| What | Where |
|---|---|
| Architecture decisions | `master-context.md` |
| Setup and usage | `README.md` |
| Contributing guidelines | `CONTRIBUTING.md` |
| AI coding assistant rules | `AGENTS.md` |
| Code examples | Inline JSDoc comments |
| API procedures | tRPC router comments (`src/server/trpc.ts`) |

### Screenshots

When adding or changing UI, update the screenshots in `assets/screenshots/` to reflect the new state. Captured at 1440×900 viewport in dark mode.

---

## Questions?

If you're unsure about anything, open a [Discussion](https://github.com/your-org/communityrouter/discussions) or ask in the issue tracker.

We're happy to help you make your first contribution.

---

<div align="center">
  <br />
  <sub>
    <em>Reducing onboarding chaos, together.</em>
  </sub>
</div>
