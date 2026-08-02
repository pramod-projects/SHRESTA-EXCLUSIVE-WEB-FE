# SHRESTA-WEB-FE

Frontend repository for SHRESTA EXCLUSIVE.

## Dependencies

Use Node.js 22 or newer and npm.

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
