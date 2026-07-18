const params = new URLSearchParams(location.search);
const deckId = params.get("id");

const deckTitleEl = document.getElementById("deck-title");
const errorEl = document.getElementById("error");
const progressTextEl = document.getElementById("progress-text");
const setupAreaEl = document.getElementById("setup-area");
const setupInfoEl = document.getElementById("setup-info");
const sessionSizeInput = document.getElementById("session-size");
const startSessionBtn = document.getElementById("start-session-btn");
const quizAreaEl = document.getElementById("quiz-area");
const doneAreaEl = document.getElementById("done-area");
const questionTextEl = document.getElementById("question-text");
const optionsEl = document.getElementById("quiz-options");
const explanationTextEl = document.getElementById("explanation-text");
const nextBtn = document.getElementById("next-btn");

let allQuestions = [];
let questions = [];
let index = 0;
let total = 0;
let score = 0;
let answered = false;

function showError(message) {
  errorEl.textContent = message;
  errorEl.classList.remove("hidden");
}

function showQuestion() {
  answered = false;
  explanationTextEl.textContent = "";
  nextBtn.classList.add("hidden");

  const q = questions[index];
  questionTextEl.textContent = q.question;
  progressTextEl.textContent = `Question ${index + 1} of ${total} — score ${score}`;

  optionsEl.innerHTML = q.options
    .map((opt, i) => `<button class="quiz-option" data-option="${i}">${escapeHtml(opt)}</button>`)
    .join("");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

optionsEl.addEventListener("click", (e) => {
  const btn = e.target.closest(".quiz-option");
  if (!btn || answered) return;
  answered = true;

  const q = questions[index];
  const chosen = btn.textContent;
  const correct = chosen === q.correctAnswer;
  if (correct) score += 1;

  optionsEl.querySelectorAll(".quiz-option").forEach((b) => {
    b.disabled = true;
    if (b.textContent === q.correctAnswer) b.classList.add("correct");
    else if (b === btn) b.classList.add("incorrect");
  });

  explanationTextEl.textContent = q.explanation
    ? (correct ? "Correct! " : "Not quite. ") + q.explanation
    : correct ? "Correct!" : `Correct answer: ${q.correctAnswer}`;

  progressTextEl.textContent = `Question ${index + 1} of ${total} — score ${score}`;
  nextBtn.classList.remove("hidden");
});

nextBtn.addEventListener("click", () => {
  index += 1;
  if (index >= total) {
    finish();
  } else {
    showQuestion();
  }
});

function finish() {
  quizAreaEl.classList.add("hidden");
  doneAreaEl.classList.remove("hidden");
  doneAreaEl.innerHTML = `🏁 Quiz complete — score ${score} / ${total}.<br/><a href="index.html">Back to dashboard</a>`;
  progressTextEl.textContent = "";
}

document.querySelectorAll("#setup-area [data-quick]").forEach((btn) => {
  btn.addEventListener("click", () => {
    sessionSizeInput.value = btn.dataset.quick === "all" ? allQuestions.length : btn.dataset.quick;
  });
});

startSessionBtn.addEventListener("click", () => {
  let n = parseInt(sessionSizeInput.value, 10);
  if (!Number.isFinite(n) || n < 1) n = allQuestions.length;
  n = Math.min(n, allQuestions.length);

  questions = allQuestions.slice(0, n);
  total = questions.length;
  index = 0;
  score = 0;

  setupAreaEl.classList.add("hidden");
  quizAreaEl.classList.remove("hidden");
  showQuestion();
});

async function load() {
  if (!deckId) {
    showError("No deck specified.");
    return;
  }
  try {
    const deck = await api.getDeck(deckId);
    deckTitleEl.textContent = `Quiz: ${deck.name}`;
    allQuestions = await api.getQuiz(deckId);
    setupInfoEl.textContent = `${allQuestions.length} question${allQuestions.length === 1 ? "" : "s"} available in this deck.`;
    sessionSizeInput.value = Math.min(20, allQuestions.length);
    sessionSizeInput.max = allQuestions.length;
    setupAreaEl.classList.remove("hidden");
  } catch (err) {
    showError(err.message);
  }
}

load();
