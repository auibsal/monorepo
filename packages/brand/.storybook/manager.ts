import { createElement } from "react";
import { addons, types } from "storybook/manager-api";
import { create } from "storybook/theming";

// The SAL Design System (the Diwan's /diwan/media/design, served whole on the
// site's sign-in): brand book colors (packages/brand/assets/tokens.json) and the
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
    brandTarget: "_self",
    brandTitle: "SAL Design System",
    brandUrl: "/diwan",
    colorPrimary: "#9c213e",
    colorSecondary: "#9c213e",
    fontBase: "Ubuntu, 'Segoe UI', Tahoma, Arial, sans-serif",
    textColor: "#273236",
    textMutedColor: "#5c6568",
  }),
});

// The way back: a link in the toolbar, beside the lockup (which also leads
// to the Diwan). Arabic when the page was opened from /ar.
addons.register("sal/back-to-diwan", () => {
  addons.add("sal/back-to-diwan/tool", {
    render: () => {
      const ar = window.location.pathname.startsWith("/ar/");
      return createElement(
        "a",
        {
          dir: ar ? "rtl" : "ltr",
          href: ar ? "/ar/diwan" : "/diwan",
          lang: ar ? "ar" : "en",
          style: {
            alignItems: "center",
            color: "#9c213e",
            display: "inline-flex",
            fontSize: 13,
            fontWeight: 500,
            padding: "0 12px",
            textDecoration: "none",
          },
        },
        ar ? "→ الديوان" : "← The Diwan"
      );
    },
    title: "The Diwan",
    type: types.TOOL,
  });
});
