# Permadi Drill Plan

A personal, ADHD-friendly study tracker for *Introduction to Petroleum Reservoir Engineering* (A.K. Permadi). Progress is saved in your browser via `localStorage` — no account, no backend.

## Run locally

```bash
npm install
npm run dev
```

Open the URL it prints (usually http://localhost:5173).

## Deploy to Vercel

**Option A — Git (recommended):**
1. Push this folder to a GitHub repo.
2. Go to vercel.com → **Add New… → Project** → import the repo.
3. Vercel auto-detects Vite. Leave defaults (Build: `vite build`, Output: `dist`). Click **Deploy**.

**Option B — CLI:**
```bash
npm i -g vercel
vercel        # follow prompts; accept the Vite defaults
vercel --prod # promote to production
```

## Notes
- **Persistence is per-browser.** Your check-offs live in this browser's `localStorage`. Use the same browser/device, or add a backend later (Vercel KV / Supabase) if you want cross-device sync.
- **Edit the plan** in `src/data.js` — phases and sessions are plain objects. `tags` accepts `"KEY"`, `"MATH"`, `"FAST"`, `"BUFFER"`. The Today panel and depth gauge update automatically.
- The "Today" panel locks a daily packet until it is finished: Session A, optional Session B, and Session C for clearing Anki. A `MATH` box stands alone, a `BUFFER` box is the whole new-material day, otherwise A + B.
