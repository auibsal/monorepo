import ar from "@repo/internationalization/messages/ar.json";
import en from "@repo/internationalization/messages/en.json";
import { describe, expect, it } from "vitest";
import { sectionViews } from "@/components/diwan/admin/section-views";

describe("the Diwan's section tabs", () => {
  it("name every section that shows tabs and every tab, in both languages", () => {
    for (const messages of [en, ar]) {
      const labels = messages.diwan.admin.sections.tabs as Record<
        string,
        string
      >;
      for (const [section, views] of Object.entries(sectionViews)) {
        if (views.length < 2) {
          continue;
        }
        expect(labels[section], section).toBeTruthy();
        for (const view of views) {
          expect(labels[view.key], view.key).toBeTruthy();
        }
      }
    }
  });
});
