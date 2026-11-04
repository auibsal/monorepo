# Type

## Ubuntu, set like a book

Ubuntu speaks for the Society in English and Ubuntu Arabic in Arabic: one family for both languages, as AUIB uses it. The range: Light for display, Regular for reading, Medium for labels.

| Style | Screen | Print (A4) | Post (1080) | Weight | Use |
| --- | --- | --- | --- | --- | --- |
| Display | 124 · 72 px | 58 pt | 160 px | Light | Titles, the motto, large dates; one italic accent word |
| Title | 44 px | — | — | Light | Section titles, standing alone |
| Heading | 28 px | 18 pt | — | Regular | List items, card titles |
| Lede | 21 px | 17 pt | 38 px | Regular | One sentence under a title |
| Body | 17 px | 10.5 pt | — | Regular | 1.6 leading, 60–70 characters a line |
| Label | 12 px | 7.8 pt | 28 px | Medium | Field names, columns, metadata. Never above a headline |
| Code | 12 px | 9 pt | — | Mono | SAL-GOV-01 · F-14; six-word typewriter lines |

- **Arabic.** Ubuntu Arabic Regular: it has no Light and no italic, so display is Regular and the accent word is color only. 1.3 leading for display, 1.6–2.0 for text. Never tracked. `dir="rtl"`, `lang="ar"`, Western digits.
- **Inside Qirtas.** Long articles in Qirtas are set in Literata for reading. Its masthead, headlines and interface stay Ubuntu.
- **Bold.** For the logo and for emphasis inside a sentence. Never for headlines.

Ubuntu, Ubuntu Mono and Literata are free from Google Fonts. Ubuntu Arabic ships with the design system. Never substitute another Arabic face.

## The type scale

Every size has a name. Use the names in code and templates, never a size picked by eye. Each one is shown at its size in Foundations → Type.

| Style | Size / leading | Weight | Use |
| --- | --- | --- | --- |
| **Screens · Ubuntu** | | | |
| `display-xl` | 124 px / 0.98 | 300 | The home page's motto and one-word bands ("Come in."). Scales down to 56 px on phones. One italic accent word at most. |
| `display` | 72 px / 1.0 | 300 | Page titles: About, Join, an article headline. |
| `title` | 44 px / 1.1 | 300 | Section titles, standing alone; at most a text link at the end of the line. |
| `heading` | 28 px / 1.25 | 400 | List items and card titles: an event, a story. |
| `lede` | 21 px / 1.5 | 400 | One sentence under a title. |
| `body` | 17 px / 1.6 | 400 | Running text and interface copy, 60–70 characters a line. |
| `label` | 12 px / 1.4 | 500 | Small tracked capitals: field names, dates under numerals, footer headings. Never above a headline, never sentences, never Arabic. |
| `caption` | 13.5 px / 1.45 | 400 | Bylines, captions and meta in text-secondary. The section goes here, under the headline. |
| **Print (A4) · Ubuntu** | | | |
| `print-display` | 77.33 px / 1.0 | 300 | 58 pt. Cover and section titles, Light, in ink. |
| `print-lede` | 22.67 px / 1.35 | 300 | 17 pt. One sentence under a title. |
| `print-heading` | 24 px / 1.25 | 400 | 18 pt. Headings within a page. |
| `print-body` | 14 px / 1.55 | 400 | 10.5 pt. Body text. |
| `print-caption` | 11.33 px / 1.4 | 400 | 8.5 pt. Captions and notes in text-secondary. |
| `print-label` | 10.4 px / 1.3 | 500 | Small tracked labels on forms and covers. |
| **Social (1080 px posts) · Ubuntu** | | | |
| `post-display` | 160 px / 1.0 | 300 | Two to five words with a full stop. One italic word at most. |
| `post-lede` | 38 px / 1.4 | 400 | One sentence under the headline. |
| `post-meta` | 28 px / 1.4 | 500 | The date or link and @auibsal at the bottom start. |
| **Arabic · Ubuntu Arabic** | | | |
| `ar-display` | 64 px / 1.3 | 400 | Arabic headlines and the motto on Arabic pages. Regular, never tracked; the accent word changes color only. |
| `ar-heading` | 30 px / 1.6 | 400 | Arabic section titles and list headings. |
| `ar-body` | 18.5 px / 1.9 | 400 | Arabic body text, one step larger than body. |
| `ar-post` | 132 px / 1.3 | 400 | Arabic post headlines on 1080 px posts. The sentence is 42 px and the meta 30 px. |
| **Qirtas reading · Literata** | | | |
| `read-dek` | 22 px / 1.5 | 400 | The standfirst under a Qirtas headline. |
| `read-body` | 17.5 px / 1.68 | 400 | Article text in Qirtas, in two columns on wide screens. |
| **Mono · Ubuntu Mono** | | | |
| `code` | 12 px / 1.3 | 400 | Document codes, form numbers, six-word typewriter lines. |
