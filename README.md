# TwoFold

**An AI kitchen companion that helps households waste less food.**

Most food waste happens quietly: groceries get pushed to the back of the fridge, forgotten, and thrown out. TwoFold keeps a live inventory of a household's kitchen, warns before things expire, and uses AI to turn what's about to go bad into a real meal.

**Live demo:** https://twofoldkitchen.com (choose **Explore as a guest** to try it without an account)

## Features

- **Snap to stock.** Photograph a receipt or your groceries and Gemini vision extracts each item, normalizes the name, categorizes it, and estimates shelf life.
- **Expiry tracking.** A freshness dashboard, expiry alerts, and a daily briefing that suggests one meal built around what's expiring.
- **Rescue recipes.** Pick expiring items, add dietary filters or a note ("no oven", "make it spicy"), and get a balanced recipe that uses them.
- **Recipe import.** Bring recipes in from a photo of a handwritten card or cookbook page, or from any recipe URL, as structured ingredients and steps.
- **AI sous chef.** Ask for substitutions, fixes ("too salty"), or the next step while cooking, with the recipe as context.
- **Smart groceries.** A shared grocery list that hands off to Walmart or Instacart search.
- **Household planning.** Shared households with member profiles, dinner polls, and potluck sign-up boards with public share links.
- **Impact reporting.** Monthly waste reports and zero-waste badges that track money and food saved.
- **Works offline.** Installable PWA with cached inventory, groceries, and recipes, plus a Capacitor config for native builds.

## Guest mode

Visitors can explore the full app without signing up:

- **Explore as a guest** starts a Supabase anonymous session. The signup trigger (`handle_new_user`) gives every guest their own "Guest Kitchen" seeded with sample pantry items (some expiring today), a grocery list, recipes, and savings history.
- Guests see every feature right away instead of unlocking them step by step.
- An hourly `pg_cron` job (`cleanup_guest_users`) deletes guest accounts older than 24 hours, along with their households and data.
- Guests can't join other households, and row-level security keeps each guest's data private, the same as a regular account.

Turn on **Allow anonymous sign-ins** in the Supabase dashboard (**Authentication → Sign In / Providers**) for guest mode to work.

## Tech stack

| Layer | Tools |
| --- | --- |
| Frontend | React, TypeScript, Vite, Tailwind CSS, shadcn/ui, TanStack Query, Framer Motion |
| Backend | Supabase (Postgres with row-level security, Auth, Realtime, Edge Functions on Deno) |
| AI | Google Gemini 2.5 Flash / Flash-Lite (vision and text) |
| Offline / mobile | vite-plugin-pwa (Workbox), Capacitor |
| Hosting | Vercel |
| Testing | Vitest, Testing Library |

## Project structure

```
src/
  pages/                 Routes (dashboard, inventory, groceries, recipes, potlucks, ...)
  components/            Feature components and shadcn/ui primitives (ui/)
  hooks/                 Data hooks, offline sync, rate-limited AI queue
  integrations/supabase  Supabase client and generated database types
supabase/
  functions/             Edge Functions (process-vision, rescue-recipe, scrape-recipe, ...)
  migrations/            Database migrations
docs/                    Schema and migration SQL
```

## Running it locally

Requires Node.js 18 or newer and a Supabase project.

```bash
git clone https://github.com/dmedin42/twofold.git
cd twofold
npm install
cp .env.example .env    # then fill in your Supabase URL and anon key
npm run dev             # http://localhost:8080
```

### Backend setup

1. Create the database schema from `supabase/migrations/` and `docs/database-schema.sql`. The guest mode migration also enables `pg_cron`.
2. Deploy the Edge Functions: `supabase functions deploy`.
3. Add a Google Gemini API key as Supabase secrets (**Edge Functions → Secrets**). They are never sent to the browser. Some functions read a secret named after themselves, so each can use its own key:

| Secret | Used by |
| --- | --- |
| `GEMINI_API_KEY` | `openai-completion`, `scrape-recipe`, `substitution-chat` |
| `process-vision` | Receipt and food photo scanning |
| `process-recipe` | Recipe photo import |
| `rescue-recipe` | Rescue recipes |
| `dinner-match` | Meal ideas and the daily briefing |

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided to Edge Functions automatically.

The key is sent to Gemini in the `x-goog-api-key` header, never in a URL. When Gemini is briefly overloaded (HTTP 429, 500, or 503), each function retries twice with a short backoff before returning an error.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm test` | Run unit tests |
| `npm run lint` | Lint the code |

## Author

Built by [David Medina](https://david-medina.me), Information Systems student at BYU.
