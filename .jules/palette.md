
## 2024-06-11 - Dynamic HTML IDs in Mapped Lists
**Learning:** Static `htmlFor` and `id` associations inside looped UI structures (like Kanban boards or lists) break screen reader accessibility and navigation by producing duplicate DOM IDs.
**Action:** When rendering form controls in loops, dynamically generate unique strings for `id` and `htmlFor` attributes (e.g., `id={\`assign-${item.id}\`}`) to ensure unique accessibility mappings for every element.
