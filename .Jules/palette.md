## 2024-11-20 - Ensure Screen Readers Announce Dynamic Forms
**Learning:** In Next.js components rendering conditional status messages (e.g., error vs success after a form submission), visual changes alone are not announced to screen readers by default.
**Action:** Always conditionally attach `role="alert"` (for errors) and `role="status"` (for success) to dynamically appearing feedback containers so screen readers announce these updates correctly in real-time.
