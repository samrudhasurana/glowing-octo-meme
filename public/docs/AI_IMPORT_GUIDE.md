# Generating flashcards from a textbook with Claude

This app can import flashcards as JSON on the [Import page](/import.html).
The easiest way to produce that JSON from study material is to hand a
textbook chapter (or PDF) to Claude and ask it to output cards in the exact
schema below.

## 1. What to upload

Upload the textbook chapter, lecture notes, or PDF excerpt to a Claude
conversation (claude.ai, the desktop app, or Claude Code). Keep chunks to
roughly one chapter or ~20-30 pages at a time — this keeps the flashcards
focused and keeps Claude from running out of context.

## 2. The prompt to give Claude

Copy-paste this prompt after attaching the material, and adjust the topic
count if you want more or fewer cards:

```
I'm a medical student. Using the attached material, generate spaced-repetition
flashcards for the highest-yield facts, mechanisms, and clinical associations.

Output ONLY a valid JSON array, no markdown code fences, no commentary before
or after it. Each element must follow this exact shape:

{
  "front": "A single, focused question testing one fact or concept",
  "back": "The concise, correct answer",
  "explanation": "1-2 sentences of extra context or the 'why' behind the answer",
  "tags": ["topic", "subtopic"],
  "distractors": ["plausible wrong answer 1", "plausible wrong answer 2", "plausible wrong answer 3"]
}

Rules:
- One discrete fact per card. Do not combine multiple facts into one front/back.
- "front" should be answerable without seeing the source material (self-contained).
- "back" should be as short as possible while still being unambiguous.
- "distractors" must be plausible, same length/style as the correct answer, and
  clearly wrong to someone who knows the material (used for multiple-choice quizzes).
- Prefer clinically relevant, board-exam-style facts over trivia.
- Generate between 15 and 40 cards depending on how much high-yield content
  is in the material.

Return only the JSON array.
```

## 3. What Claude gives back

Claude should return something like:

```json
[
  {
    "front": "What is the mechanism of action of penicillin?",
    "back": "Inhibits bacterial cell wall synthesis by binding penicillin-binding proteins",
    "explanation": "Beta-lactams block transpeptidase-mediated cross-linking of peptidoglycan, causing cell lysis.",
    "tags": ["pharmacology", "antibiotics"],
    "distractors": [
      "Inhibits protein synthesis at the 30S ribosomal subunit",
      "Inhibits bacterial DNA gyrase",
      "Inhibits folic acid synthesis"
    ]
  }
]
```

## 4. Import it

1. Copy Claude's JSON output (the whole array).
2. In this app, go to **Import**.
3. Choose an existing deck, or select "+ Create a new deck" and name it
   (e.g. by chapter or organ system).
4. Paste the JSON into the text box and click **Preview** to sanity-check
   the card count, then **Import**.

## Tips

- If Claude's output gets wrapped in ` ```json ... ``` ` fences, just delete
  the fence lines before pasting — the Import page expects raw JSON.
- You can also hand-edit the JSON before importing (fix a typo, drop a card)
  since it's just plain text.
- Cards without `distractors` still work fine — the quiz mode will
  auto-generate distractors from other cards in the same deck, so it's fine
  to omit that field for a faster first pass.
- Re-run the same prompt on the next chapter and import into a new deck to
  build out your library chapter by chapter.
