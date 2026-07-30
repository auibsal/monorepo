## 2026-07-30 - Hardcoded Brutalist Shadows Break Theme Consistency
**Learning:** Developers are hardcoding arbitrary Tailwind values (e.g., `shadow-[12px_12px_...]`) instead of using the design system's semantic tokens (`shadow-brutalist-sm`, `shadow-brutalist-md`, `shadow-brutalist-lg`). This causes visual inconsistencies in depth hierarchy.
**Action:** Always use predefined `shadow-brutalist-*` tokens. When animating hover states, ensure the translation delta matches the shadow growth exactly (e.g., `-translate-x-2` matches an 8px shadow increase) to maintain physical anchoring.
