# Repository Guidelines

## Project Structure & Module Organization
- `portfolio/`: main frontend app (Create React App). Core code lives in `portfolio/src`, static files in `portfolio/public`.
- `portfolio/src/game/system-design/`: nested Vite-based app used by the system-design game.
- `lambda/`: serverless backend handlers (`auth`, `chat`, `webhook`) using Node.js ESM.
- `topics/`: static topic pages consumed by indexing scripts.
- `scripts/`: repo-level maintenance scripts (for topic index/graph generation and deployment helpers).
- `docs/`: planning and audit artifacts; prefer dated folders for major updates.
- `.github/workflows/deploy.yml`: CI build + deploy pipeline for `portfolio`.

## Build, Test, and Development Commands
- `cd portfolio && npm ci`: install frontend dependencies.
- `cd portfolio && npm start`: run the CRA app locally on port 3000.
- `cd portfolio && npm run build`: create a production build.
- `cd portfolio && npm test -- --watchAll=false`: run Jest/React Testing Library tests once (CI style).
- `cd portfolio/src/game/system-design && npm ci && npm run dev`: run the Vite app locally.
- `cd portfolio/src/game/system-design && npm run build`: build the Vite app.
- `node scripts/generate-topic-index.mjs` and `node scripts/generate-graph-data.mjs`: regenerate derived topic metadata.

## Coding Style & Naming Conventions
- Language: JavaScript/JSX (ES modules in backend scripts/lambdas).
- Follow existing style: 2-space indentation, semicolons, single quotes.
- React components/pages: PascalCase filenames (for example `Premium.jsx`, `AuthGate.jsx`).
- Variables/functions: camelCase; constants: UPPER_SNAKE_CASE.
- Static content and topic slugs: kebab-case (for example `rate-limiter.html`).

## Testing Guidelines
- Frontend tests use Jest + React Testing Library (`portfolio/src/*.test.js`, `portfolio/src/setupTests.js`).
- Name tests `ComponentName.test.js` and keep them near relevant feature code.
- No strict coverage threshold is enforced; add or update tests for changed rendering logic, routing, and user flows.

## Commit & Pull Request Guidelines
- Match current history style: short imperative subjects (`Fix ...`, `Update ...`, `Add ...`), focused on behavior change.
- Keep commits scoped by area when possible (`portfolio`, `lambda`, `topics`, `scripts`).
- PRs should include: summary, changed paths, test/build evidence, linked issue/plan, and screenshots for UI changes.
- Ensure CI remains green (`npm ci` + `npm run build` in `portfolio`) before requesting review.

## Security & Configuration Tips
- Keep secrets in `.env` or GitHub Actions secrets; never commit credentials.
- Do not commit generated build artifacts (`dist/`, bundled assets under `public/.../assets`).
- Review IAM- or Firebase-related changes carefully in `lambda/` before merge.
