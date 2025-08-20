# Repository Guidelines

## Project Structure & Module Organization
- Root site: `index.html` and `assets/` (favicons, logos). Keep assets optimized and referenced with absolute paths (e.g., `/assets/logo.svg`).
- Tools index: `tools/index.html` links to utilities.
- QR tool: `tools/qr_code_generator.html` (standalone HTML/JS page).
- Photo Enhancer app: `tools/google-drive-photo-enhancer/` (React + TypeScript + Vite). Key folders: `components/`, `services/`, entry `index.tsx`, config `vite.config.ts`.
- CI: `.github/workflows/build-photo-enhancer.yml` builds and commits the Photo Enhancer bundle on pushes affecting that folder.

## Build, Test, and Development Commands
- Node: use Node 20 (matches CI).
- Dev server (Photo Enhancer):
  - `cd tools/google-drive-photo-enhancer && npm ci`
  - `npm run dev` — start Vite dev server.
- Build (Photo Enhancer):
  - `npm run build` — bundle via Vite, then move `dist` output into the app directory via `postbuild`.
  - `npm run preview` — serve the built app locally.
- The root site and QR tool are static; open `index.html` or `tools/qr_code_generator.html` directly in a browser.

## Coding Style & Naming Conventions
- Indentation: 2 spaces. Keep lines readable (~100 chars).
- HTML/CSS: semantic markup; inline styles kept minimal and consistent with existing pages.
- TypeScript/React (Photo Enhancer): React 19 + TS. Use functional components and hooks. PascalCase for components/files (e.g., `EditModal.tsx`), camelCase for variables/functions. Service modules live under `services/*.ts`. Path alias `@/*` is available.
- No linter is configured; match surrounding style and keep imports tidy.

## Testing Guidelines
- No formal test suite is present. Manually verify core flows:
  - Auth button enables, Google sign-in completes, Drive listing and edits render.
- If adding logic in `services/`, consider small unit tests (e.g., `<name>.test.ts`) in a separate PR.

## Commit & Pull Request Guidelines
- Commit style: prefer Conventional Commits (e.g., `feat(site): add hero`, `fix(tools): handle auth error`, `build(tools): photo enhancer bundle`).
- PRs: include a concise description, linked issues, test steps, and screenshots/GIFs for UI changes. For Photo Enhancer changes, note any config requirements.

## Security & Configuration Tips
- Do not commit secrets. The Photo Enhancer expects `tools/google-drive-photo-enhancer/config.json` with `{ "clientId": "<google-oauth-client-id>" }`. Keep this file local or provision it in deployment.
- OAuth scopes should remain minimal and match those in the code. Avoid modifying `CNAME` and `robots.txt` without coordination.

