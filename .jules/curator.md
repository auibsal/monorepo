## 2026-06-30 - App-Specific Layout Wrappers Separation
Structure: Next.js app-specific layout wrappers (e.g., ClientLayout.tsx) must be grouped in src/components/layout/ to separate UI components from Next.js routing files in the app/ directory.
Rule: Never keep app-specific layout wrapper UI components directly inside the app/ routing directory.
