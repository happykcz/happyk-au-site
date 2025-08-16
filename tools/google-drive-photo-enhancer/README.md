## Google Drive Photo Enhancer (Static Hosting)

This tool is now configured to run on a static host (GitHub Pages). It uses Google Identity Services (GIS) for OAuth and Google Drive API to list images from a folder you choose. Gemini features are mocked on the client unless configured server-side.

### Quick Start (Local Dev)

Prerequisites: Node.js 18+

1) Install deps
- `npm install`

2) Create a runtime config
- Copy `config.sample.json` to `config.json` and set your Google OAuth Client ID (you can leave `googleApiKey` empty):
```
{
  "clientId": "YOUR_GOOGLE_OAUTH_CLIENT_ID.apps.googleusercontent.com",
  "googleApiKey": ""
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
- Place a `config.json` next to `index.html` on your site with your real Client ID.

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

- The code intentionally does not ship a Gemini API key to the browser. If `config.json` does not include Gemini settings, the app uses mocked AI responses client-side, which is safe for public hosting.
- For real AI calls, proxy them through a server you control, or a Cloud Function, to keep secrets safe.

### Maintenance Tips

- To rotate OAuth Client ID: update `config.json` only; no rebuild required.
- To develop: update TS/TSX files and run `npm run dev`. Build rewrites `index.html` to point to the hashed bundle under `assets/` with relative paths.

### TODO (Next Session)

- Finalize Google API setup and add the production `config.json` to the deployed site.
- Consider adding a simple serverless proxy for Gemini to enable real AI suggestions without exposing keys.
- Optionally add minimal error telemetry to surface Drive permission or cookie issues.
