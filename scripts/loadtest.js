// Simulates a class of players against a running server and checks the game logic.
// Usage: node scripts/loadtest.js <baseUrl> <hostKey> [players=40]
//   e.g. node scripts/loadtest.js http://localhost:3000 ab12cd
//        node scripts/loadtest.js https://inflation-quiz-xxxx.onrender.com mypassword
// WARNING: it clears all players and resets the game on that server.
'use strict';

const [base, key, nArg] = process.argv.slice(2);
if (!base || !key) {
  console.error('Usage: node scripts/loadtest.js <baseUrl> <hostKey> [players]');
  process.exit(1);
}
const N = Number(nArg) || 40;
const questions = require('../questions.json').questions;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
function check(cond, msg) {
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${msg}`);
  if (!cond) failures++;
}

async function post(p, body) {
  const r = await fetch(base + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  let data = {};
  try { data = await r.json(); } catch (_) {}
  return { status: r.status, data };
}
const host = (action) => post('/api/host', { key, action });

// Minimal SSE client: keeps the latest state message and every message seen.
function listen(query) {
  const c = { last: null, seen: [], ctrl: new AbortController() };
  c.ready = (async () => {
    const r = await fetch(`${base}/api/events?${query}`, { signal: c.ctrl.signal });
    const reader = r.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    (async () => {
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let i;
          while ((i = buf.indexOf('\n\n')) >= 0) {
            const chunk = buf.slice(0, i);
            buf = buf.slice(i + 2);
            for (const line of chunk.split('\n')) {
              if (line.startsWith('data: ')) {
                const m = JSON.parse(line.slice(6));
                c.seen.push(m);
                if (m.type === 'state') c.last = m;
              }
            }
          }
        }
      } catch (_) { /* aborted */ }
    })();
  })();
  return c;
}

async function waitFor(fn, ms = 15000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (fn()) return true; await sleep(100); }
  return false;
}

(async () => {
  for (const [p, want] of [['/', 200], ['/host', 403], [`/host?key=${encodeURIComponent(key)}`, 200], ['/nope', 404]]) {
    const r = await fetch(base + p);
    check(r.status === want, `GET ${p.replace(key, '***')} -> ${r.status}`);
  }
  check((await post('/api/host', { key: key + 'x', action: 'reset' })).status === 403, 'wrong host key -> 403');
  await host('clear');

  const hostConn = listen('key=' + encodeURIComponent(key));
  await hostConn.ready;

  const players = [];
  const t0 = Date.now();
  for (let i = 0; i < N; i++) {
    const r = await post('/api/join', { name: `Student${i + 1}` });
    if (r.status !== 200) { check(false, `join Student${i + 1} -> ${r.status}`); continue; }
    players.push({ ...r.data, expected: 0, conn: listen('pid=' + r.data.pid) });
  }
  await Promise.all(players.map((p) => p.conn.ready));
  check(players.length === N, `${N} players joined and connected in ${Date.now() - t0} ms`);
  check((await post('/api/join', { name: 'student1' })).status === 409, 'duplicate name (case-insensitive) -> 409');
  check(await waitFor(() => hostConn.last && hostConn.last.playerCount === N), 'host sees all players');

  await host('start');
  for (let qi = 0; qi < questions.length; qi++) {
    const q = questions[qi];
    const ok = await waitFor(() => players.every((p) => p.conn.last && p.conn.last.phase === 'question' && p.conn.last.question.index === qi));
    check(ok, `Q${qi + 1}: all players received the question`);
    check(players.every((p) => p.conn.last.question.correct === undefined), `Q${qi + 1}: correct answer not leaked`);

    // Everyone except the last player answers; half right, half wrong.
    const wrong = q.correct === 'A' ? 'B' : 'A';
    await Promise.all(players.slice(0, -1).map(async (p, i) => {
      const choice = i % 2 === 0 ? q.correct : wrong;
      await post('/api/answer', { pid: p.pid, choice });
      p.choice = choice;
    }));
    await post('/api/answer', { pid: players[0].pid, choice: wrong }); // second answer is ignored
    await sleep(1200);
    check(hostConn.last.phase === 'question', `Q${qi + 1}: still waiting for the last player`);
    const lastP = players[players.length - 1];
    await post('/api/answer', { pid: lastP.pid, choice: q.correct });
    lastP.choice = q.correct;

    check(await waitFor(() => hostConn.last.phase === 'reveal'), `Q${qi + 1}: auto-revealed once all answered`);
    await waitFor(() => players.every((p) => p.conn.last.phase === 'reveal'));
    const right = players.filter((p) => p.choice === q.correct).length;
    check(hostConn.last.counts.A + hostConn.last.counts.B === N && hostConn.last.counts[q.correct] === right,
      `Q${qi + 1}: counts ${JSON.stringify(hostConn.last.counts)}`);
    const scored = players.every((p) => {
      const y = p.conn.last.you;
      const pts = y.lastPoints;
      const valid = p.choice === q.correct ? pts >= 500 && pts <= 1000 : pts === 0;
      p.expected += pts;
      return valid && y.score === p.expected && y.correct === (p.choice === q.correct);
    });
    check(scored, `Q${qi + 1}: every player scored correctly`);
    await host('next');
  }

  check(await waitFor(() => hostConn.last.phase === 'final'), 'final phase reached');
  check(hostConn.last.top.length === Math.min(10, N), 'final shows top 10');
  await host('reset');
  check(await waitFor(() => hostConn.last.phase === 'lobby' && players.every((p) => p.conn.last.you.score === 0)), 'reset returns to lobby with zero scores');
  await host('clear');
  check(await waitFor(() => players.every((p) => p.conn.seen.some((m) => m.type === 'unknown'))), 'clear tells players to rejoin');

  hostConn.ctrl.abort();
  players.forEach((p) => p.conn.ctrl.abort());
  console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll checks passed');
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
