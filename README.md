# Bricks — demo deployment

This is the Bricks prototype, packaged as a deployable web app. Follow the steps
below to get a live link you can send to anyone.

Total time: about 15 minutes. Two free accounts (GitHub + Vercel). After the
first setup, every change auto-deploys.

---

## What this is

A complete, self-contained front-end app. No database, no backend — it runs
entirely in the browser. That is why it is quick to host. The production build
(with Supabase, scraped data, etc.) is a separate, later piece of work — see the
Production Brief document.

---

## Option A — the fast path (recommended)

### Step 1 — Put the code on GitHub

1. Go to **github.com** and sign in (or create a free account).
2. Click the **+** top-right → **New repository**.
3. Name it `bricks` (or anything). Leave it Public or Private — either works.
   Do NOT tick "Add a README". Click **Create repository**.
4. On the next page, click **uploading an existing file**.
5. Drag in **all the files and folders from this project** — `package.json`,
   `vite.config.js`, `index.html`, the `src` folder, `.gitignore`, this README.
   Do NOT upload `node_modules` or `dist` if they exist (the `.gitignore`
   handles this, but skip them if you uploaded manually).
6. Click **Commit changes**.

### Step 2 — Deploy with Vercel

1. Go to **vercel.com**.
2. Click **Sign Up** → **Continue with GitHub** (this means you only have ONE
   login to manage — Vercel uses your GitHub account).
3. Once in, click **Add New… → Project**.
4. Find your `bricks` repository in the list → click **Import**.
5. Vercel auto-detects it is a Vite app. You do not need to change any settings.
6. Click **Deploy**.
7. Wait about a minute. You will get a live URL like `bricks-xxxx.vercel.app`.

That URL is your shareable link. Send it to anyone.

### Updating it later

Any change you push to the GitHub repo auto-deploys to the same URL. No extra
steps.

---

## Option B — run it on your own computer first (optional)

If you want to see it locally before deploying:

1. Install Node.js from **nodejs.org** (the LTS version).
2. Open a terminal in this folder.
3. Run: `npm install`
4. Run: `npm run dev`
5. Open the `http://localhost:5173` link it prints.

---

## Notes

- **Property photos** are loaded from public image URLs. They display fine for a
  demo. For a public launch, properly licensed/scraped images are needed.
- **The map** is a placeholder visual — a real map (Mapbox/Google) is a
  production task, see the Production Brief.
- This is the prototype / design reference. It is not the production
  architecture.
