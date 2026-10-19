# Inflation Quiz

A Kahoot-style live quiz for a class of about 40, based on the MRU interactive
[Calculating Inflation](https://learn.mru.org/interactives/calculating-inflation).
The teacher projects the questions, students answer A or B on their phones, and a
leaderboard appears after every question. There is no player cap and no npm dependencies.

- Each question has the MRU wording ("Adjusting for inflation, which is cheaper?"), two options A and B, and 60 seconds.
- Prices and CPI info are in the **card images** (`img/<id>_a.jpg`, `img/<id>_b.jpg`), not in the answer text.
- Scoring: a correct answer earns 1000 points if instant, falling to 500 at the buzzer. A wrong answer or no answer earns 0.

## Card images

All card images are in `img/`. To change one, replace the file; names follow
`questions.json`:

| Question | Option A | Option B |
|---|---|---|
| Survivor prize money | `survivor_a.jpg` (2000) | `survivor_b.jpg` (2026) |
| Air Jordans | `jordans_a.jpg` (1985) | `jordans_b.jpg` (2026) |
| 27" television | `tv_a.jpg` (1953) | `tv_b.jpg` (2026) |
| Los Angeles house | `house_a.jpg` (1976) | `house_b.jpg` (2022) |
| Big Mac | `bigmac_a.jpg` (1968) | `bigmac_b.jpg` (2026) |
| Ford sedan | `ford_a.jpg` (1909) | `ford_b.jpg` (2020) |

JPEG or PNG both work (change the file name in `questions.json` if you use `.png`). About
360–600 px wide is plenty. If an image is missing, the card shows only the year, and the host
screen and the startup log name the missing file.

Each question's `explanation` in `questions.json` appears on the reveal/leaderboard slide.
Each one shows the inflation calculation using the price and CPI on the cards.

## Blocked names

`blocked-names.txt` lists names students can't use: swearing, sexual terms, slurs and classic
prank names like "Ben Dover". The server reads it and never sends it to phones, so a student
just sees "Please choose a different name".

- A plain line, such as `fuck`, blocks the word anywhere in a name, including `xXfuckXx`, `F.U.C.K`, `fuuuck` and `fvck`-style number swaps like `sh1t`.
- A line starting with `=`, such as `=dick`, blocks it only as a separate word. "Dick" and "Big Dick" are blocked, but "Dickens" is allowed.
- The repo is public on GitHub, so anyone who looks at the repo can read this file. To keep extra entries private, put them in a `BLOCKED_NAMES` environment variable on Render, comma-separated (e.g. `badword1,=badword2`).
- If something slips through, **click the name** on the projector (in the lobby or on the leaderboard) to remove that player. They return to the join screen.

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
- **Full screen:** the **⛶ Full screen** button (top right) or the **F** key. Press F or Esc to leave.
- Keyboard: **Space / Enter** = Start → Reveal now → Next, **F** = full screen, **M** = music on/off.
- **Reset scores** goes back to the lobby and keeps players. **Clear players** removes everyone.
- If a student reloads the page, they stay in the game (their ID is saved in `localStorage`).

## Music

The projector page plays original Kahoot-style music. It's generated in the browser, so there are no files to download:

- **Lobby:** a relaxed loop while students join.
- **Question:** a faster, tense loop, with clock ticks in the last 10 seconds (sharper in the last 5).
- **Reveal:** a "ta-da" jingle, then the lobby loop again under the leaderboard.
- **Final:** a drum roll and fanfare.

Browsers only allow sound after you click on the page, so click **🔈 Click to enable sound** (top
right) once after opening the host link. Any click or key press also works, including pressing
**Start**. The same button (or the **M** key) turns music on and off, and the setting is remembered.
Music plays only on the projector, never on students' phones. Sound comes out of whatever the
projector computer is connected to, so check the room speakers.

**Using your own music instead:** put royalty-free MP3s in `audio/` with these names:
`lobby.mp3` and `question.mp3` (looped), and `reveal.mp3` and `final.mp3` (played once). You can
use any of them; the rest stay synthesized. Restart the server or redeploy afterwards. Don't use
Kahoot's actual music, because it's copyrighted.

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
blocked-names.txt  names students may not use (server only)
questions.json     title + questions (prompt, years, image names, correct answer, explanation)
public/play.html   student phone page
public/host.html   projector page
img/               card images
audio/             optional music MP3s (see Music)
scripts/loadtest.js
render.yaml        Render blueprint
HANDOFF.md         project notes and open items
```
