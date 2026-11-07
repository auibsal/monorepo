# FormHeader

The top of every Society form, with its field and office-use patterns: the code and a Light title above an ink hairline, the symbol at top right, small tracked labels over ink write-on lines, and an office-use strip on `paper`.

**Markup:** `<section class="sal-form" data-theme="light">`, containing:
- `header.sal-form__head`: `.sal-form__code` (Ubuntu Mono, "SAL-EXB-01 · F-14"), `h2.sal-form__title` and `img.sal-form__symbol` (`sal-symbol.svg`, 44 px).
- `.sal-form__fields`: a two-column grid of `label.sal-form__field`, each a `.sal-label` and a `.sal-writeon`. Add `--wide` to span both columns.
- `.sal-form__office`: "For office use" and two or three write-on fields.

**What you provide:** the code and title, the labels in sentence case (CSS sets the capitals), and the office fields.

**Rules**
- Forms are always light and printed on white. Write-on lines are ink so they survive photocopying.
- Labels are nouns ("Date", "Proposed by"), never questions. A field that takes a number says what it counts: "Expected attendance".
