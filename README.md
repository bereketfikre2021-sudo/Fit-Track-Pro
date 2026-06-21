# FitTrack Pro

A modern, mobile-first fitness PWA for building workout plans, tracking completed exercises, meal planning, and weekly progress reports. All data stays in your browser unless you export a backup.

## Features

- **Workout** — Today's workout banner, sessions, warm-up/main/cool-down phases, rest timer, **plate calculator**, **skip exercise** with reason, compact cards; optional **per-set logging** (kg × reps) in Settings
- **Exercises** — Library + weekly schedule; JSON import/export; **AI workout recommendation** when empty (Gemini)
- **Report** — Weekly summary, **consistency score**, session history, achievements, week-over-week, streaks, muscles worked, export/share/print
- **Meals** — Daily meal plan with optional macros, shopping list; **AI meal plan** when empty; **AI shopping list** (Ethiopia, budget-friendly) when meals exist and list is empty (Gemini)
- **Profile** — Goals, body metrics, avatar, body weight chart (lazy-loaded), streaks
- **Settings** — Validated full backup import/export (`schemaVersion: 2`), clear data with backup safeguard
- **PWA** — Installable with offline-friendly caching

## Tech stack

- React 18 + Vite 5
- React Router 6
- Tailwind CSS + Radix UI (shadcn-style components)
- Chart.js (lazy-loaded on Profile)
- Sonner toasts
- localStorage persistence (`fittrack_pro_v2`, schema version **2**)
- vite-plugin-pwa

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### AI recommendations (optional)

Copy `.env.example` to `.env` and set your [Google AI Studio](https://aistudio.google.com/apikey) key:

```bash
VITE_GEMINI_API_KEY=your_key_here
VITE_GEMINI_MODEL=gemini-2.5-flash
```

When the exercise library or meal plan is empty, **Exercises** and **Meals** show a button to generate a goal-based plan via Gemini. Restart the dev server after changing `.env`.

### Production build

```bash
npm run build
npm run preview
```

The build script generates PWA icons (`public/icon-192.png`, `public/icon-512.png`) automatically.

Output is in `dist/`.

## Deployment

Pre-deploy checklist (run locally):

```bash
npm install
npm test
npm run build
```

All should pass before you push. CI runs the same steps on GitHub (`.github/workflows/ci.yml`).

### GitHub Pages

Push to `main` runs `.github/workflows/deploy-pages.yml`, which builds `dist/` and commits the output to **`docs/` on `main`** (no `gh-pages` branch).

**One-time setup** (fixes deploy 404 / “Pages deployment failed”):

1. Open [Settings → Pages](https://github.com/bereketfikre2021-sudo/Bk-Fitness-Track-Pro/settings/pages)
2. **Build and deployment → Source:** **Deploy from a branch**
3. **Branch:** `main` → folder **`/docs`** → **Save**
4. Push to `main` or re-run **Deploy GitHub Pages** under Actions.

Live URL: **https://bereketfikre2021-sudo.github.io/Bk-Fitness-Track-Pro/**

### Vercel

- **Build command:** `npm run build`
- **Output directory:** `dist`
- `vercel.json` includes SPA rewrites to `index.html`
- Use default base `/` (do not set `GITHUB_PAGES` env)

### Netlify

`netlify.toml` is included (build + publish `dist` + SPA redirect). `public/_redirects` is also copied into `dist`.

### Other static hosts

Serve the `dist` folder and configure a **single-page app fallback** so unknown paths return `index.html`.

### What goes in Git vs what gets deployed

You do **not** need to push `dist/` or `node_modules/`. Both are in `.gitignore`.

| In the repo (`main`) | On the live site |
|----------------------|------------------|
| Source: `src/`, `public/`, config, workflows | **`docs/`** — built in CI from `dist/`, committed on `main` |

When you push **only the files you changed** (not `git add -A` unless you mean it), the **Deploy GitHub Pages** workflow runs `npm run build` on GitHub and publishes the resulting `dist/` folder. Users never download your full project folder.

Typical workflow:

```bash
npm test
npm run build          # optional local check; dist/ stays untracked
git add src/pages/OnboardingPage.jsx public/icon-192.png   # paths you changed
git commit -m "Describe the change"
git push origin main
```

### Git tip

Initialize the repository **inside** `Fit Track Pro` (not your Windows user folder) before connecting to GitHub/Vercel:

```bash
cd "Fit Track Pro"
git init
git add .
git commit -m "Initial commit"
```

## Data & privacy

- Data is stored only in **localStorage** on the device (`fittrack_pro_v2`)
- Backups include `schemaVersion` for safer upgrades across app versions
- **Settings → Export Data** for full backups before clearing browser data
- **Exercises → JSON template / Export / Import** for library + schedule (separate from full backup; import offers merge modes)
- Full backup import validates file shape and rejects exercise-only import files by mistake

## Exercise import / export (v2)

On the **Exercises** tab you can download a starter template, **export** your current library + schedule, or **import** a JSON file with one of three modes:

- **Append** — add new exercises and schedule entries (default)
- **Replace schedule** — replace exercises on days listed in the file
- **Replace library** — replace the whole library; schedule is rebuilt from the file

A file can include:

- `exercises` — library entries (main, warm-up, cool-down)
- `schedule` — assign exercises to days by name
- `workoutDays` — days to add to your week (days in `schedule` are added automatically)

## Project structure

```
src/
├── components/     # UI tabs, nav, reports, dialogs
├── lib/            # storage, appState, stats, exercise import, workout schedule
├── pages/          # route-level pages and layout
├── App.jsx         # routes and global state
public/             # icons, backgrounds, _redirects
scripts/            # generate-icons.mjs
```

## Routes

| Path | Screen |
|------|--------|
| `/` | Workout |
| `/report` | Report |
| `/exercises` | Exercises |
| `/meal-plan` | Meals |
| `/profile` | Profile |
| `/profile/settings` | Settings |
| `/onboarding` | First-time setup |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Generate icons + production build |
| `npm run preview` | Preview production build |
| `npm run generate-icons` | Regenerate PWA icons only |
| `npm test` | Run unit tests (Vitest) |
| `npm run test:watch` | Run tests in watch mode |

## CI

GitHub Actions runs `npm test` and `npm run build` on push/PR to `main` or `master` (see `.github/workflows/ci.yml`).

## License

MIT — © Bereket Fikre
