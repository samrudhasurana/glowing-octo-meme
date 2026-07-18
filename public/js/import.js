const targetDeckSelect = document.getElementById("target-deck");
const newDeckFields = document.getElementById("new-deck-fields");
const jsonInput = document.getElementById("json-input");
const previewBtn = document.getElementById("preview-btn");
const importBtn = document.getElementById("import-btn");
const previewArea = document.getElementById("preview-area");
const errorEl = document.getElementById("error");
const successEl = document.getElementById("success");

let parsedCards = null;

function showError(message) {
  successEl.classList.add("hidden");
  errorEl.textContent = message;
  errorEl.classList.remove("hidden");
}
function showSuccess(message) {
  errorEl.classList.add("hidden");
  successEl.textContent = message;
  successEl.classList.remove("hidden");
}
function clearBanners() {
  errorEl.classList.add("hidden");
  successEl.classList.add("hidden");
}
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

async function loadDecks() {
  const decks = await api.getDecks();
  const options = decks
    .map((d) => `<option value="${d.id}">${escapeHtml(d.name)}</option>`)
    .join("");
  targetDeckSelect.innerHTML =
    `<option value="__new__">+ Create a new deck</option>` + options;
}

targetDeckSelect.addEventListener("change", () => {
  newDeckFields.classList.toggle("hidden", targetDeckSelect.value !== "__new__");
});

previewBtn.addEventListener("click", () => {
  clearBanners();
  importBtn.disabled = true;
  parsedCards = null;
  previewArea.classList.add("hidden");

  let data;
  try {
    data = JSON.parse(jsonInput.value);
  } catch (err) {
    showError("That's not valid JSON: " + err.message);
    return;
  }

  const cards = Array.isArray(data) ? data : data.cards;
  if (!Array.isArray(cards)) {
    showError("Expected a JSON array of cards, or an object like { \"cards\": [...] }.");
    return;
  }

  const invalid = cards.filter((c) => !c || !c.front || !c.back);
  if (invalid.length > 0) {
    showError(`${invalid.length} card(s) are missing "front" or "back" and will be skipped.`);
  }

  parsedCards = cards.filter((c) => c && c.front && c.back);
  if (parsedCards.length === 0) {
    showError("No valid cards found (each needs at least front and back).");
    return;
  }

  previewArea.classList.remove("hidden");
  previewArea.innerHTML =
    `<strong>${parsedCards.length} card(s) ready to import.</strong>` +
    `<div class="card-list" style="margin-top: 10px;">` +
    parsedCards
      .slice(0, 5)
      .map(
        (c) => `<div class="flashcard-item">
          <div class="front">${escapeHtml(c.front)}</div>
          <div class="back">${escapeHtml(c.back)}</div>
        </div>`
      )
      .join("") +
    (parsedCards.length > 5 ? `<p class="subtitle">…and ${parsedCards.length - 5} more</p>` : "") +
    `</div>`;

  importBtn.disabled = false;
});

importBtn.addEventListener("click", async () => {
  if (!parsedCards) return;
  clearBanners();

  let deckId = targetDeckSelect.value;
  try {
    if (deckId === "__new__") {
      const name = document.getElementById("new-deck-name").value;
      const description = document.getElementById("new-deck-description").value;
      if (!name.trim()) {
        showError("Enter a name for the new deck.");
        return;
      }
      const deck = await api.createDeck({ name, description });
      deckId = deck.id;
    }

    const result = await api.importCards(deckId, parsedCards);
    showSuccess(
      `Imported ${result.imported} card(s).` +
        (result.errors.length ? ` ${result.errors.length} skipped due to errors.` : "")
    );
    await loadDecks();
    jsonInput.value = "";
    previewArea.classList.add("hidden");
    importBtn.disabled = true;
    parsedCards = null;
  } catch (err) {
    showError(err.message);
  }
});

loadDecks().catch((err) => showError(err.message));
