## 2026-05-18 - Explicit Form Label Binding
**Learning:** React form inputs without explicitly bound labels via `htmlFor` and `id` degrade accessibility for screen reader users and create smaller touch targets for pointing devices.
**Action:** Always explicitly bind `<label>` elements to their corresponding inputs using `htmlFor` and `id` attributes, even if they are conceptually grouped in the DOM. Use `aria-labelledby` when wrapping complex or external components like TipTap's RichTextEditor.
