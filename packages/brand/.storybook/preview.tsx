import { DesignSystemProvider } from "@repo/design-system";
import { withThemeByDataAttribute } from "@storybook/addon-themes";
import type { Preview } from "@storybook/react";

import "@repo/design-system/styles/globals.css";

/**
 * The design system (SAL-BRD-01). Light and dark mode (ink, data-theme="dark")
 * across the site and the Diwan: every story can be checked in both modes
 * (Theme) and in both directions (Direction).
 */
const preview: Preview = {
  decorators: [
    withThemeByDataAttribute({
      attributeName: "data-theme",
      defaultTheme: "light",
      themes: { ink: "dark", light: "light" },
    }),
    (Story, context) => {
      const dir = context.globals.direction === "rtl" ? "rtl" : "ltr";
      return (
        <div
          className="bg-surface p-4 text-text"
          dir={dir}
          lang={dir === "rtl" ? "ar" : "en"}
        >
          <DesignSystemProvider dir={dir}>
            <Story />
          </DesignSystemProvider>
        </div>
      );
    },
  ],
  globalTypes: {
    direction: {
      description: "Text direction",
      toolbar: {
        dynamicTitle: true,
        items: [
          { title: "LTR (English)", value: "ltr" },
          { title: "RTL (Arabic)", value: "rtl" },
        ],
      },
    },
  },
  initialGlobals: { direction: "ltr" },
  parameters: {
    chromatic: {
      modes: {
        ink: { direction: "ltr", theme: "ink" },
        "light ltr": { direction: "ltr", theme: "light" },
        "light rtl": { direction: "rtl", theme: "light" },
      },
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    // The kit's sections, in the owner's order (Nov 4, 2026).
    options: {
      storySort: {
        order: [
          "Guide",
          [
            "Introduction",
            "Principles",
            "The logo",
            "Color",
            "Type",
            "Space, motion, icons and parts",
            "Screens",
            "Qirtas",
            "The family of programs",
            "Documents and forms",
            "Social and print",
            "Hudhud",
            "Voice",
            "Photography",
            "Files and templates",
            "Rules in short",
          ],
          "Foundations",
          ["Color", "Type", "Space and shape", "Icons"],
          "Logos",
          "Components",
          "Emails",
          "Social",
          "Print",
        ],
      },
    },
  },
};

export default preview;
