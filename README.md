# SHRESTA-WEB-FE

Frontend repository for SHRESTA EXCLUSIVE.

## Dependencies

Use Node.js 22 or newer and npm.

### macOS install commands

Install frontend/runtime tooling:

```bash
brew update
brew install node@22 nvm docker docker-compose colima cloudflared
```

Load Node 22 in current shell:

```bash
nvm use
```

### Linux (Ubuntu/Debian) install commands

Install Node 22, Docker, Docker Compose plugin, and cloudflared:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg lsb-release

curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo \
	"deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
	$(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker "$USER"

curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg \
	| sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main" \
	| sudo tee /etc/apt/sources.list.d/cloudflared.list >/dev/null
sudo apt-get update
sudo apt-get install -y cloudflared
```

After group changes on Linux, sign out/sign in (or reboot) before running Docker without sudo.

### Backend services needed by FE (SQL + Redis + S3-compatible storage)

If you are not using Docker Compose, install and run backend dependencies directly:

macOS:

```bash
brew update
brew install postgresql@16 redis minio/stable/minio minio/stable/mc
brew services start postgresql@16
brew services start redis
mkdir -p "$HOME/minio-data"
MINIO_ROOT_USER=shresta_minio MINIO_ROOT_PASSWORD=shresta-local-minio-password \
	minio server "$HOME/minio-data" --address ":9010" --console-address ":9011"
mc alias set local http://127.0.0.1:9010 shresta_minio shresta-local-minio-password
mc mb --ignore-existing local/shresta-local-assets
```

Linux (Ubuntu/Debian):

```bash
sudo apt-get update
sudo apt-get install -y postgresql postgresql-contrib redis-server curl
sudo systemctl enable --now postgresql
sudo systemctl enable --now redis-server

curl -LO https://dl.min.io/server/minio/release/linux-amd64/minio
chmod +x minio
sudo mv minio /usr/local/bin/minio
mkdir -p "$HOME/minio-data"
MINIO_ROOT_USER=shresta_minio MINIO_ROOT_PASSWORD=shresta-local-minio-password \
	minio server "$HOME/minio-data" --address ":9010" --console-address ":9011"

curl -LO https://dl.min.io/client/mc/release/linux-amd64/mc
chmod +x mc
sudo mv mc /usr/local/bin/mc
mc alias set local http://127.0.0.1:9010 shresta_minio shresta-local-minio-password
mc mb --ignore-existing local/shresta-local-assets
```

This repository is pinned to Node 22 for stable dev-memory behavior:

```bash
nvm use
```

```bash
node -v
npm -v
```

Install dependencies from the lockfile:

```bash
npm ci
```

Use `npm install <package>` only when intentionally changing dependencies, and commit `package.json` with `package-lock.json`.

## Environment

Create `.env.local` from `.env.example`:

```bash
cp .env.example .env.local
```

Local defaults:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8090
SHRESTA_API_BASE_URL=http://localhost:8090
SHRESTA_ADMIN_API_KEY=local-shresta-admin-key
```

Keep secrets server-only. Do not put secrets in `NEXT_PUBLIC_*`.

## Development

Start backend dependencies and backend from `SHRESTA-BE` when using live APIs:

```bash
cd /Users/pramod.kumarbs/Documents/SHRESTA_EXCLUSIVE/SHRESTA-BE
colima start
docker-compose -f docker-compose.dev.yml up -d
./scripts/be-gradle bootRun --no-daemon
```

Start the frontend:

```bash
cd /Users/pramod.kumarbs/Documents/SHRESTA_EXCLUSIVE/SHRESTA-WEB-FE
npm run dev
```

`npm run dev` uses Webpack mode by default to avoid Turbopack memory spikes in this workspace layout.

Default URL:

```text
http://localhost:3010
```

Use another port:

```bash
npm run dev -- -p 3011
```

If you need Turbopack for quick experimentation, run:

```bash
npm run dev:turbopack
```

Health:

```bash
curl http://localhost:3010/api/health
```

## Production

Build:

```bash
npm run build
```

Run:

```bash
npm run start
```

Run on another port:

```bash
npm run start -- -p 3011
```

`npm run start` must run after `npm run build`.

## Persistent UP/DOWN stack (BE + FE + cloudflared)

From this repository root (`SHRESTA-EXCLUSIVE-WEB-FE`), use:

```bash
./up
./status
./FE_URL
./stack-control.sh logs be
./stack-control.sh logs fe
./stack-control.sh logs cloudflared-proxy
./stack-control.sh logs cloudflared
./down
```

`UP` runs all three in background:

- Backend: `./scripts/be-uat`
- Frontend: `npm run start`
- Local proxy: `node ./scripts/cloudflared-proxy.mjs`
- cloudflared: `cloudflared tunnel --url http://127.0.0.1:3310 --no-autoupdate`

Find current cloudflared public URL:

```bash
./FE_URL

# or, directly from logs:
grep -Eo 'https://[-a-z0-9]+\.trycloudflare\.com' ../SHRESTA-EXCLUSIVE-BE/.logs/cloudflared.log | tail -n 1
```

Media URLs are reachable on the same cloudflared URL:

```text
https://<your-trycloudflare-url>/shresta-local-assets/logos/SHRESTA.mp4
```

These continue running even if terminal closes or laptop locks. They stop only on `DOWN`, manual kill, or machine shutdown.
Requires sibling repos in the same parent folder: `SHRESTA-EXCLUSIVE-BE` and `SHRESTA-EXCLUSIVE-WEB-FE`.

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Optional audit:

```bash
npm audit --audit-level=high
```

## Scripts

```text
npm run dev        Start development server.
npm run build      Create production build.
npm run start      Serve production build.
npm run lint       Run ESLint.
npm run typecheck  Generate route types and run TypeScript checks.
npm test           Run Vitest once.
```

## Troubleshooting

If install fails:

```bash
node -v
npm -v
npm ci
```

If port `3010` is busy:

```bash
lsof -nP -iTCP:3010 -sTCP:LISTEN
npm run dev -- -p 3011
```

If frontend cannot reach backend APIs:

```bash
curl http://localhost:8090/api/v1/platform/health
cat .env.local
```

If production start fails, build first:

```bash
npm run build
npm run start
```
