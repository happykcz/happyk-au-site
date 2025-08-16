# happyk.au — static site

- `index.html`: Coming soon page at `/`
- `tools/index.html`: Unlisted launcher for tools (noindex)
- `robots.txt`: Disallow crawling of `/tools/`
- `CNAME`: Custom domain for GitHub Pages

## Deploy

1. Push to GitHub: this repo can be private or public.
2. Repo **Settings → Pages**:
   - Source: **Deploy from a branch**
   - Branch: `main` → `/ (root)`
   - Custom domain: `happyk.au` (must match `CNAME` file)

## DNS (Cloudflare)

- CNAME `@` → `happykcz.github.io` (Proxied)
- CNAME `www` → `happyk.au` (Proxied)

Enable HTTPS in GitHub Pages once DNS resolves.
