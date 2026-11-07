import { describe, expect, test } from "vitest";
import { documentBody, documentSections, documentTitle } from "./documents";

describe("documents", () => {
  test("titles and text fall back to English", () => {
    const doc = {
      body_ar: null,
      body_en: "<p>Text</p>",
      title_ar: null,
      title_en: "The Constitution",
    };
    expect(documentTitle(doc, "ar")).toBe("The Constitution");
    expect(documentTitle({ ...doc, title_ar: "الدستور" }, "ar")).toBe(
      "الدستور"
    );
    expect(documentBody(doc, "ar")).toEqual({
      english: true,
      html: "<p>Text</p>",
    });
    expect(documentBody({ ...doc, body_ar: "<p>نص</p>" }, "ar")).toEqual({
      english: false,
      html: "<p>نص</p>",
    });
  });

  test("sections get ids and a table of contents", () => {
    const { contents, html } = documentSections(
      "<h2>The Articles</h2><p>1.1</p><h2>Roles &amp; Staffing</h2>"
    );
    expect(contents).toEqual([
      { id: "1-the-articles", title: "The Articles" },
      { id: "2-roles-staffing", title: "Roles & Staffing" },
    ]);
    expect(html).toContain('<h2 id="1-the-articles">The Articles</h2>');
  });

  test("document text is sanitized; tables survive", () => {
    const { html } = documentSections(
      '<table><tr><td colspan="2">A</td></tr></table><script>alert(1)</script><p onclick="x">B</p>'
    );
    expect(html).toContain('<td colspan="2">A</td>');
    expect(html).not.toContain("script");
    expect(html).not.toContain("onclick");
  });

  test("the editors' opening lines and links into Notion are left out", () => {
    const refs = new Map([
      [
        "SAL-GOV-03",
        { href: "/library/policy-manual", title: "Policy Manual" },
      ],
      ["SAL-GOV-01", { href: "/library/constitution", title: "Constitution" }],
    ]);
    const { html } = documentSections(
      '<p>النسخة العربية: <a href="https://app.notion.com/p/4108">النظام الداخلي</a></p>' +
        "<p>SAL-GOV-02 · Bylaws · Version 1, proposed · Owner: General Secretary</p>" +
        "<p>Proposed until the Founding Meeting.</p>" +
        '<p>Full text: SAL-GOV-03 Policy Manual <a href="https://app.notion.com/p/40e8">Policy Manual</a>.</p>' +
        "<p>As SAL-GOV-01 says, and SAL-EXB-01 · F-43.</p>" +
        '<p>See <a href="https://www.notion.so/abc">the handbook</a>.</p>' +
        "<h2>Related documents</h2><ul><li>SAL-GOV-03 Policy Manual</li><li>SAL-EXB-01 Leadership Handbook</li></ul>",
      refs
    );
    expect(html).not.toContain("notion");
    expect(html).not.toContain("SAL-GOV-02");
    expect(html.startsWith("<p>Proposed until the Founding Meeting.</p>")).toBe(
      true
    );
    expect(html).toContain(
      'Full text: <a href="/library/policy-manual">SAL-GOV-03 Policy Manual</a>.</p>'
    );
    expect(html).toContain(
      'As <a href="/library/constitution">SAL-GOV-01</a> says, and SAL-EXB-01 · F-43.'
    );
    expect(html).toContain("<p>See the handbook.</p>");
    expect(html).toContain(
      '<li><a href="/library/policy-manual">SAL-GOV-03 Policy Manual</a></li><li>SAL-EXB-01 Leadership Handbook</li>'
    );
  });
});
