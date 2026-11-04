import { addons } from "storybook/manager-api";
import { create } from "storybook/theming";

// The SAL Design System (in the Diwan at /diwan/design): brand book colors (packages/brand/assets/tokens.json) and the
// supplied lockup in place of Storybook's own logo and name.
addons.setConfig({
  // Read-only: no add-on panel, and the sections in their own order
  // (preview.tsx, storySort) rather than roots first.
  showPanel: false,
  sidebar: { showRoots: false },
  theme: create({
    appBg: "#f5f2ee",
    appBorderColor: "#e2ddd6",
    appBorderRadius: 0,
    appContentBg: "#ffffff",
    barBg: "#ffffff",
    barSelectedColor: "#9c213e",
    base: "light",
    brandImage: "brand/sal-lockup-horizontal.svg",
    brandTarget: "_top",
    brandTitle: "SAL Design System",
    brandUrl: "/diwan/design",
    colorPrimary: "#9c213e",
    colorSecondary: "#9c213e",
    fontBase: "Ubuntu, 'Segoe UI', Tahoma, Arial, sans-serif",
    textColor: "#273236",
    textMutedColor: "#5c6568",
  }),
});
