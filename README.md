# RE:PLAY — Circular Value Engine (hackathon prototype)

Turn unwanted products into profitable opportunities. RE:PLAY values surplus stock across resale, marketplace listings, creator transformation and material recovery, then routes each unit to its highest-value next life.

## Run

```bash
npm install
npm run dev        # http://localhost:5180
```

No API keys or backend needed. All values are simulated and stored in `localStorage`, so they survive a refresh. To start over, open the avatar menu and choose **Reset demo data**.

## 3-minute judge demo

1. **Brand problem.** Click **For Business** in the top bar, then **Analyse Inventory**. The AI Value Engine builds the Value Map: **S$126,000** recovered, against S$58,000 from liquidation (**+S$68,000**). Click **Apply recommended allocation**.
2. **Consumer discovery.** Go to **Discover** and open the pre-owned **Levi's Denim Jacket**. Checkout shows S$25 + S$2.99 Singapore Local Delivery = S$27.99. Click **Pay**, the AI analyses the jacket, and the reveal shows RE:PLAY value S$63 with two choices: **KEEP** (adds it to your collection) or **TRANSFORM**.
3. **Make money.** Click **TRANSFORM**. The AI suggests 3 ideas, each with its own image, price, cost, profit and a "Why this?" note. Click **Refresh ideas** for 3 new ones, or **Filter** by product type, style, difficulty, budget or profit. **Select** the Patchwork Mini Skirt and click **Try it on · AI Fit Preview**, pick a sample profile (or enter height, bust, waist and hips) and **Generate fit preview** to see the skirt on a model built from those measurements. Then **Proceed with transformation** (S$10). The ledger shows S$25 item + S$2.99 delivery to you + S$10 making + S$2.99 delivery to buyer = S$40.98 invested; sold for S$63 = **+S$22.02 profit**.
4. **Close the loop.** Click **Open Life Passport** to see Life 01 → 02 → 03 → 04.

## Structure

- `src/lib/engine.ts` — `calculateCircularValue()`, `allocateInventory()` (Value Map). Deterministic formulas, no randomness.
- `src/lib/ideas.ts` — transformation recommendation engine: garment profile → exactly 3 ideas, with refresh paging, filters and filter relaxation.
- `src/components/ProductMock.tsx` — local SVG product visuals drawn in the garment's own fabric and colour, so idea images never break.
- `src/lib/data.ts` — mock brands, products, creators, passports, wallet, challenges.
- `src/lib/fit.ts` — AI Fit Preview body model: measurement validation, size estimate, body landmarks, where each idea is worn. `src/components/FitModel.tsx` draws the model (SVG, offline); `src/components/FitPreview.tsx` is the try-on panel.
- `src/pages/Bag.tsx` — bag/checkout for multi-item orders. Singapore Local Delivery is a flat **S$2.99 per order** (`DELIVERY_FEE` / `orderTotals()` in `src/lib/data.ts`), never per item.
- `src/lib/store.tsx` — app state, all demo actions, and `localStorage` persistence.
- `src/pages/*` — Landing, Consumer dashboard, Discover, Buy (checkout + reveal), AI Value Engine, Creator marketplace, Transformation, Life Passport, Wallet, Profit Challenge.

## Transform: ALTER, UPCYCLE & RE:PLAY+

**Transform** on any owned item first asks: **✂ ALTER — Make it fit me** or **♻ UPCYCLE — Give it a new life**.

- **ALTER** (free): pick a direction and one or more areas (length/hem, waist, chest, hips, sleeves, leg opening — depending on the garment), enter the cm, get an **AI feasibility estimate**, a price of **S$6 per alteration area**, and a maker-ready specification. Confirming pays the fee from RE:PLAY Cash and runs the maker pipeline; the garment comes back to you and the change is added to its Life Passport.
- **UPCYCLE** (free): the existing 3 AI ideas, then AI-generated measurements from your saved body profile (or temporary ones — *Save as my profile* is opt-in), manual adjustment, feasibility and a maker-ready spec.
- **RE:PLAY+** (S$9.90/month, `/plus`): personalised, trend-aware concepts (style + preferred fit), a 2D flat sketch and a 3D on-body preview that update live as you change measurements, **Save Design**, and **Account → Saved Designs / Transformation History**. In this prototype **Try RE:PLAY+ demo** unlocks it instantly — no payment is taken.

Code: `src/lib/studio.ts` (pricing, garment measurements, feasibility, concepts, trends, specs), `src/components/AlterStudio.tsx`, `src/components/UpcycleStudio.tsx`, `src/components/Studio.tsx` (shared UI), `src/components/GarmentFlat.tsx` (2D, SVG), `src/components/Garment3D.tsx` (3D: a low-poly mesh drawn on a canvas — no 3D library), `src/components/Designs.tsx`, `src/pages/Plus.tsx`. Trend signals and maker matching are simulated and labelled as such.

## Accounts, selling & fit profile (Supabase)

Accounts, profiles and listings are stored in **Supabase**, so the same account works on every device.

**Setup**
1. Create a Supabase project, open **SQL Editor**, paste `supabase/schema.sql` and **Run**. This creates the `profiles` and `listings` tables, their row-level security rules, the `buy_listings()` purchase function, the `listing-images` storage bucket and realtime.
2. For instant sign-up, turn off **Authentication → Sign In / Providers → Email → Confirm email**. If you leave it on, new users have to click a confirmation link before they can sign in.
3. Copy `.env.example` to `.env.local` and fill in **Project URL** and the **anon public** key (Project Settings → API). Add the same two variables to Vercel (Production + Preview).

**What lives where**
- `profiles` (one row per account, owner-only): name, body measurements, the reminder preference and the account's demo data (wallet, purchases, passports, bag). Saved about 0.6 s after every change and pulled in live (realtime + on tab focus) on other devices.
- `listings` (public to read, seller-only to edit): items users sell. Photos are stored in the `listing-images` bucket. Buying calls `buy_listings()`, which claims the item atomically so it can't be sold twice.
- Code: `src/lib/supabase.ts` (client), `src/lib/store.tsx` (auth, sync, listings, checkout), `src/lib/account.ts` (types and row mapping), `src/pages/Account.tsx`, `src/pages/Sell.tsx`.

**Features**
- **Account**: sign in, or create an account with name, email and password. Personalised pages (Dashboard, Bag, Wallet, Transform, Passports, Challenges, Sell) require you to be signed in.
- **Sell an Item** (top bar and Discover): photo + name + S$ price, preview on the real marketplace card, then **List Item**. Manage your items in **Account → My Listings**.
- **Body Measurements**: optional popup after sign-in, always editable in **Account → Body Measurements**. The AI Fit Preview uses the saved profile, or temporary measurements that are only saved if you tick **Save as my profile**. Measurements never appear on listings.
