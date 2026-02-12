# Search Proxy (Node + Playwright)

Small server that accepts `/search?q=...`, opens DuckDuckGo in headless Chromium, and returns top results as JSON.

## Deploy steps (VPS)

```bash
sudo apt update && sudo apt install -y git curl build-essential
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2

# Clone project
cd /opt
sudo git clone <repo-url> search-proxy
cd search-proxy
npm install
npx playwright install --with-deps chromium
```

Create `.env`:

```
SEARCH_PROXY_KEY=your-secret
PORT=8787
```

Run:

```
pm2 start "node server.js" --name search-proxy
pm2 save
```

Expose via nginx/https if needed.
