// Inflation Quiz — a Kahoot-style live quiz server with zero npm dependencies.
// Students: GET /            Host/projector: GET /host?key=<HOST_KEY>
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const PORT = Number(process.env.PORT) || 3000;
const HOST_KEY = process.env.HOST_KEY || crypto.randomBytes(3).toString('hex');
const ROOT = __dirname;
const MAX_PLAYERS = 200;
const ANSWER_GRACE_MS = 1000;   // late answers still count (network latency)
const ALL_ANSWERED_DELAY = 600; // reveal shortly after everyone has answered
const BROADCAST_DEBOUNCE = 120;
const KEEPALIVE_MS = 20000;

const quiz = JSON.parse(fs.readFileSync(path.join(ROOT, 'questions.json'), 'utf8'));
const questions = quiz.questions;

// Optional music overrides: audio/lobby.mp3, audio/question.mp3, audio/reveal.mp3, audio/final.mp3
let audioFiles = [];
try {
  audioFiles = fs.readdirSync(path.join(ROOT, 'audio'))
    .filter(f => /^(lobby|question|reveal|final)\.mp3$/.test(f))
    .map(f => f.replace(/\.mp3$/, ''));
} catch (_) { /* no audio folder */ }

// ---- game state (in memory) ----------------------------------------------

const players = new Map(); // pid -> {pid, name, score, lastPoints}
const clients = new Set(); // {res, pid|null, host:bool}
let phase = 'lobby';       // lobby | question | reveal | final
let qIndex = -1;
let startedAt = 0;
let endsAt = 0;
let answers = new Map();   // pid -> {choice, points, at}
let revealTimer = null;

function imgUrl(file) {
  if (!file) return null;
  return fs.existsSync(path.join(ROOT, 'img', file)) ? '/img/' + file : null;
}

function publicQuestion(i, withAnswer) {
  const q = questions[i];
  const out = {
    index: i,
    total: questions.length,
    id: q.id,
    prompt: q.prompt,
    seconds: q.seconds,
    options: {
      A: { year: q.a.year, img: imgUrl(q.a.img), file: q.a.img },
      B: { year: q.b.year, img: imgUrl(q.b.img), file: q.b.img },
    },
  };
  if (withAnswer) {
    out.correct = q.correct;
    out.explanation = q.explanation || '';
  }
  return out;
}

function ranking() {
  const list = [...players.values()].sort(
    (x, y) => y.score - x.score || x.name.localeCompare(y.name));
  let rank = 0;
  let prev = null;
  return list.map((p, i) => {
    if (p.score !== prev) { rank = i + 1; prev = p.score; }
    return { pid: p.pid, name: p.name, score: p.score, lastPoints: p.lastPoints, rank };
  });
}

function counts() {
  const c = { A: 0, B: 0, none: 0 };
  for (const a of answers.values()) c[a.choice]++;
  c.none = Math.max(0, players.size - c.A - c.B);
  return c;
}

function snapshot(client) {
  const showAnswer = phase === 'reveal' || phase === 'final';
  const ranked = ranking();
  const s = {
    type: 'state',
    now: Date.now(),
    title: quiz.title,
    phase,
    playerCount: players.size,
    answeredCount: answers.size,
    endsAt,
    startedAt,
  };
  if (qIndex >= 0 && phase !== 'lobby') s.question = publicQuestion(qIndex, showAnswer);
  if (showAnswer) {
    s.counts = counts();
    s.top = ranked.slice(0, phase === 'final' ? 10 : 5)
      .map(({ name, score, rank, lastPoints }) => ({ name, score, rank, lastPoints }));
  }
  if (client.host) {
    s.players = ranked.map(r => r.name);
    s.totalQuestions = questions.length;
    s.audioFiles = audioFiles;
  } else {
    const me = ranked.find(r => r.pid === client.pid);
    if (me) {
      const a = answers.get(me.pid);
      s.you = {
        name: me.name,
        score: me.score,
        rank: me.rank,
        of: ranked.length,
        answered: !!a,
        choice: a ? a.choice : null,
      };
      if (showAnswer && phase === 'reveal') {
        s.you.lastPoints = a ? a.points : 0;
        s.you.correct = !!a && a.choice === questions[qIndex].correct;
      }
    }
  }
  return s;
}

function send(client, obj) {
  try { client.res.write('data: ' + JSON.stringify(obj) + '\n\n'); } catch (_) { /* closed */ }
}

let broadcastTimer = null;
function broadcast() {
  if (broadcastTimer) return;
  broadcastTimer = setTimeout(() => {
    broadcastTimer = null;
    for (const c of clients) {
      if (!c.host && c.pid && !players.has(c.pid)) send(c, { type: 'unknown' });
      else send(c, snapshot(c));
    }
  }, BROADCAST_DEBOUNCE);
}

setInterval(() => {
  for (const c of clients) { try { c.res.write(': ping\n\n'); } catch (_) {} }
}, KEEPALIVE_MS).unref();

// ---- game flow --------------------------------------------------------------

function clearRevealTimer() {
  if (revealTimer) { clearTimeout(revealTimer); revealTimer = null; }
}

function startQuestion(i) {
  clearRevealTimer();
  qIndex = i;
  phase = 'question';
  answers = new Map();
  for (const p of players.values()) p.lastPoints = 0;
  startedAt = Date.now();
  endsAt = startedAt + questions[i].seconds * 1000;
  revealTimer = setTimeout(reveal, endsAt - startedAt + ANSWER_GRACE_MS);
  broadcast();
}

function reveal() {
  if (phase !== 'question') return;
  clearRevealTimer();
  phase = 'reveal';
  broadcast();
}

function next() {
  if (phase !== 'reveal') return;
  if (qIndex + 1 < questions.length) startQuestion(qIndex + 1);
  else { phase = 'final'; broadcast(); }
}

function reset(clearPlayers) {
  clearRevealTimer();
  phase = 'lobby';
  qIndex = -1;
  startedAt = endsAt = 0;
  answers = new Map();
  if (clearPlayers) players.clear();
  for (const p of players.values()) { p.score = 0; p.lastPoints = 0; }
  broadcast();
}

function answer(pid, choice) {
  const p = players.get(pid);
  if (!p) return [404, { error: 'unknown player' }];
  if (choice !== 'A' && choice !== 'B') return [400, { error: 'bad choice' }];
  const now = Date.now();
  if (phase !== 'question' || now > endsAt + ANSWER_GRACE_MS) return [409, { error: 'not accepting answers' }];
  if (answers.has(pid)) return [200, { ok: true, ignored: true }];
  const q = questions[qIndex];
  const limit = q.seconds * 1000;
  const elapsed = Math.min(Math.max(now - startedAt, 0), limit);
  const points = choice === q.correct ? Math.round(1000 * (1 - 0.5 * elapsed / limit)) : 0;
  answers.set(pid, { choice, points, at: now });
  p.score += points;
  p.lastPoints = points;
  if (answers.size >= players.size) {
    clearRevealTimer();
    revealTimer = setTimeout(reveal, ALL_ANSWERED_DELAY);
  }
  broadcast();
  return [200, { ok: true }];
}

function cleanName(raw) {
  return String(raw || '')
    .replace(/[\u0000-\u001f\u007f<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 16)
    .trim();
}

function join(rawName) {
  const name = cleanName(rawName);
  if (!name) return [400, { error: 'Please enter a name' }];
  const lower = name.toLowerCase();
  for (const p of players.values()) {
    if (p.name.toLowerCase() === lower) return [409, { error: 'That name is taken — try another' }];
  }
  if (players.size >= MAX_PLAYERS) return [503, { error: 'Game is full' }];
  const pid = crypto.randomBytes(9).toString('base64url');
  players.set(pid, { pid, name, score: 0, lastPoints: 0 });
  broadcast();
  return [200, { pid, name }];
}

function hostAction(action) {
  switch (action) {
    case 'start': if (phase === 'lobby' && questions.length) startQuestion(0); break;
    case 'reveal': reveal(); break;
    case 'next': next(); break;
    case 'reset': reset(false); break;
    case 'clear': reset(true); break;
    default: return [400, { error: 'bad action' }];
  }
  return [200, { ok: true, phase }];
}

// ---- http -------------------------------------------------------------------

function isHost(key) {
  if (typeof key !== 'string') return false;
  const a = Buffer.from(key);
  const b = Buffer.from(HOST_KEY);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function json(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 10000) { data = ''; req.destroy(); }
    });
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch (_) { resolve({}); } });
    req.on('error', () => resolve({}));
  });
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.mp3': 'audio/mpeg' };

function serveFile(res, file, cache, req) {
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found'); }
    const headers = {
      'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': cache ? 'public, max-age=300' : 'no-store',
      'Accept-Ranges': 'bytes',
    };
    // Safari needs byte-range support to play audio.
    const m = req && /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
    if (m && (m[1] || m[2])) {
      let start = m[1] ? Number(m[1]) : buf.length - Number(m[2]);
      let end = m[1] && m[2] ? Number(m[2]) : buf.length - 1;
      start = Math.max(0, start);
      end = Math.min(end, buf.length - 1);
      if (start > end) {
        res.writeHead(416, { 'Content-Range': `bytes */${buf.length}` });
        return res.end();
      }
      res.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${buf.length}`, 'Content-Length': end - start + 1 });
      return res.end(buf.subarray(start, end + 1));
    }
    res.writeHead(200, { ...headers, 'Content-Length': buf.length });
    res.end(buf);
  });
}

function lanAddresses() {
  const out = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const i of list || []) if (i.family === 'IPv4' && !i.internal) out.push(i.address);
  }
  return out;
}

function openEvents(req, res, url) {
  const host = isHost(url.searchParams.get('key'));
  const pid = url.searchParams.get('pid');
  if (!host && !pid) return json(res, 403, { error: 'forbidden' });
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-store',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write('retry: 2000\n\n');
  const client = { res, pid: host ? null : pid, host };
  clients.add(client);
  if (!host && !players.has(pid)) send(client, { type: 'unknown' });
  else send(client, snapshot(client));
  req.on('close', () => clients.delete(client));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;
  try {
    if (req.method === 'GET') {
      if (p === '/' || p === '/play') return serveFile(res, path.join(ROOT, 'public', 'play.html'));
      if (p === '/host') {
        if (!isHost(url.searchParams.get('key'))) {
          res.writeHead(403, { 'Content-Type': 'text/plain' });
          return res.end('Forbidden: open /host?key=<HOST_KEY>');
        }
        return serveFile(res, path.join(ROOT, 'public', 'host.html'));
      }
      if (/^\/img\/[a-z0-9_.-]+\.(jpe?g|png)$/i.test(p) && !p.includes('..')) {
        return serveFile(res, path.join(ROOT, p), true);
      }
      if (/^\/audio\/[a-z0-9_-]+\.mp3$/i.test(p)) {
        return serveFile(res, path.join(ROOT, p), true, req);
      }
      if (p === '/api/events') return openEvents(req, res, url);
      if (p === '/api/info') {
        if (!isHost(url.searchParams.get('key'))) return json(res, 403, { error: 'forbidden' });
        return json(res, 200, { addresses: lanAddresses(), port: PORT });
      }
      if (p === '/healthz') return json(res, 200, { ok: true });
    } else if (req.method === 'POST') {
      if (p === '/api/join') {
        const body = await readBody(req);
        const [s, o] = join(body.name);
        return json(res, s, o);
      }
      if (p === '/api/answer') {
        const body = await readBody(req);
        const [s, o] = answer(String(body.pid || ''), body.choice);
        return json(res, s, o);
      }
      if (p === '/api/host') {
        const body = await readBody(req);
        if (!isHost(body.key)) return json(res, 403, { error: 'forbidden' });
        const [s, o] = hostAction(body.action);
        return json(res, s, o);
      }
    }
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  } catch (err) {
    console.error(err);
    if (!res.headersSent) json(res, 500, { error: 'server error' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  const missing = [];
  for (const q of questions) for (const o of [q.a, q.b]) if (!imgUrl(o.img)) missing.push(o.img);
  console.log(`\n${quiz.title} — ${questions.length} questions\n`);
  console.log('HOST (open this on the projector computer):');
  console.log(`  http://localhost:${PORT}/host?key=${HOST_KEY}`);
  console.log('STUDENTS (type this into their phones):');
  const addrs = lanAddresses();
  for (const a of addrs.length ? addrs : ['localhost']) console.log(`  http://${a}:${PORT}`);
  if (missing.length) console.log(`\nMissing card images in img/: ${missing.join(', ')}`);
  console.log('');
});
