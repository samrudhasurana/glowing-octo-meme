# Med Flashcards

A local flashcards and quiz app for medical school study, with spaced
repetition scheduling (SM-2, the algorithm behind Anki), multiple-choice
quizzing, and an AI-assisted workflow for turning textbook chapters into
flashcards via Claude.

## Running it locally

```bash
npm install
npm start
```

Then open http://localhost:3000.

## Sharing it online

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://dashboard.render.com/blueprint/new?repo=https://github.com/samrudhasurana/glowing-octo-meme)

Click the button above (or go to [render.com](https://render.com) and sign in
with GitHub, no credit card needed) to deploy this app on
[Render](https://render.com)'s free tier and get a public `https://...onrender.com`
link anyone can open in their browser — no download, no Terminal, nothing
installed on their end.

**Heads up about the free tier:**
- It spins down after 15 minutes of no traffic, and takes about a minute to
  wake back up on the next visit — normal for a free demo link, not
  something to worry about.
- Free web services don't get persistent disk storage, so `data/flashcards.json`
  resets to whatever is in the GitHub repo every time the service restarts
  (each spin-down/wake cycle, and every redeploy). That's fine for someone
  quickly trying the app out, but it's not a place to keep flashcards you
  care about long-term — for that, run it locally (see above), where your
  data really does stick around on disk.
- If you want a link that keeps data permanently, that needs a paid instance
  with a persistent disk attached (a few dollars a month) instead of the
  free tier — ask if you want help setting that up.

The app is a small Express server plus static frontend. All your decks and
cards live in [`data/flashcards.json`](data/flashcards.json) — a plain JSON
file in this repo, so it's versioned and portable. There's no login and no
external services; everything runs on your machine.

## Features

- **Manage decks and cards** — create decks, add/edit/delete cards with a
  front, back, optional explanation, tags, and optional quiz distractors.
- **Study mode (spaced repetition)** — flip through cards due for review and
  rate each one Again / Hard / Good / Easy. Scheduling uses the SM-2
  algorithm to space out future reviews based on how well you know each card.
- **Quiz mode (multiple choice)** — turns a deck's cards into a multiple
  choice quiz with score tracking. Distractors come from a card's own
  `distractors` field if set, otherwise they're pulled from other cards in
  the same deck.
- **Import** — paste a JSON array of flashcards (hand-written or
  AI-generated) into an existing or new deck. See
  [`public/docs/AI_IMPORT_GUIDE.md`](public/docs/AI_IMPORT_GUIDE.md) for a
  ready-to-use prompt that has Claude turn a textbook chapter into flashcards
  in the right format.

## Project layout

```
server.js              Express server and REST API
lib/srs.js              SM-2 spaced repetition scheduling
lib/store.js             Reads/writes data/flashcards.json
data/flashcards.json     The "database" — all decks and cards
public/                  Frontend (static HTML/CSS/JS, no build step)
  index.html             Dashboard: list decks
  deck.html               Manage a deck's cards
  study.html               Spaced repetition study session
  quiz.html                 Multiple-choice quiz session
  import.html                Import cards from JSON
  docs/AI_IMPORT_GUIDE.md     Prompt + instructions for AI-assisted import
```

## API

All endpoints are under `/api`:

- `GET /api/decks` / `POST /api/decks`
- `GET/PUT/DELETE /api/decks/:id`
- `POST /api/decks/:id/cards`
- `PUT/DELETE /api/cards/:id`
- `GET /api/decks/:id/study` — cards due for review
- `POST /api/cards/:id/review` — submit a review, body `{ "rating": "again"|"hard"|"good"|"easy" }`
- `GET /api/decks/:id/quiz` — generate a multiple-choice quiz
- `POST /api/decks/:id/import` — bulk import, body `{ "cards": [...] }`
