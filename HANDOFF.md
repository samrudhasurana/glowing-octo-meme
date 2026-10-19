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
| **Own app (this repo)** | 6 questions: Survivor, Jordans, TV, LA house, Big Mac, Ford (Lego dropped). All card images in `img/`. Passes the 40-player load test. **Not yet deployed or tested on real phones.** |

Recommended path: deploy this app to Render's free tier and use the https link in class.

## How the app works

- `GET /` → `public/play.html`. `GET /host?key=<HOST_KEY>` → `public/host.html`; it returns 403 without the key.
- `GET /img/<name>.(jpg|png)` → card images. `GET /healthz` → `{ok:true}`. `GET /api/info?key=` → LAN IPs and port; the host page uses it only on localhost.
- `GET /api/events?pid=` (student) or `?key=` (host) is a Server-Sent Events stream. The server pushes a full personalized snapshot on every change (debounced 120 ms, keepalive every 20 s). An unknown pid gets `{type:"unknown"}`, and the phone goes back to the join screen.
- `POST /api/join {name}` → `{pid,name}`. Names are at most 16 characters, unique case-insensitively (409 on a duplicate), with control characters and `<>` stripped. The game is capped at 200 players.
- `POST /api/answer {pid,choice}`: the first answer counts and later ones are ignored. Answers are accepted until `endsAt` + 1 s grace.
- `POST /api/host {key,action}`, where `action` is `start | reveal | next | reset | clear | kick` (`kick` also takes `name`).
- Names are checked against `blocked-names.txt` plus the `BLOCKED_NAMES` env var, server side only.
- Phases: `lobby → question → reveal → … → final`. The `correct` answer is never sent during the question phase.
- Scoring: `round(1000 × (1 − 0.5 × elapsed/limit))` for a correct answer, otherwise 0.
- The answer is revealed automatically 1 s after the timer ends (the answer grace period), or 600 ms after everyone has answered.
- Images: if `img/<file>` is missing, the card shows only the year. The host card and the startup log name the missing file.

## Open items

1. **Deploy to Render.** The teacher creates the account and sets `HOST_KEY`. Then run `node scripts/loadtest.js https://<app>.onrender.com <key> 40` (before class, since it clears the game).
2. **Test on a real phone** over cellular and over wifi, including a reload mid-question.
3. Optional: persist state to disk, rate-limit `/api/join`.
4. Open the Render link about 5 minutes before class to wake the free instance.

## Constraints

- Claude never enters passwords or credentials.
- Images come from the MRU interactive or the teacher's own screenshots, and the question format stays as in MRU.
- Track PIDs to stop servers; don't use `pkill -f`.
