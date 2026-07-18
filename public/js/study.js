const params = new URLSearchParams(location.search);
const deckId = params.get("id");

const deckTitleEl = document.getElementById("deck-title");
const errorEl = document.getElementById("error");
const progressTextEl = document.getElementById("progress-text");
const cardAreaEl = document.getElementById("card-area");
const doneAreaEl = document.getElementById("done-area");
const flipCardEl = document.getElementById("flip-card");
const frontTextEl = document.getElementById("front-text");
const backAreaEl = document.getElementById("back-area");
const backTextEl = document.getElementById("back-text");
const explanationTextEl = document.getElementById("explanation-text");
const ratingButtonsEl = document.getElementById("rating-buttons");
const flipHintEl = document.getElementById("flip-hint");

let queue = [];
let index = 0;
let total = 0;
let revealed = false;

function showError(message) {
  errorEl.textContent = message;
  errorEl.classList.remove("hidden");
}

function showCurrentCard() {
  revealed = false;
  backAreaEl.classList.add("hidden");
  ratingButtonsEl.classList.add("hidden");
  flipHintEl.classList.remove("hidden");

  const card = queue[index];
  frontTextEl.textContent = card.front;
  backTextEl.textContent = card.back;
  explanationTextEl.textContent = card.explanation || "";
  progressTextEl.textContent = `Card ${index + 1} of ${total}`;
}

function reveal() {
  if (revealed) return;
  revealed = true;
  backAreaEl.classList.remove("hidden");
  ratingButtonsEl.classList.remove("hidden");
  flipHintEl.classList.add("hidden");
}

flipCardEl.addEventListener("click", reveal);

ratingButtonsEl.addEventListener("click", async (e) => {
  const rating = e.target.dataset.rating;
  if (!rating) return;
  const card = queue[index];
  try {
    await api.reviewCard(card.id, rating);
  } catch (err) {
    showError(err.message);
    return;
  }
  index += 1;
  if (index >= total) {
    finish();
  } else {
    showCurrentCard();
  }
});

function finish() {
  cardAreaEl.classList.add("hidden");
  doneAreaEl.classList.remove("hidden");
  doneAreaEl.innerHTML = `🎉 Session complete — you reviewed ${total} card${total === 1 ? "" : "s"}.<br/><a href="index.html">Back to dashboard</a>`;
  progressTextEl.textContent = "";
}

async function load() {
  if (!deckId) {
    showError("No deck specified.");
    return;
  }
  try {
    const deck = await api.getDeck(deckId);
    deckTitleEl.textContent = `Study: ${deck.name}`;
    queue = await api.getStudyQueue(deckId);
    total = queue.length;
    if (total === 0) {
      cardAreaEl.classList.add("hidden");
      doneAreaEl.classList.remove("hidden");
      doneAreaEl.innerHTML = `✅ No cards due right now. Nice work.<br/><a href="index.html">Back to dashboard</a>`;
      return;
    }
    cardAreaEl.classList.remove("hidden");
    showCurrentCard();
  } catch (err) {
    showError(err.message);
  }
}

load();
