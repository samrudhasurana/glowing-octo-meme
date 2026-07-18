const deckListEl = document.getElementById("deck-list");
const emptyStateEl = document.getElementById("empty-state");
const errorEl = document.getElementById("error");
const newDeckBtn = document.getElementById("new-deck-btn");
const newDeckForm = document.getElementById("new-deck-form");
const cancelNewDeckBtn = document.getElementById("cancel-new-deck");

function showError(message) {
  errorEl.textContent = message;
  errorEl.classList.remove("hidden");
}

newDeckBtn.addEventListener("click", () => {
  newDeckForm.classList.toggle("hidden");
});
cancelNewDeckBtn.addEventListener("click", () => {
  newDeckForm.classList.add("hidden");
  newDeckForm.reset();
});

newDeckForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("deck-name").value;
  const description = document.getElementById("deck-description").value;
  try {
    await api.createDeck({ name, description });
    newDeckForm.reset();
    newDeckForm.classList.add("hidden");
    await loadDecks();
  } catch (err) {
    showError(err.message);
  }
});

function deckCardHtml(deck) {
  const dueBadge = deck.dueCount > 0
    ? `<span class="due-badge">${deck.dueCount} due</span>`
    : "";
  return `
    <div class="deck-card">
      <div class="row between">
        <div>
          <h3>${escapeHtml(deck.name)}</h3>
          <p>${escapeHtml(deck.description || "")}</p>
        </div>
        ${dueBadge}
      </div>
      <div class="stats">${deck.cardCount} card${deck.cardCount === 1 ? "" : "s"}</div>
      <div class="actions">
        <a class="btn" href="study.html?id=${deck.id}">Study${deck.dueCount ? ` (${deck.dueCount})` : ""}</a>
        <a class="btn secondary" href="quiz.html?id=${deck.id}">Quiz</a>
        <a class="btn secondary" href="deck.html?id=${deck.id}">Manage cards</a>
        <button class="btn danger" data-delete="${deck.id}">Delete</button>
      </div>
    </div>
  `;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

async function loadDecks() {
  try {
    const decks = await api.getDecks();
    if (decks.length === 0) {
      deckListEl.innerHTML = "";
      emptyStateEl.classList.remove("hidden");
      return;
    }
    emptyStateEl.classList.add("hidden");
    deckListEl.innerHTML = decks.map(deckCardHtml).join("");
    deckListEl.querySelectorAll("[data-delete]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("Delete this deck and all its cards? This cannot be undone.")) return;
        try {
          await api.deleteDeck(btn.dataset.delete);
          await loadDecks();
        } catch (err) {
          showError(err.message);
        }
      });
    });
  } catch (err) {
    showError(err.message);
  }
}

loadDecks();
