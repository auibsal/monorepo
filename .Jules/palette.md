## 2026-07-13 - Consistent Focus Rings on Links
**Learning:** Next.js `Link` elements and native anchors often lack or obscure default browser focus rings, especially with custom brutalist designs or backgrounds. This can make keyboard navigation inaccessible.
**Action:** Always add explicit keyboard focus styles (e.g., `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-auib-red`) to all interactive link components to maintain consistent keyboard navigation.
