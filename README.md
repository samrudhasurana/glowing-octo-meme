# Inflation Quiz

A Kahoot-style live quiz for a class of about 40, based on the MRU interactive
[Calculating Inflation](https://learn.mru.org/interactives/calculating-inflation).
The teacher projects the questions, students answer A or B on their phones, and a
leaderboard appears after every question. There is no player cap and no npm dependencies.

- Each question has the MRU wording ("Adjusting for inflation, which is cheaper?"), two options A and B, and 60 seconds.
- Prices and CPI info are in the **card images** (`img/<id>_a.jpg`, `img/<id>_b.jpg`), not in the answer text.
- Scoring: a correct answer earns 1000 points if instant, falling to 500 at the buzzer. A wrong answer or no answer earns 0.

## Add the card images (required)

The repo ships **without** card images. Put one image per option in `img/`, named after
`questions.json`:

| Question | Option A | Option B |
|---|---|---|
| Survivor prize money | `survivor_a.jpg` (2000) | `survivor_b.jpg` (2026) |
| Air Jordans | `jordans_a.jpg` (1985) | `jordans_b.jpg` (2026) |
| 27" television | `tv_a.jpg` (1953) | `tv_b.jpg` (2026) |
| Los Angeles house | `house_a.jpg` (1976) | `house_b.jpg` (2022) |
| Lego X-Wing | `lego_a.jpg` (1999) | `lego_b.jpg` (2026) |
| Ford sedan | `ford_a.jpg` (1909) | `ford_b.jpg` (2020) |

JPEG or PNG both work (change the file name in `questions.json` if you use `.png`). About
360–600 px wide is plenty. If an image is missing, the card shows only the year, and the host
screen and the startup log name the missing file.

Explanation text shown after each answer is in `questions.json` → `explanation`. Only the
Air Jordans one is filled in. Copy the others from the MRU interactive.

## Run locally

```bash
node server.js            # Node 18+
```

The terminal prints the host link (`http://localhost:3000/host?key=…`) and the student link
(`http://<your LAN IP>:3000`). Use `http://`, not `https://`. If phones can't connect, check the
macOS firewall, school-wifi client isolation, or whether phones are on cellular. Hosting
(below) avoids all of that.

Settings: `PORT` (default 3000), `HOST_KEY` (default: random, printed at startup).

## Deploy to Render (free)

1. On [render.com](https://render.com), sign in with GitHub and choose **New → Blueprint**, then pick this repo. The `render.yaml` file sets up a free Node web service. Or choose **New → Web Service** and enter: build command `npm install`, start command `node server.js`, instance type **Free**.
2. Set the environment variable **`HOST_KEY`** to a password you choose (one word, no spaces).
3. When it's live:
   - Projector: `https://<app>.onrender.com/host?key=<HOST_KEY>` (keep this private)
   - Students: `https://<app>.onrender.com`

The free instance **sleeps after about 15 minutes idle**, and waking it can take a minute. Open the
link about 5 minutes before class. Game state is kept in memory, so a restart or redeploy
loses players and scores.

## Running the quiz

- **Lobby:** the projector shows the join link and the names as students join. Press **Start**.
- **Question:** a 60-second timer runs. The answer is revealed when time runs out or when everyone has answered, or press **Reveal now**.
- **Reveal:** the correct card, A/B counts, the explanation and the top 5. Each phone shows that student's rank. Press **Next**.
- **Final:** the top 10.
- Keyboard: **Space / Enter** = Start → Reveal now → Next.
- **Reset scores** goes back to the lobby and keeps players. **Clear players** removes everyone.
- If a student reloads the page, they stay in the game (their ID is saved in `localStorage`).

## Load test

```bash
node scripts/loadtest.js http://localhost:3000 <HOST_KEY> 40
node scripts/loadtest.js https://<app>.onrender.com <HOST_KEY> 40
```

It simulates 40 players through the whole game and checks scoring, that answers stay hidden
until the reveal, duplicate names, the host key, reset and clear. **It clears the game on
that server**, so don't run it during class.

## Files

```
server.js          HTTP server, Server-Sent Events, game state (no dependencies)
questions.json     title + questions (prompt, years, image names, correct answer, explanation)
public/play.html   student phone page
public/host.html   projector page
img/               card images
scripts/loadtest.js
render.yaml        Render blueprint
HANDOFF.md         project notes and open items
```
