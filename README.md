# Mǎa-kwɛ́lî Langues Project

Use this repository to run and edit the app locally and connect it to the custom backend.

## Prerequisites

1. Clone the repository using the project's Git URL.
2. Navigate to the project directory.
3. Install dependencies: `npm install`.

## Run Locally

Start the backend and the frontend from the project root:

```bash
npm run dev:backend
npm run dev:web
```

Open the local URL printed by Vite.

### Expose the backend publicly for hosted frontend testing

To expose the local backend through a public tunnel, run:

```bash
npm run dev:tunnel
```

Copy the public URL shown by `localtunnel`, then set `VITE_API_BASE_URL` in `.env.local` (for local development) or `.env.production` (for a hosted frontend build) to that URL.

If the tunnel is restarted, update the URL again before rebuilding or redeploying the frontend.

> Do not leave a stale tunnel URL in production; the hosted frontend must point to a live backend endpoint.

### Deploy the backend with Docker

A production-ready backend can be deployed using Docker. The repo includes `backend/Dockerfile` and `backend/docker-compose.deploy.yml`.

From the project root:

```bash
cd backend
docker build -t mbaara-backend .
docker run -p 8000:8000 \
  -e DATABASE_URL="sqlite:///./mbaara.db" \
  -e JWT_SECRET="change-this-secret" \
  -e JWT_ALGORITHM="HS256" \
  -v "$PWD/mbaara.db:/app/mbaara.db" \
  mbaara-backend
```

Or use the deploy compose file:

```bash
docker compose -f backend/docker-compose.deploy.yml up --build
```

After deployment, point `VITE_API_BASE_URL` to the public backend URL and rebuild/redeploy the frontend.

## Deploy the backend on Replit

This repo includes Replit configuration files so you can host the backend without Docker.

1. Create a new Repl on Replit.
2. Choose "Import from GitHub" and use this repository:
   `https://github.com/mauriceleontine2026/M-baara-Langues`
3. Replit will use the existing `.replit` and `replit.nix` files to install dependencies and start the backend.
4. Set the following environment variables in the Replit Secrets / Environment panel:

```bash
DATABASE_URL=sqlite:///./mbaara.db
JWT_SECRET=change-this-secret
JWT_ALGORITHM=HS256
OPENAI_API_KEY=<your_openai_api_key>
PERPLEXITY_API_KEY=<your_perplexity_api_key>
```

5. Once the Repl is running, verify the backend is available at:
   `/api/health`

If you also want the frontend to use this hosted backend, set `VITE_API_BASE_URL` to the public Replit URL in your frontend environment configuration.

## Use The Hosted Backend

For frontend-only development, create or update `.env.local` in the project root with your backend and Supabase values as needed.

## Native Android / iOS with Capacitor

This repository now includes a Capacitor native wrapper in `android/` and `ios/`.

When you connect Supabase, add these keys to `.env.local`:

```bash
VITE_SUPABASE_URL=https://xyzcompany.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
SUPABASE_SERVICE_KEY=your-supabase-service-role-key
```

Then build the web assets and sync Capacitor:

```bash
npm run build
npx cap sync android
npx cap sync ios
```

Open the native projects for platform-specific tooling:

```bash
npx cap open android
npx cap open ios
```

The Capacitor web view will load the built app and the web app will use the configured runtime environment values.

## Publish Your Changes

After pushing your changes to git, open your source repository hosting dashboard or deployment platform to continue the release process.

## Docs & Support

Use your project-specific documentation and support channels for deployment guidance.
