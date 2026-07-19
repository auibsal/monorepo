## 2026-07-19 - Added Explicit Focus Styles to Next.js Links
**Learning:** Next.js `<Link>` elements used as cards or custom buttons in brutalist designs often obscure or lack default browser focus rings, making keyboard navigation difficult.
**Action:** Always append explicit focus-visible classes (`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background`) to Links overriding native styles.
