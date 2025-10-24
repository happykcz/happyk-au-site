# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a static site hosted on GitHub Pages at happyk.au. The site contains:
- Root landing page (`index.html`)
- Tools directory with standalone utilities
- A React-based Google Drive Photo Enhancer tool

## Project Structure

### Root Site
- `index.html` — main landing page
- `assets/` — favicons, logos, and `site.css`
- `robots.txt`, `CNAME` — static hosting configuration

### Tools
- `tools/index.html` — tools directory index
- `tools/qr_code_generator.html` — standalone QR code generator (no build required)
- `tools/google-drive-photo-enhancer/` — React + TypeScript + Vite application

### Photo Enhancer Structure
The Photo Enhancer is a React 19 + TypeScript application:
- **Entry point**: `index.tsx` renders `App.tsx`
- **Main component**: `App.tsx` — manages authentication, folder selection, and photo grid state
- **Components** (`components/`):
  - `LoginScreen.tsx` — Google OAuth sign-in
  - `FolderInputScreen.tsx` — Drive folder ID input
  - `PhotoGrid.tsx` — displays photos from Drive
  - `EditModal.tsx` — photo metadata editing interface
  - `EditView.tsx` — edit modal content with adjustments
  - `Header.tsx` — app header with user info
  - `icons.tsx` — SVG icon components
- **Services** (`services/`):
  - `driveService.ts` — Google Drive API integration (list files, fetch metadata)
  - `geminiService.ts` — AI enhancement suggestions (mocked by default, requires API key for real usage)
- **Types**: `types.ts` — TypeScript interfaces (`User`, `Photo`, `AIEnhancementSuggestion`)
- **Config**: `vite.config.ts` — Vite configuration with `@/` path alias and relative base path
- **Build output**: `index.html` and `assets/` (built in-place for GitHub Pages)

## Development Commands

### Root Site & QR Tool
No build required — open files directly in a browser:
- `index.html`
- `tools/qr_code_generator.html`

### Photo Enhancer

**Prerequisites**: Node.js 20 (matches CI environment)

**Setup**:
```bash
cd tools/google-drive-photo-enhancer
npm ci
```

**Dev server**:
```bash
npm run dev
```
Starts Vite dev server (typically http://localhost:5173)

**Build**:
```bash
npm run build
```
- Bundles via Vite to `dist/`
- `postbuild` script moves output in-place (`index.html` and `assets/`) and cleans up

**Preview**:
```bash
npm run preview
```
Serves the built app locally

## Configuration

### Photo Enhancer Runtime Config
The app expects `tools/google-drive-photo-enhancer/config.json` (excluded from git):
```json
{
  "clientId": "YOUR_GOOGLE_OAUTH_CLIENT_ID.apps.googleusercontent.com",
  "googleApiKey": "",
  "geminiApiKey": ""
}
```
- **clientId** (required): Google OAuth 2.0 Client ID for authentication
- **geminiApiKey** (optional): For AI suggestions; mocked if absent (safe for static hosting)

### Google Cloud Console Setup
1. **OAuth Consent Screen**: External app, production or testing mode
2. **OAuth 2.0 Client ID**: Web application
   - Authorized JavaScript origins: `https://happyk.au`
   - Scopes: `drive.readonly`, `userinfo.profile`, `userinfo.email`
3. **Enable APIs**: Google Drive API

## CI/CD

`.github/workflows/build-photo-enhancer.yml`:
- Triggers on pushes to `tools/google-drive-photo-enhancer/**`
- Builds Photo Enhancer with Node 20
- Commits built files (`index.html`, `assets/`) with `[skip ci]` message
- Uses `github-actions[bot]` as committer

## Code Style

### HTML/CSS
- 2-space indentation
- Semantic markup
- Minimal inline styles consistent with existing pages
- Asset paths use absolute paths from root (e.g., `/assets/logo.svg`)

### TypeScript/React (Photo Enhancer)
- React 19 functional components with hooks
- **Naming**:
  - Components/files: PascalCase (e.g., `EditModal.tsx`)
  - Variables/functions: camelCase
- **Imports**: Path alias `@/*` resolves to project root
- No linter configured — match surrounding style

### Commit Messages
Use Conventional Commits format:
- `feat(site): add hero section`
- `fix(tools): handle auth error`
- `build(tools): photo enhancer bundle`

## Architecture Notes

### Photo Enhancer Data Flow
1. **Authentication**: `LoginScreen` → Google Identity Services → `App` state (`user`)
2. **Folder Selection**: `FolderInputScreen` → Drive API via `driveService.ts` → `App` state (`photos`)
3. **Photo Display**: `PhotoGrid` renders photos with edit buttons
4. **Editing**: `EditModal` + `EditView` → metadata editing (currently client-side only)
5. **AI Suggestions**: `geminiService.ts` (mocked unless API key provided)

### OAuth Security Model
- Client ID is public (required for client-side OAuth)
- No server-side component by default
- Gemini API key exposure risk: keep mocked or proxy through a server for production

## Testing

No formal test suite. Manual verification recommended:
- Auth flow: sign-in button enables, OAuth popup completes, user info displays
- Drive integration: folder listing works, photos render
- Edit modal: opens, displays metadata, adjustments apply (visual check)

## Common Tasks

### Adding a New Component
1. Create `ComponentName.tsx` in `components/`
2. Use PascalCase for component name
3. Import into `App.tsx` or parent component
4. Test with `npm run dev`

### Modifying Drive API Integration
- Edit `services/driveService.ts`
- Key functions: `listPhotos()`, `getPhotoMetadata()`
- Uses Google Drive API v3 with `gapi.client.drive`

### Updating Styles
- Root site: edit `assets/site.css`
- Photo Enhancer: inline styles or add CSS module (none currently used)

### Deploying Photo Enhancer Changes
1. Make changes to TS/TSX files
2. Push to `main` branch
3. GitHub Actions builds and commits automatically
4. Ensure `config.json` is deployed separately (not in git)

## Security Notes

- Never commit `config.json` (already in `.gitignore`)
- OAuth Client ID is not a secret (must be public for browser OAuth)
- Gemini API key is sensitive — keep mocked or use server proxy
- Do not modify `CNAME` or `robots.txt` without coordination
