## 2024-05-14 - Selective Data Fetching in Kanban Board
**Learning:** Fetching all columns via `select('*')` on the Kanban board pulls in large rich-text 'content' and 'file_url' fields unnecessarily, causing slower payloads since only specific metadata columns are needed to render the board (id, title, type, status, rubric_formatting).
**Action:** Always constrain `.select()` payloads on large data structures (like Submissions) to exactly what is needed for the specific UI component.
