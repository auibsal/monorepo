## 2026-06-02 - Dynamic Accessibility Mappings for Duplicated Form Sections
**Learning:** Copy-pasted form sections frequently miss unique `htmlFor` and `id` mappings, or duplicate the same ID across mapped loops (like in a Kanban board). This completely breaks screen reader associations and focus targeting.
**Action:** Always ensure that when duplicating form fields (like rubric selects) or mapping them inside a list, you define unique pairing `id` attributes dynamically (e.g. `id={`assign-${sub.id}`}`) to preserve valid, accessible form relationships.
