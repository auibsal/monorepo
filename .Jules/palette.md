## 2024-03-20 - Keyboard Accessibility on Brutalist UI
**Learning:** Native browser focus rings are often completely obscured by heavy brutalist borders and custom shadows, making keyboard navigation nearly impossible for screen reader and power users on complex forms like auth screens.
**Action:** Always manually apply explicit, high-contrast `focus-visible` styles (e.g., using primary colors and offsets) to all interactive elements that override native browser styling.
