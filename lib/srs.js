// SM-2 spaced repetition scheduling (the algorithm behind classic Anki/SuperMemo).

const RATINGS = {
  again: 0,
  hard: 3,
  good: 4,
  easy: 5,
};

function freshSrsState() {
  return {
    repetitions: 0,
    interval: 0,
    easeFactor: 2.5,
    dueDate: new Date().toISOString(),
    lastReviewed: null,
  };
}

// rating is one of 'again' | 'hard' | 'good' | 'easy'
function applyReview(srs, rating) {
  const quality = RATINGS[rating];
  if (quality === undefined) {
    throw new Error(`Unknown rating: ${rating}`);
  }

  const next = { ...srs };

  if (quality < 3) {
    next.repetitions = 0;
    next.interval = 1;
  } else {
    if (next.repetitions === 0) {
      next.interval = 1;
    } else if (next.repetitions === 1) {
      next.interval = 6;
    } else {
      next.interval = Math.round(next.interval * next.easeFactor);
    }
    next.repetitions += 1;
  }

  next.easeFactor = Math.max(
    1.3,
    next.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  );

  const now = new Date();
  next.lastReviewed = now.toISOString();
  const due = new Date(now);
  due.setDate(due.getDate() + next.interval);
  next.dueDate = due.toISOString();

  return next;
}

function isDue(srs, now = new Date()) {
  return new Date(srs.dueDate).getTime() <= now.getTime();
}

module.exports = { freshSrsState, applyReview, isDue, RATINGS };
