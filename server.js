const express = require("express");
const crypto = require("crypto");
const path = require("path");
const { load, save } = require("./lib/store");
const { freshSrsState, applyReview, isDue } = require("./lib/srs");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, "public")));

function deckSummary(deck, cards) {
  const deckCards = cards.filter((c) => c.deckId === deck.id);
  const dueCount = deckCards.filter((c) => isDue(c.srs)).length;
  return {
    ...deck,
    cardCount: deckCards.length,
    dueCount,
  };
}

// ---- Decks ----

app.get("/api/decks", (req, res) => {
  const { decks, cards } = load();
  res.json(decks.map((d) => deckSummary(d, cards)));
});

app.post("/api/decks", (req, res) => {
  const { name, description } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Deck name is required." });
  }
  const data = load();
  const deck = {
    id: crypto.randomUUID(),
    name: name.trim(),
    description: (description || "").trim(),
    createdAt: new Date().toISOString(),
  };
  data.decks.push(deck);
  save(data);
  res.status(201).json(deckSummary(deck, data.cards));
});

app.get("/api/decks/:id", (req, res) => {
  const { decks, cards } = load();
  const deck = decks.find((d) => d.id === req.params.id);
  if (!deck) return res.status(404).json({ error: "Deck not found." });
  const deckCards = cards.filter((c) => c.deckId === deck.id);
  res.json({ ...deck, cards: deckCards });
});

app.put("/api/decks/:id", (req, res) => {
  const data = load();
  const deck = data.decks.find((d) => d.id === req.params.id);
  if (!deck) return res.status(404).json({ error: "Deck not found." });
  const { name, description } = req.body;
  if (name !== undefined) deck.name = name.trim();
  if (description !== undefined) deck.description = description.trim();
  save(data);
  res.json(deckSummary(deck, data.cards));
});

app.delete("/api/decks/:id", (req, res) => {
  const data = load();
  const exists = data.decks.some((d) => d.id === req.params.id);
  if (!exists) return res.status(404).json({ error: "Deck not found." });
  data.decks = data.decks.filter((d) => d.id !== req.params.id);
  data.cards = data.cards.filter((c) => c.deckId !== req.params.id);
  save(data);
  res.status(204).end();
});

// ---- Cards ----

app.post("/api/decks/:id/cards", (req, res) => {
  const data = load();
  const deck = data.decks.find((d) => d.id === req.params.id);
  if (!deck) return res.status(404).json({ error: "Deck not found." });

  const { front, back, explanation, tags, distractors } = req.body;
  if (!front || !front.trim() || !back || !back.trim()) {
    return res.status(400).json({ error: "Both front and back are required." });
  }

  const card = {
    id: crypto.randomUUID(),
    deckId: deck.id,
    front: front.trim(),
    back: back.trim(),
    explanation: (explanation || "").trim(),
    tags: Array.isArray(tags) ? tags : [],
    distractors: Array.isArray(distractors) ? distractors : [],
    srs: freshSrsState(),
  };
  data.cards.push(card);
  save(data);
  res.status(201).json(card);
});

app.put("/api/cards/:id", (req, res) => {
  const data = load();
  const card = data.cards.find((c) => c.id === req.params.id);
  if (!card) return res.status(404).json({ error: "Card not found." });

  const { front, back, explanation, tags, distractors } = req.body;
  if (front !== undefined) card.front = front.trim();
  if (back !== undefined) card.back = back.trim();
  if (explanation !== undefined) card.explanation = explanation.trim();
  if (tags !== undefined) card.tags = Array.isArray(tags) ? tags : [];
  if (distractors !== undefined)
    card.distractors = Array.isArray(distractors) ? distractors : [];

  save(data);
  res.json(card);
});

app.delete("/api/cards/:id", (req, res) => {
  const data = load();
  const exists = data.cards.some((c) => c.id === req.params.id);
  if (!exists) return res.status(404).json({ error: "Card not found." });
  data.cards = data.cards.filter((c) => c.id !== req.params.id);
  save(data);
  res.status(204).end();
});

// ---- Study (spaced repetition) ----

app.get("/api/decks/:id/study", (req, res) => {
  const { decks, cards } = load();
  const deck = decks.find((d) => d.id === req.params.id);
  if (!deck) return res.status(404).json({ error: "Deck not found." });
  const due = shuffle(cards.filter((c) => c.deckId === deck.id && isDue(c.srs)));
  res.json(due);
});

app.post("/api/cards/:id/review", (req, res) => {
  const { rating } = req.body;
  if (!["again", "hard", "good", "easy"].includes(rating)) {
    return res.status(400).json({ error: "rating must be one of: again, hard, good, easy" });
  }
  const data = load();
  const card = data.cards.find((c) => c.id === req.params.id);
  if (!card) return res.status(404).json({ error: "Card not found." });

  card.srs = applyReview(card.srs, rating);
  save(data);
  res.json(card);
});

// ---- Quiz (multiple choice) ----

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

app.get("/api/decks/:id/quiz", (req, res) => {
  const { decks, cards } = load();
  const deck = decks.find((d) => d.id === req.params.id);
  if (!deck) return res.status(404).json({ error: "Deck not found." });

  const deckCards = cards.filter((c) => c.deckId === deck.id);
  if (deckCards.length < 2) {
    return res
      .status(400)
      .json({ error: "Need at least 2 cards in the deck to build a multiple-choice quiz." });
  }

  const questions = shuffle(deckCards).map((card) => {
    let distractors = card.distractors && card.distractors.length ? card.distractors : [];
    if (distractors.length < 3) {
      const pool = shuffle(
        deckCards.filter((c) => c.id !== card.id).map((c) => c.back)
      );
      for (const candidate of pool) {
        if (distractors.length >= 3) break;
        if (!distractors.includes(candidate) && candidate !== card.back) {
          distractors.push(candidate);
        }
      }
    }
    distractors = distractors.slice(0, 3);

    const options = shuffle([card.back, ...distractors]);
    return {
      cardId: card.id,
      question: card.front,
      options,
      correctAnswer: card.back,
      explanation: card.explanation || "",
    };
  });

  res.json(questions);
});

// ---- Import (AI-generated flashcards) ----

app.post("/api/decks/:id/import", (req, res) => {
  const data = load();
  const deck = data.decks.find((d) => d.id === req.params.id);
  if (!deck) return res.status(404).json({ error: "Deck not found." });

  const { cards } = req.body;
  if (!Array.isArray(cards)) {
    return res.status(400).json({ error: "Body must be { cards: [...] }." });
  }

  const imported = [];
  const errors = [];
  cards.forEach((c, i) => {
    if (!c || !c.front || !c.front.trim() || !c.back || !c.back.trim()) {
      errors.push(`Card at index ${i} is missing a front or back.`);
      return;
    }
    const card = {
      id: crypto.randomUUID(),
      deckId: deck.id,
      front: String(c.front).trim(),
      back: String(c.back).trim(),
      explanation: c.explanation ? String(c.explanation).trim() : "",
      tags: Array.isArray(c.tags) ? c.tags : [],
      distractors: Array.isArray(c.distractors) ? c.distractors : [],
      srs: freshSrsState(),
    };
    data.cards.push(card);
    imported.push(card);
  });

  save(data);
  res.status(201).json({ imported: imported.length, errors });
});

app.listen(PORT, () => {
  console.log(`Flashcards app running at http://localhost:${PORT}`);
});
