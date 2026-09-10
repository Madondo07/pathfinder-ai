# PathFinder AI

A career-guidance platform for South African youth. PathFinder turns a short conversation
about someone's goals, education, interests and constraints into a concrete, explainable
next step — a recommended direction, a shortlist of real opportunities to verify, and a
place to track applications through to an outcome.

## What it does

- **Career guide chat** — a conversational flow (backed by an LLM) that asks one question
  at a time, extracts profile details as they're mentioned, and once enough is known,
  proposes a direction with reasoning, next steps and an immediate action.
- **Opportunity hub** — curated, DB-backed opportunities blended with live web results
  (via SerpAPI), all scored and ranked by a transparent, non-black-box matching function
  (`shared/recommendation.ts`) against the user's actual profile — never a trained model.
- **Applications tracker** — add, edit and track real applications, with prefill from a
  saved opportunity, deadline reminders, and a calendar view.
- **Saved pathways** — persist a generated pathway with its own checklist, revisit it later.
- **Local accounts** — email/password auth (`server/passwordAuth.ts`), with an optional,
  dormant-unless-configured "continue with Manus" OAuth path.
- **In-app notifications** — pathway/application creation surfaces as a real notification
  within the session, with proper read/unread state.

## Tech stack

- **Client**: React 19, TypeScript, Vite, Tailwind CSS, wouter (routing), tRPC React Query
- **Server**: Express, tRPC, Drizzle ORM
- **Database**: Postgres (developed against Supabase's session pooler)
- **Auth**: signed JWT session cookie (`jose`), local email/password via Node's built-in
  `crypto.scrypt`
- **LLM**: any OpenAI-compatible chat completions endpoint (developed against Groq)
- **Live search**: SerpAPI (Google results), always layered on top of curated results —
  curated results show regardless of whether live search succeeds
- **Testing**: Vitest

## Project structure

```
api/                     Vercel serverless entry point ([...path].ts — catches all /api/*)
client/src/
  pages/Home.tsx         The entire frontend UI (single large component tree)
  pages/NotFound.tsx     404 fallback
  components/ui/         The handful of shadcn/ui primitives actually in use
  _core/hooks/useAuth    Session/auth hook
server/
  _core/
    app.ts               Express app factory (shared by local dev and the Vercel function)
    index.ts             Traditional long-running entrypoint (local dev / non-Vercel hosts)
    trpc.ts, context.ts  tRPC setup, request context, auth guards
    sdk.ts               Session signing/verification, OAuth SDK
    llm.ts               LLM provider abstraction with retry/backoff
    vite.ts              Dev-mode Vite middleware / prod static serving
  routers.ts             The tRPC router (all API procedures)
  db.ts                  All database queries
  passwordAuth.ts        scrypt password hashing
shared/                  Code shared between client and server (types, validation,
                         recommendation scoring, deadline logic)
drizzle/                 Schema + migrations
```

## Getting started

### Prerequisites

- Node.js 20+
- pnpm (`corepack enable` will pick up the version pinned in `package.json`)
- A Postgres database (e.g. a free Supabase project)

### Environment variables

Create a `.env` file in the project root (git-ignored):

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Postgres connection string |
| `JWT_SECRET` | Yes | Random secret used to sign session cookies |
| `VITE_APP_ID` | Yes | Any identifier for this app instance |
| `FALLBACK_LLM_API_KEY` | For chat | API key for an OpenAI-compatible provider (Groq, OpenAI, etc.) |
| `FALLBACK_LLM_API_URL` | For chat | Base URL for that provider (e.g. `https://api.groq.com/openai/v1`) |
| `FALLBACK_LLM_MODEL` | For chat | Model name to request |
| `SERPAPI_API_KEY` | For live search | [serpapi.com](https://serpapi.com) key — without it, the opportunity hub falls back to curated results only |

The app degrades gracefully without the optional ones (no live search, no LLM chat) rather
than crashing, so it's safe to start with just the database configured.

### Install and run

```bash
pnpm install
pnpm dev
```

This starts the API and Vite dev server together at `http://localhost:3000`.

> On Windows `cmd.exe`, run `set NODE_ENV=development` on its own line before starting the
> server rather than chaining it with `&&` — cmd.exe leaves a trailing space in the value
> otherwise.

### Database

```bash
pnpm db:push
```

Generates and runs Drizzle migrations against `DATABASE_URL`.

## Scripts

| Command | Does |
|---|---|
| `pnpm dev` | Start the app locally (API + Vite) with hot reload |
| `pnpm build` | Build the client and bundle the traditional server entrypoint into `dist/` |
| `pnpm start` | Run the built app (`dist/index.js`) — for non-Vercel hosts |
| `pnpm check` | Type-check the whole project |
| `pnpm test` | Run the Vitest suite |
| `pnpm format` | Format with Prettier |
| `pnpm db:push` | Generate and run database migrations |

## Deployment

### Vercel (recommended)

The repo is set up for Vercel out of the box — `vercel.json` builds the client with
`vite build` and routes `/api/*` to the serverless function at `api/[...path].ts`, which
wraps the same Express/tRPC app used locally. Just import the repo in Vercel and set the
environment variables above in the project settings (`.env` is git-ignored and never
deployed).

### Any other Node host

```bash
pnpm build
pnpm start
```

Runs a normal long-running Express server on `$PORT` (default `3000`).

## Testing

```bash
pnpm test
```

One test (`server/serpapi.secret.test.ts`) checks live connectivity to SerpAPI using
`SERPAPI_API_KEY` and only passes when that variable is present in the process environment
running the tests — it's expected to fail in a plain `pnpm test` run since `.env` isn't
loaded into Vitest's process by default. It exercises real infrastructure, not app logic.

## License

MIT
