# SHRESTA-WEB-FE

Frontend repository for SHRESTA EXCLUSIVE.

## Dependencies

Use Node.js 22 or newer and npm.

### macOS install commands

Install frontend/runtime tooling:

```bash
brew update
brew install node@22 nvm docker docker-compose colima
```

Load Node 22 in current shell:

```bash
nvm use
```

### Linux (Ubuntu/Debian) install commands

Install Node 22, Docker, and the Docker Compose plugin:

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

Runtime mock guardrail (enforced in lint):

```bash
npm run verify:no-runtime-mocks
```

This check scans runtime code under `src` (excluding tests and `.ai-context.json`) and fails if mock frameworks/usages are detected.

Use `npm install <package>` only when intentionally changing dependencies, and commit `package.json` with `package-lock.json`.

## Environment

Each mode has an independent template and runtime file. They are not derived or
merged automatically:

- DEV: `.env.dev.example` -> `.env.dev`
- UAT: `.env.uat.example` -> `.env.uat`
- PROD: `.env.prod.example` -> `.env.prod`

Create the local DEV runtime file:

```bash
cp .env.dev.example .env.dev
```

Local defaults:

```bash
SHRESTA_ENVIRONMENT_MODE=DEV
NEXT_PUBLIC_STOREFRONT_URL=http://localhost:3010
NEXT_PUBLIC_ADMIN_URL=http://localhost:3010/admin
NEXT_PUBLIC_API_BASE_URL=http://localhost:8090
SHRESTA_API_BASE_URL=http://localhost:8090
SHRESTA_ADMIN_API_KEY=local-shresta-admin-key
NEXT_PUBLIC_MEDIA_BASE_URL=http://localhost:9010
NEXT_PUBLIC_MEDIA_CANONICAL_MAX_WIDTH=2400
NEXT_PUBLIC_MEDIA_CANONICAL_MAX_HEIGHT=3200
NEXT_PUBLIC_MEDIA_CANONICAL_MAX_FILE_SIZE=15000000
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
```

## Direct R2 Media

The admin browser prepares exactly one canonical image, downscaling once only when it exceeds configured limits and never upscaling. It requests authorization through the authenticated same-origin `/api/admin-media/authorize` route, PUTs bytes directly to the presigned R2 URL with progress and one retry, then calls `/api/admin-media/complete`. Next.js and Spring Boot handle metadata only; neither proxies media bytes.

Product videos use the same authorization/direct-PUT/completion lifecycle and must be 30 seconds or shorter. The admin accepts the completed canonical media asset only; pasted external video URLs are not part of the product media flow.

Customer images currently render from `NEXT_PUBLIC_MEDIA_BASE_URL` without Cloudflare Image Resizing or Next.js image transformation. Browser-prepared canonical uploads remain unchanged, while frontend layout and CSS control listing, detail, and zoom display dimensions without creating additional R2 objects. Cloudflare Image Resizing is reserved for a future delivery-layer rollout and is not enabled by the current application configuration.

For Vercel, configure the values from `.env.uat.example` or `.env.prod.example`
in the matching Vercel environment. For another host, copy the template to its
matching runtime file:

```bash
cp .env.uat.example .env.uat
cp .env.prod.example .env.prod
```

- UAT: `uat.shrestaexclusive.com`, `uat-admin.shrestaexclusive.com`, `uat-api.shrestaexclusive.com`.
- PROD: `shrestaexclusive.com`, `admin.shrestaexclusive.com`, `api.shrestaexclusive.com`.

Only public hostnames and canonical limits use `NEXT_PUBLIC_*`. Keep `SHRESTA_ADMIN_API_KEY`, `SHRESTA_ADMIN_SESSION_SECRET`, and all R2 credentials server-only.
UAT/PROD builds fail fast when these domains are wrong, server-only admin secrets are absent, or `NEXT_PUBLIC_MEDIA_BASE_URL` is a placeholder/private R2 endpoint instead of the HTTPS Cloudflare custom media domain.

UAT RAZORPAY INDIA TEST CREDS :-
| Network    | Test card             |
| ---------- | --------------------- |
| Visa       | `4100 2800 0000 1007` |
| Mastercard | `5500 6700 0000 1002` |
| RuPay      | `6527 6589 0000 1005` |
| Amex       | `3402 560004 01007`   |

Keep secrets server-only. Do not put secrets in `NEXT_PUBLIC_*`.

Razorpay Standard Checkout in this FE loads `https://checkout.razorpay.com/v1/checkout.js` at runtime and uses only `NEXT_PUBLIC_RAZORPAY_KEY_ID`. Never expose `RAZORPAY_KEY_SECRET` in frontend env.

## Development

Start the complete DEV stack from either repository root:

```bash
./up dev
```

The controller starts and checks DEV dependencies, backend, and frontend in order. It does not start Cloudflare in DEV.

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

## Component-only frontend runtime

These commands run only the frontend and do not manage backend dependencies, environment switching, or Cloudflare. Use `./up <environment>` for the complete stack.

Build the frontend component:

```bash
npm run build
```

Run the built frontend component:

```bash
npm run start
```

Run the component on another port:

```bash
npm run start -- -p 3011
```

`npm run start` must run after `npm run build`.

## Vercel deployment alignment

Production topology:

- Frontend deployed on Vercel (this repo).
- Backend API deployed on the VPS at `https://api.shrestaexclusive.com`.

Set these Vercel Environment Variables (Production and Preview as needed):

- `SHRESTA_API_BASE_URL=https://api.shrestaexclusive.com`
- `NEXT_PUBLIC_API_BASE_URL=https://api.shrestaexclusive.com`
- `NEXT_PUBLIC_MEDIA_BASE_URL=https://<configured Cloudflare media domain>`
- `SHRESTA_ADMIN_API_KEY=<same backend admin key>`

Why both API base variables are required:

- Server routes and server rendering paths use `SHRESTA_API_BASE_URL`.
- Browser-exposed fallback and shared API client paths use `NEXT_PUBLIC_API_BASE_URL`.

Integration checklist:

- Ensure backend TLS cert is valid and publicly reachable from Vercel regions.
- Ensure backend reverse proxy forwards `X-Forwarded-*` headers.
- Keep admin key server-only in Vercel settings (never hardcode in client components).
- Configure backend webhook URLs to the DigitalOcean API domain, not the Vercel domain.

## Persistent UP/DOWN stack (BE + FE + backend tunnel)

From this repository root (`SHRESTA-EXCLUSIVE-WEB-FE`), use:

```bash
./up          # DEV (default)
./up dev      # .env.dev in both repos
./up uat      # .env.uat in both repos
./up prod     # .env.prod in both repos
./status
./stack-control.sh logs be
./stack-control.sh logs fe
./stack-control.sh logs cloudflared-be
./down
```

`./up <environment>` loads the matching `.env.<environment>` file in both repos. Omitting the environment starts DEV. The selected mode is shown by `./status`; run `./down` before switching modes.

`UP` runs the stack in the background:

- Backend: `./scripts/be-<environment>`
- Frontend: `npm run start`, built and started with `.env.<environment>`
- DEV: localhost only, with no Cloudflare process
- UAT/PROD: the backend-owned named tunnel forwards directly to backend port `8090`

These continue running even if terminal closes or laptop locks. They stop only on `./down`, manual kill, or machine shutdown.
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
cat .env.dev
```

If production start fails, build first:

```bash
npm run build
npm run start
```
