## Google Drive Photo Enhancer (Static Hosting)

This tool is now configured to run on a static host (GitHub Pages). It uses Google Identity Services (GIS) for OAuth and Google Drive API to list images from a folder you choose. Gemini features are mocked on the client unless configured server-side.

### Quick Start (Local Dev)

Prerequisites: Node.js 18+

1) Install deps
- `npm install`

2) Create a runtime config
- Copy `config.sample.json` to `config.json` and set your Google OAuth Client ID (you can leave `googleApiKey` empty). Optional: for local testing only, you may set `geminiApiKey` (not recommended for production as it exposes a secret):
```
{
  "clientId": "YOUR_GOOGLE_OAUTH_CLIENT_ID.apps.googleusercontent.com",
  "googleApiKey": "",
  "geminiApiKey": ""
}
```

3) Run dev server
- `npm run dev`

4) Build for static hosting
- `npm run build`
- Output is written in-place (index.html + assets/) so it can be served from `/tools/google-drive-photo-enhancer/` on GitHub Pages.

### GitHub Pages Deployment

- Commit the built files in this folder (`index.html` and `assets/`).
- Ensure `tools/index.html` links to `/tools/google-drive-photo-enhancer/index.html` (already done).
- Place a `config.json` next to `index.html` on your site with your real Client ID. Note: OAuth Client ID is not a secret and must be public for client-side OAuth to work.
- This folder’s `.gitignore` excludes `config.json`. You can safely keep `config.json` untracked and upload it during deployment if you prefer.

### Google Cloud Console Setup (Summary)

1) Create an OAuth 2.0 Client ID (Web application)
- Authorized JavaScript origins: `https://happyk.au` (and any staging domain you use)
- Redirect URIs: not needed for the token client, can be empty

2) Enable APIs
- Google Drive API
- OpenID and userinfo scopes are part of OAuth; People API is NOT required (we use the `/userinfo` endpoint instead).

3) Scopes used
- `https://www.googleapis.com/auth/drive.readonly`
- `https://www.googleapis.com/auth/userinfo.profile`
- `https://www.googleapis.com/auth/userinfo.email`

### Notes on AI/Gemini

- The code avoids bundling the Gemini SDK. If `geminiApiKey` is absent, AI features return mocked responses client-side (safe for public hosting).
- If you add `geminiApiKey` to `config.json`, the SDK loads dynamically from a CDN at runtime (not bundled). This exposes the key to users; do this only for local testing.
- For production AI, proxy requests through a server you control to keep the key secret.

### Troubleshooting

- Error: "Google Client ID is missing" — Ensure `config.json` is deployed next to `index.html` with a `clientId` value. Alternatively, embed inline config in `index.html` under a `<script id="app-config" type="application/json">` block or pass `?client_id=...` in the URL for quick testing.
- Network tab should show `config.json` loading with 200 status at `/tools/google-drive-photo-enhancer/config.json`.

### Maintenance Tips

- To rotate OAuth Client ID: update `config.json` only; no rebuild required.
- To develop: update TS/TSX files and run `npm run dev`. Build rewrites `index.html` to point to the hashed bundle under `assets/` with relative paths.

### TODO (Next Session)

- Finalize Google API setup and add the production `config.json` to the deployed site.
- Consider adding a simple serverless proxy for Gemini to enable real AI suggestions without exposing keys.
- Optionally add minimal error telemetry to surface Drive permission or cookie issues.
## Google Setup Checklist (OAuth + Drive)

Follow these steps in Google Cloud Console to make sign-in and Drive listing work on a static site:

1) OAuth consent screen
- App type: External
- Publishing status: In production (or Testing with your account listed as a Test user)
- Scopes used by the app: add and save
  - https://www.googleapis.com/auth/drive.readonly (Sensitive)
  - https://www.googleapis.com/auth/userinfo.profile
  - https://www.googleapis.com/auth/userinfo.email

2) OAuth 2.0 Client ID (Web application)
- Authorized JavaScript origins:
  - https://happyk.au
- Redirect URIs: not required for the token client flow

3) Enable APIs
- Enable “Google Drive API” in the same project.
- People API is not required (the app uses /oauth2/v3/userinfo).

4) Browser and network checks
- Third-party cookies: some browsers’ strict modes may interfere with Google Identity. Test in a standard Chrome profile.
- Ad/script blockers: ensure https://accounts.google.com and https://apis.google.com are not blocked.
- If using Cloudflare: disable “Rocket Loader” and any feature that rewrites scripts for this path.

5) Common errors and fixes
- invalid_origin: add the exact origin to “Authorized JavaScript origins” (protocol + domain).
- access blocked / needs verification: publish the consent screen to production or add yourself as a Test user.
- popup closed by user: try again; ensure no browser extensions close popups.
