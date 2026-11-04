# Color

## Six colors, one of them loud

The AUIB three lead: crimson, ink and white. White does most of the work, ink carries the words, and crimson appears once or twice a page at full strength.

| Color | Value | Use |
| --- | --- | --- |
| White | `#FFFFFF` | The page for everything. |
| Ink | `#273236` | Text, footers, dark mode. 13.2:1 on white. |
| Crimson | `#9C213E` | The logo, one word, one button, one band. 7.8:1. |
| Paper | `#F5F2EE` | Qirtas and long reading only. |
| Stone | `#E2DDD6` | Hairline rules. Never text. |
| Ash | `#5C6568` | Secondary text and captions. 6.0:1. |

About 70 white · 18 ink · 7 crimson · 5 paper and stone.

### Reserved

| Color | Value | Use |
| --- | --- | --- |
| Crimson-700 | `#7E1A32` | Inside the logo files only. |
| Crimson-100 (rose) | `#EBCBD3` | Accent on ink; reversed wordmarks. |
| Mist | `#C3CACB` | Secondary text in dark mode. |
| Slate | `#3D494D` | Rules in dark mode. |

Never add a color, and no program may add one. Never use crimson as a pale tint or a large block of headline. Never set crimson text or the crimson symbol on ink (1.7:1): on ink, the accent is rose.

## Color roles

Build with roles, not raw colors. Each role has a value for light mode and for dark mode, so one template works in both.

| Role | Light | Dark | Use |
| --- | --- | --- | --- |
| `surface` | white | ink | Page ground |
| `surface-reading` | paper | ink | Qirtas pages, long reading |
| `text` | ink | white | Headlines and body |
| `text-secondary` | ash | mist | Captions, meta, labels |
| `accent` | crimson | crimson-100 | The one loud thing: italic word, button |
| `on-accent` | white | ink | Text on the accent button |
| `line` | stone | slate | Hairline rules |
| `band` | crimson | crimson | One full-bleed band per page at most |
| `on-band` | white | white | Text on band |
| `footer` | ink | ink | The footer and the invitation band |

## Dark mode

Dark mode is ink, for the whole page, on screens only. The visitor's system setting picks it until they choose. Certificates, letters and printouts stay white sheets, and pages print in light mode.

## Contrast

Every text pair reaches 4.5:1 in both modes. Rules and fills that carry no words may go lower.

| Pair | Ratio |
| --- | --- |
| Ink on white | 13.2:1 |
| Ink on paper | 11.8:1 |
| Crimson on white | 7.8:1 |
| Crimson on paper | 7.0:1 |
| Ash on white | 6.0:1 |
| Ash on paper | 5.3:1 |
| White on crimson | 7.8:1 |
| Rose on crimson | 5.2:1 |
| Rose on ink | 8.8:1 |
| Mist on ink | 7.9:1 |
| Crimson on ink | 1.7:1 · never |
