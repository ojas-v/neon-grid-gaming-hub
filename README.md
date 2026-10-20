# NEON GRID — Gaming Hub (updated with your real Pipeline Quest game)

## 1. Project contents

- `dashboard/index.html` — dashboard layout and game launcher.
- `dashboard/styles.css` — cyberpunk/glassmorphism UI.
- `dashboard/app.js` — player tag, local save fallback, Supabase integration, score history and iframe message listener.
- `games/coding-game/index.html` — your uploaded Coding via Gaming game, with a score bridge added to its level-completion handler.
- `games/pipeline-quest/index.html`, `css/style.css`, `js/game.js` — the actual Pipeline Quest files from your ZIP, preserving their relative paths. A small score-reporting bridge was added to the game's finish/failure points.
- `supabase-setup.sql` — tables, indexes and row-level security policies.

## 2. First: your SQL message is normal

If Supabase SQL Editor says **“Success. No rows returned”**, that is normally the expected result for setup SQL that creates tables, indexes and security policies. Those commands change the database structure; they do not return a table of results.

To check that the tables exist:
1. In Supabase, open **Table Editor**.
2. Look for `players` and `game_scores`.
3. If both appear, the setup query ran successfully.

If you do not see them, refresh Table Editor and confirm you ran the whole SQL script in the correct Supabase project.

## 3. Run the dashboard on your computer

Do not double-click `index.html` to open it as a `file://` URL. Run a local web server so the games and iframe work from one origin.

1. Download and extract this ZIP.
2. Open the extracted `neon-grid-gaming-hub` folder in VS Code.
3. Open **Terminal → New Terminal** in VS Code.
4. Run:

   ```bash
   python -m http.server 8000
   ```

5. In Chrome, open:

   `http://localhost:8000/dashboard/`

6. Enter a Player Tag, e.g. `NOVA_07`.
7. Launch **Coding via Gaming** or **Pipeline Quest — Kestrel 9**.
8. Complete a level/mission. For Coding via Gaming, a score snapshot is sent after a level is cleared. For Pipeline Quest, the game reports a score when the run ends (including a partial score if fuel reaches zero).
9. Click **RETURN TO HUB**. The history and high-score cards refresh.

Local mode works even before Supabase is configured. It saves scores in that browser's localStorage. Local browser saves are not cloud saves.

## 4. Connect Supabase (cloud saves)

### A. Enable anonymous sign-in

1. Sign in at https://supabase.com/ and open your project.
2. Go to **Authentication** and find **Sign In / Providers** or the sign-in method settings (the exact labels can change).
3. Enable **Anonymous Sign-Ins**.
4. Save the settings.

This demo uses Supabase anonymous authentication so each browser gets a user ID. A Player Tag is only a display name, not a verified account. If the player clears browser storage or changes device, the anonymous identity may change.

### B. Create the database tables

1. Open **SQL Editor** in your Supabase project.
2. Choose **New query**.
3. Open `supabase-setup.sql` from this project and copy its entire contents.
4. Paste it into the SQL Editor and click **Run**.
5. “Success. No rows returned” is normal for this SQL because it creates tables and policies.
6. Open **Table Editor** and confirm you see:
   - `players`
   - `game_scores`

The `players` table stores a player UUID and display name. The `game_scores` table stores each score event, the game ID, score, optional maximum score, detail text and timestamp.

### C. Add your public Supabase settings to the dashboard

1. In Supabase, open **Project Settings → API** or the project’s **Connect** panel.
2. Copy the **Project URL**.
3. Copy the **publishable key** (or the legacy `anon` key).
4. Open `dashboard/app.js`.
5. At the top, find:

   ```js
   const SUPABASE_URL = "";
   const SUPABASE_ANON_KEY = "";
   ```

6. Put your actual values inside the quotes:

   ```js
   const SUPABASE_URL = "https://YOUR_PROJECT.supabase.co";
   const SUPABASE_ANON_KEY = "YOUR_PUBLISHABLE_OR_ANON_KEY";
   ```

7. Save the file, reload `http://localhost:8000/dashboard/`, and enter a Player Tag.
8. The top status should say `CLOUD SYNC READY` (or similar).
9. Play a game and return to the hub. Open Table Editor → `players` and `game_scores` to inspect the rows.

**Never use the `service_role` key in browser code.** The public/publishable key is designed for client use when Row Level Security (RLS) is configured correctly.

## 5. How scores travel from a game to the database

The game runs inside the dashboard's iframe. At the end of a run, it sends a message to the parent dashboard with `window.parent.postMessage(...)`. The dashboard checks that the message came from the currently opened iframe and same website origin, then inserts a score row into Supabase.

For any future game, call a function like this at the real completion point:

```js
window.parent.postMessage({
  type: "GAME_SCORE",
  gameId: "pipeline-quest",
  score: finalScore,
  maxScore: 1050,
  detail: "Mission complete"
}, window.location.origin);
```

Use the actual score variable from that game. Do not send a score merely when the game opens.

## 6. Folder layout

```text
neon-grid-gaming-hub/
├── dashboard/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── games/
│   ├── coding-game/
│   │   └── index.html
│   └── pipeline-quest/
│       ├── index.html
│       ├── css/
│       │   └── style.css
│       └── js/
│           └── game.js
├── supabase-setup.sql
└── README.md
```

## 7. Troubleshooting

- **“Success. No rows returned”**: normal for DDL SQL. Confirm tables in Table Editor.
- **Dashboard says LOCAL DEMO MODE**: the URL/key may be empty, incorrect, or the Supabase CDN may not have loaded.
- **Cloud profile fails**: confirm anonymous sign-in is enabled and the SQL policies exist.
- **RLS permission error**: re-run the SQL in the correct project and check that the signed-in user is accessing rows with their own `player_id`.
- **Game doesn't load**: run the local server from the project root, not from the dashboard folder; then use `/dashboard/`.
- **Pipeline Quest starts without the hub player name**: this is not fatal; type a callsign in the game. The dashboard name is passed through the URL for convenience.
- **Scores do not appear**: open DevTools (F12) → Console. Check the `GAME_SCORE` message bridge and the Supabase error.
- **Old local scores aren't in Supabase**: local demo records are not automatically migrated to the cloud.

## 8. Security boundary

This is a well-structured semester-project starter, not an audited public gaming service. A client can manipulate browser-side score messages. For a public leaderboard, move score validation to a trusted backend or Supabase Edge Function, enforce reasonable limits, and never trust a score solely because it came from the game iframe.
