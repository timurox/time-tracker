# Time Tracker

A minimal time tracker for freelance work. Built as a single-page web app with Supabase for cloud sync.

## Features

- Live timer with project switching
- Today / week totals + week activity bars
- Project management (add, switch, delete)
- History grouped by day with earnings per entry
- Light/dark theme
- Magic-link sign in (no password)
- Cloud sync across devices via Supabase

## Files

| File | Purpose |
|---|---|
| `index.html` | Main app — load this in the browser |
| `app-store.jsx` | Supabase client + state hook |
| `app-views.jsx` | Now / Projects / History views |
| `supabase-schema.sql` | Database schema + RLS policies |

## Setup (one time)

### 1. Create Supabase tables

Open your Supabase project → **SQL Editor** → **New query** → paste contents of `supabase-schema.sql` → **Run**.

This creates `projects` and `entries` tables with row-level security so every user only sees their own data.

### 2. Configure Supabase auth

In Supabase dashboard → **Authentication → Providers**, make sure **Email** is enabled (it is by default).

Under **Authentication → URL Configuration**, add your site URL to the allowlist:
- `http://localhost:8000` for local testing
- `https://yourname.github.io/time-tracker` for GitHub Pages
- Any other domain you'll host on

### 3. Deploy to GitHub Pages

1. Create a new repo on github.com (e.g. `time-tracker`), public.
2. Upload these 4 files: `index.html`, `app-store.jsx`, `app-views.jsx`, `supabase-schema.sql`, plus this `README.md`.
3. Repo **Settings → Pages → Deploy from branch → main / root → Save**.
4. Wait ~1 minute, then visit `https://yourname.github.io/time-tracker`.

## Daily use

1. Open the URL, enter your email, click the magic link from your inbox.
2. The first time, two sample projects are created — edit or delete them in the **Projects** tab.
3. Hit **Start timer**. The browser tab title shows the live elapsed time.
4. Stop the timer to log an entry. View it in **History**.

To make it feel like a desktop app: in Chrome, **⋮ → Cast, save, and share → Install page as app**. You'll get a standalone window and a Dock icon.

## Privacy

Your data lives in your own Supabase project. The anon key embedded in `app-store.jsx` is safe to publish — Row Level Security policies in `supabase-schema.sql` ensure each user only sees their own rows.
