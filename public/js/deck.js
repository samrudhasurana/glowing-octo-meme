const params = new URLSearchParams(location.search);
const deckId = params.get("id");

const deckNameEl = document.getElementById("deck-name");
const deckDescriptionEl = document.getElementById("deck-description");
const cardListEl = document.getElementById("card-list");
const cardCountEl = document.getElementById("card-count");
const errorEl = document.getElementById("error");
const addCardForm = document.getElementById("add-card-form");

function showError(message) {
  errorEl.textContent = message;
  errorEl.classList.remove("hidden");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function parseCsv(value) {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function cardItemHtml(card) {
  const tags = card.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("");
  return `
    <div class="flashcard-item" data-card="${card.id}">
      <div class="front">${escapeHtml(card.front)}</div>
      <div class="back">${escapeHtml(card.back)}</div>
      ${card.explanation ? `<div class="back">💡 ${escapeHtml(card.explanation)}</div>` : ""}
      <div class="tags">${tags}</div>
      <div class="actions" style="margin-top: 8px;">
        <button class="btn secondary" data-delete-card="${card.id}">Delete</button>
      </div>
    </div>
  `;
}

async function load() {
  if (!deckId) {
    showError("No deck specified.");
    return;
  }
  try {
    const deck = await api.getDeck(deckId);
    deckNameEl.textContent = deck.name;
    deckDescriptionEl.textContent = deck.description || "";
    cardCountEl.textContent = deck.cards.length;
    cardListEl.innerHTML = deck.cards.map(cardItemHtml).join("");
    cardListEl.querySelectorAll("[data-delete-card]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("Delete this card?")) return;
        try {
          await api.deleteCard(btn.dataset.deleteCard);
          await load();
        } catch (err) {
          showError(err.message);
        }
      });
    });
  } catch (err) {
    showError(err.message);
  }
}

addCardForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const front = document.getElementById("front").value;
  const back = document.getElementById("back").value;
  const explanation = document.getElementById("explanation").value;
  const tags = parseCsv(document.getElementById("tags").value);
  const distractors = parseCsv(document.getElementById("distractors").value);

  try {
    await api.addCard(deckId, { front, back, explanation, tags, distractors });
    addCardForm.reset();
    await load();
  } catch (err) {
    showError(err.message);
  }
});

load();
