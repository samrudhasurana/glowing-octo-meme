const params = new URLSearchParams(location.search);
const deckId = params.get("id");

const deckTitleEl = document.getElementById("deck-title");
const errorEl = document.getElementById("error");
const progressTextEl = document.getElementById("progress-text");
const setupAreaEl = document.getElementById("setup-area");
const setupInfoEl = document.getElementById("setup-info");
const sessionSizeInput = document.getElementById("session-size");
const startSessionBtn = document.getElementById("start-session-btn");
const cardAreaEl = document.getElementById("card-area");
const doneAreaEl = document.getElementById("done-area");
const flipCardEl = document.getElementById("flip-card");
const frontTextEl = document.getElementById("front-text");
const backAreaEl = document.getElementById("back-area");
const backTextEl = document.getElementById("back-text");
const explanationTextEl = document.getElementById("explanation-text");
const ratingButtonsEl = document.getElementById("rating-buttons");
const flipHintEl = document.getElementById("flip-hint");

let allDue = [];
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

document.querySelectorAll("#setup-area [data-quick]").forEach((btn) => {
  btn.addEventListener("click", () => {
    sessionSizeInput.value = btn.dataset.quick === "all" ? allDue.length : btn.dataset.quick;
  });
});

startSessionBtn.addEventListener("click", () => {
  let n = parseInt(sessionSizeInput.value, 10);
  if (!Number.isFinite(n) || n < 1) n = allDue.length;
  n = Math.min(n, allDue.length);

  queue = allDue.slice(0, n);
  total = queue.length;
  index = 0;

  setupAreaEl.classList.add("hidden");
  cardAreaEl.classList.remove("hidden");
  showCurrentCard();
});

async function load() {
  if (!deckId) {
    showError("No deck specified.");
    return;
  }
  try {
    const deck = await api.getDeck(deckId);
    deckTitleEl.textContent = `Study: ${deck.name}`;
    allDue = await api.getStudyQueue(deckId);
    if (allDue.length === 0) {
      cardAreaEl.classList.add("hidden");
      doneAreaEl.classList.remove("hidden");
      doneAreaEl.innerHTML = `✅ No cards due right now. Nice work.<br/><a href="index.html">Back to dashboard</a>`;
      return;
    }
    setupInfoEl.textContent = `${allDue.length} card${allDue.length === 1 ? " is" : "s are"} due for review.`;
    sessionSizeInput.value = Math.min(20, allDue.length);
    sessionSizeInput.max = allDue.length;
    setupAreaEl.classList.remove("hidden");
  } catch (err) {
    showError(err.message);
  }
}

load();
