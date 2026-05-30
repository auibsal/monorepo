## 2024-05-30 - Move layout components from apps to ui package
Structure: Move app-specific layout wrapper components (`ClientLayout.tsx` for `nexus`, `WebNavbarClient.tsx`, `WebNavbarServer.tsx`, `WebFooter.tsx` for `web`) closer to the global ui package where `Navbar` and `Footer` live, OR move the top-level app components (like `ClientLayout.tsx`) into a `components/layout/` folder within the app themselves.
Rule: App-specific wrappers for global UI components should be grouped in `components/layout/` folder within the app.
