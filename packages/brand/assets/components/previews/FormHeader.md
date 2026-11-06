# FormHeader

The top of every Society form, on the site and on the printed backup alike: the code and a Light title above an ink hairline, and the symbol at top right. Forms are digital by default (see FormPage); paper is only a backup.

**Markup:** `<section class="sal-form" data-theme="light">`, containing:
- `header.sal-form__head`: `.sal-form__code` (Ubuntu Mono, "SAL-EXB-01 · F-15"), `h2.sal-form__title` and `img.sal-form__symbol` (`sal-symbol.svg`, 44 px).
- `.sal-form__fields` (printed backup only): a two-column grid of `label.sal-form__field`, each a `.sal-label` and a `.sal-writeon`. Add `--wide` to span both columns.

**What you provide:** the code from the forms register (SAL-EXB-01 · F-xx), the title and the labels in sentence case (CSS sets the capitals on paper).

**Rules**
- Labels are nouns ("Date", "Proposed by"), never questions. A field that takes a number says what it counts: "Expected attendance".
- The printed backup is always light, on white, with ink write-on lines, photographed into the record the same day. No office-use strip.
- In the form's language: Arabic forms mirror the layout; the code stays in Latin letters.
