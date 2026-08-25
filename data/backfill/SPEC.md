# Trivia backfill spec — READ FULLY BEFORE WRITING ANYTHING

You are generating **real trivia questions** for a WhatsApp quiz bot. A previous
agent destroyed this bank by generating template filler. Your output is checked
by an automated validator AND by hand. Filler is rejected wholesale.

## Output format

Write ONE file: `data/backfill/<category>.json`

A JSON array. Each element:

```json
{
  "q": "Which planet in our solar system has the most moons?",
  "correct": "Saturn",
  "wrong": ["Jupiter", "Neptune", "Uranus"]
}
```

Exactly 3 entries in `wrong`. No other fields — ids are assigned centrally.

## HARD RULES — violating any one of these fails the whole file

1. **Every question must be a real, checkable fact.** If you are not confident
   it is true, do not write it. A wrong answer is worse than a missing question.
2. **No numbering.** Never append `(#1)`, `(#35)`, `#N`, or any counter to a
   question. This was the exact bug that destroyed the last bank.
3. **No template padding.** Never take one question and re-emit it N times with
   only a number, name, or synonym swapped to hit a count. Each question must
   ask about a *different fact*.
4. **No duplicate question text.** Every `q` string in your file must be unique.
5. **No placeholder leaks.** Never emit the literal words "this subject",
   "this notable entity", "this entity". If your sentence needs a subject, name
   the subject.
6. **No self-answering questions.** The answer must not appear in the question
   text. Bad: "In which year did the 1969 moon landing occur?"
7. **Distractors must be plausible and unambiguously wrong.** Same category and
   type as the correct answer (if correct is a country, all three wrong are
   countries). Never include a second defensible correct answer.
   Bad: "Which brand is headquartered in Stuttgart?" correct "Porsche",
   wrong includes "Mercedes-Benz" — both are true.
8. **No vague quantifier questions.** Nothing answerable as "which statement is
   true/authentic/verified". No "all of the above". No opinion questions
   ("best", "greatest") unless it names a specific award.
9. **Keep questions short.** One sentence, under ~120 characters. The long
   winding multi-clause style was the hallmark of the filler being replaced.
10. **Answers short too.** Under ~60 characters. No parenthetical explanations
    appended to the correct answer.

## Style

Match the tone of a pub quiz: direct, specific, a named subject.

Good:
- "Which country has the most active volcanoes?" → Indonesia
- "What is the chemical symbol for potassium?" → K
- "Who directed the 1975 film Jaws?" → Steven Spielberg

Bad (all rejected):
- "In general knowledge and global culture, which statement represents an
  authentic, verified fundamental concept (#35)?"
- "The events of this subject largely occur in which fictional location?"
- "Which of these is a traditional Nigerian food?" (asked 49 times)

## Difficulty mix

Aim roughly: 40% easy (most players get it), 45% medium, 15% hard. Do not make
the whole file obscure trivia, and do not make it all trivially easy.

## Spread

Spread questions across many distinct subjects within the category. If the
category is `animals`, do not write 200 questions about mammals — cover birds,
reptiles, insects, marine life, amphibians, behaviour, habitats, records,
classification. Breadth is what makes a bank feel large; repetition is what
makes it feel broken.

## Freshness

Today is 2026. Avoid questions whose answer changes over time ("who is the
current X") unless you pin it to a year. Prefer settled facts.

## Before you finish

Self-check your own file and fix anything you find:
- [ ] Every `q` unique, no numbering, no "this subject"
- [ ] Exactly 3 distractors each, none of them also correct
- [ ] Answer never appears inside the question text
- [ ] Every fact one you are confident is true
- [ ] Count matches the number you were asked for

Report back only: the category, the final count, and any facts you were unsure
about and therefore dropped. Keep the report under 10 lines.
