const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { load, save } = require("./store");
const { freshSrsState } = require("./srs");

const SEED_FILE = path.join(__dirname, "..", "data", "seed-demo.json");

// Loads a sample deck the first time the app runs with no decks at all,
// so there's something to try right away instead of a blank dashboard.
function seedDemoDataIfEmpty() {
  const data = load();
  if (data.decks.length > 0) return;

  const seed = JSON.parse(fs.readFileSync(SEED_FILE, "utf-8"));

  const deck = {
    id: crypto.randomUUID(),
    name: seed.deckName,
    description: seed.deckDescription || "",
    createdAt: new Date().toISOString(),
  };
  data.decks.push(deck);

  seed.cards.forEach((c) => {
    data.cards.push({
      id: crypto.randomUUID(),
      deckId: deck.id,
      front: c.front,
      back: c.back,
      explanation: c.explanation || "",
      tags: c.tags || [],
      distractors: c.distractors || [],
      srs: freshSrsState(),
    });
  });

  save(data);
  console.log(`Seeded "${deck.name}" with ${seed.cards.length} cards.`);
}

module.exports = { seedDemoDataIfEmpty };
