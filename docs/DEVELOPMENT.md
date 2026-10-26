# Development guide

## Requirements

- Node.js 20 or newer (developed on Node 24) and npm
- A free Supabase project for anything that needs an account

## Local setup

```bash
npm install
npm run dev            # http://localhost:5180
```

To connect Supabase, create `.env.local` in the project root with your project's values (Supabase dashboard → **Project Settings → API**). The file is git-ignored; no environment files are committed to this repository.

```dotenv
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

If the keys are missing, `supabaseConfigured` is `false`. The public pages still work on seeded data, and the sign-in page shows a "not connected" message instead of failing silently.

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New query**, paste the contents of `supabase/schema.sql`, and run it. This creates the `profiles` and `listings` tables, their row-level security policies, the sign-up trigger, the `buy_listings()` function, the `listing-images` storage bucket and the realtime publication. The script is idempotent, so it is safe to run again after changes.
3. Optional, for instant sign-up: **Authentication → Sign In / Providers → Email**, turn off **Confirm email**. If you leave it on, new users must click the emailed link before they can sign in; the app handles both cases.
4. Put the project URL and anon key in `.env.local` (and in Vercel for deployments).

Only the anon key belongs in the client. The `service_role` key bypasses row-level security and must never be added to a `VITE_` variable.

## Everyday commands

| Command | Use |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run typecheck` | Strict TypeScript check (`noUnusedLocals`, `noUnusedParameters`) |
| `npm run lint` | ESLint, including React Hooks rules |
| `npm test` / `npm run test:watch` | Vitest unit tests |
| `npm run build` | Type-check, then build to `dist/` |
| `npm run preview` | Serve `dist/` locally to check a production build |

Before pushing, run `npm run lint && npm test && npm run build`.

## Tests

Unit tests live next to the code they cover (`*.test.ts`) and focus on the deterministic domain logic:

| File | Covers |
| --- | --- |
| `lib/orders.test.ts` | One delivery fee per order; the per-item split adds up to the cent |
| `lib/engine.test.ts` | Valuation determinism, channel choice, clamping; bulk allocation places every unit |
| `lib/ideas.test.ts` | Always three distinct ideas; profit = sale − (item + making + delivery); alternatives labelled |
| `lib/fit.test.ts` | Measurement validation and size estimate |
| `lib/account.test.ts` | `safeRedirect()` open-redirect protection, handles, auth error messages |
| `lib/listings.test.ts` | Database row ↔ listing ↔ product mapping |
| `store/state.test.ts` | Loading saved profiles, including legacy keys and malformed designs |

UI flows are not covered by automated tests. When changing them, check the main journeys by hand: sign up → Discover → buy → Transform (UPCYCLE and ALTER) → Passport → Wallet, plus Sell and the mobile layout.

## Conventions

- **Where code goes.** Pure logic goes in `src/lib` (no React imports, and add a test). UI goes in `src/components/<feature>`. Route-level composition goes in `src/pages`. Anything that changes account state or talks to Supabase goes through an action in `src/store/store.tsx`.
- **State updates are immutable.** Actions build a new `State` with the helpers in the store (`addTx`, `addLife`, `updateItem`), and the store persists it automatically.
- **Adding to `State`.** Add the field and its default in `store/state.ts` (`initialState`). `stateFromProfile()` picks up the new key automatically, and existing accounts get the default.
- **Simulated features stay labelled.** Anything simulated (AI estimates, balances, makers) is marked in the UI with `<SimTag>` or similar copy. Keep it that way.
- **Style.** No semicolons, single quotes, two-space indentation, wide lines, as in the existing code. Components are PascalCase `.tsx` files; modules are lower-case `.ts`.

## Deploying

Vercel builds the project with `npm run build` and serves `dist/` with an SPA rewrite (`vercel.json`). Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for both the Production and Preview environments (Project → Settings → Environment Variables). Deploy a preview with `vercel`, check it, then promote with `vercel --prod`; or connect the GitHub repository to the Vercel project for automatic deployments.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| "Accounts aren't connected yet" on the sign-in page | `.env.local` is missing or the dev server was started before it was created; restart `npm run dev` |
| Sign-up says to check your email | Email confirmation is on in Supabase (see step 3 above) |
| "Couldn't save your listing" / photo won't upload | `schema.sql` wasn't run completely (storage bucket or policies missing), or the photo is over 3 MB |
| Changes on one device don't appear on another | Realtime publication missing; re-run `schema.sql`. The app also refreshes on tab focus |
| A refreshed deep link returns 404 in production | The SPA rewrite in `vercel.json` is missing |
