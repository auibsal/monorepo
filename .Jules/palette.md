## 2024-07-15 - Dynamic IDs for Forms in Mapped Lists
**Learning:** When rendering forms in loops or duplicating form sections in React (e.g., mapped lists or Kanban boards), hardcoded IDs will result in duplicate IDs across the DOM. This breaks screen reader associations and accessibility.
**Action:** Dynamically generate unique strings for `id` and `htmlFor` attributes (e.g., `id={\`assign-${item.id}\`}`) to prevent duplicate IDs and preserve accessible screen reader associations.
