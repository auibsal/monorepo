## 2024-07-18 - Brutalist Link Focus States
**Learning:** The custom brutalist design system obscures default browser focus rings on Next.js Links and anchor tags, severely impacting keyboard accessibility.
**Action:** Always add explicit focus-visible styles (e.g., focus-visible:ring-2 focus-visible:ring-offset-2) to interactive elements overriding native styles to ensure screen reader and keyboard navigation compatibility.
