# Inflation Quiz — Handoff

Notes for whoever picks this up next: what the project is, what exists, and what is still open.
`README.md` covers how to run and deploy it.

## Goal

A Kahoot-style live quiz for a **40-student class**, based on the MRU interactive
<https://learn.mru.org/interactives/calculating-inflation>. The teacher projects the questions,
students answer on their phones, and a leaderboard appears after every question. It must be free.
Kahoot's free plan caps games at 10 players.

The question format must match MRU exactly:

- The prompt is "Adjusting for inflation, which is cheaper?". The Survivor question uses "…which is worth MORE?".
- Each question has exactly two options, A and B.
- Prices and CPI live inside the card images (one per option), not in the answer text.
- Each question lasts 60 seconds.

The teacher does all sign-ins (GitHub, Render, AhaSlides). Never enter passwords or create accounts for them.

## Tracks

| Track | Status |
|---|---|
| Kahoot | Built, but the free plan caps it at 10 players. Editor: `https://create.kahoot.it/creator/546267fa-11fd-4540-b7b0-e9cb7ad320bb` |
| AhaSlides | 5 questions plus a leaderboard. Card images still need attaching by hand (native file picker). Presenter: `https://presenter.ahaslides.com/presentation/10418581` |
| **Own app (this repo)** | Rebuilt in this repo; passes the 40-player load test. **Card images not yet added, not yet deployed, not tested on real phones.** |

Recommended path: deploy this app to Render's free tier and use the https link in class.

## How the app works

- `GET /` → `public/play.html`. `GET /host?key=<HOST_KEY>` → `public/host.html`; it returns 403 without the key.
- `GET /img/<name>.(jpg|png)` → card images. `GET /healthz` → `{ok:true}`. `GET /api/info?key=` → LAN IPs and port; the host page uses it only on localhost.
- `GET /api/events?pid=` (student) or `?key=` (host) is a Server-Sent Events stream. The server pushes a full personalized snapshot on every change (debounced 120 ms, keepalive every 20 s). An unknown pid gets `{type:"unknown"}`, and the phone goes back to the join screen.
- `POST /api/join {name}` → `{pid,name}`. Names are at most 16 characters, unique case-insensitively (409 on a duplicate), with control characters and `<>` stripped. The game is capped at 200 players.
- `POST /api/answer {pid,choice}`: the first answer counts and later ones are ignored. Answers are accepted until `endsAt` + 1 s grace.
- `POST /api/host {key,action}`, where `action` is `start | reveal | next | reset | clear`.
- Phases: `lobby → question → reveal → … → final`. The `correct` answer is never sent during the question phase.
- Scoring: `round(1000 × (1 − 0.5 × elapsed/limit))` for a correct answer, otherwise 0.
- The answer is revealed automatically 1 s after the timer ends (the answer grace period), or 600 ms after everyone has answered.
- Images: if `img/<file>` is missing, the card shows only the year. The host card and the startup log name the missing file.

## Open items

1. **Add card images** to `img/` (`<id>_a.jpg` / `<id>_b.jpg`, see README). The teacher's PNGs are in `~/Downloads` (`survivor_2000/2026`, `jordans_1985/2026`, `tv_1953/2026`, `house_1976/2022`, `bigmac_1968/2026`). Lego and Ford images exist in the earlier Kahoot/app build.
2. **Fill in the explanations** in `questions.json` from the MRU interactive. Only the Jordans one is filled in. Copy the numbers exactly; don't guess. (MRU wasn't reachable from the build environment.)
3. **Choose the question set:** keep the current 6 (Survivor, Jordans, TV, LA house, Lego, Ford), or switch to the AhaSlides 5 (drop Lego and Ford, add Big Mac). Big Mac would use the prompt `BIG MAC: Adjusting for inflation, which is cheaper?`, `a.year` 1968, `b.year` 2026, `correct: "A"`, and images `bigmac_a.jpg`/`bigmac_b.jpg`.
4. **Deploy to Render.** The teacher creates the account and sets `HOST_KEY`. Then run `node scripts/loadtest.js https://<app>.onrender.com <key> 40` (before class, since it clears the game).
5. **Test on a real phone** over cellular and over wifi, including a reload mid-question.
6. Optional: persist state to disk, rate-limit `/api/join`, add a "kick player" button.
7. Open the Render link about 5 minutes before class to wake the free instance.

## Constraints

- Claude never enters passwords or credentials.
- Images come from the MRU interactive or the teacher's own screenshots, and the question format stays as in MRU.
- Track PIDs to stop servers; don't use `pkill -f`.
