import { describe, expect, test } from "vitest";
import { eventArchived, openingArchived, productionArchived } from "./archive";

const NOW = Date.parse("2026-11-17T12:00:00Z");

describe("the Archive", () => {
  test("an event leaves a month after it ends, or when canceled", () => {
    const event = {
      ends_at: "2026-10-01T18:00:00Z",
      starts_at: "2026-10-01T16:00:00Z",
      status: "published",
    };
    expect(eventArchived(event, NOW)).toBe(true);
    expect(
      eventArchived({ ...event, ends_at: "2026-11-10T18:00:00Z" }, NOW)
    ).toBe(false);
    expect(
      eventArchived(
        {
          ends_at: null,
          starts_at: "2026-12-08T16:00:00Z",
          status: "canceled",
        },
        NOW
      )
    ).toBe(true);
  });
  test("an opening leaves a month after it closed", () => {
    expect(
      openingArchived(
        { closes_at: "2026-09-01T00:00:00Z", is_open: false },
        NOW
      )
    ).toBe(true);
    expect(
      openingArchived(
        { closes_at: "2026-11-10T00:00:00Z", is_open: false },
        NOW
      )
    ).toBe(false);
    expect(
      openingArchived({ closes_at: "2026-01-01T00:00:00Z", is_open: true }, NOW)
    ).toBe(false);
  });
  test("a production leaves once canceled, or closed with its report", () => {
    expect(
      productionArchived({ report_signed_at: null, stage: "canceled" })
    ).toBe(true);
    expect(
      productionArchived({ report_signed_at: null, stage: "closed" })
    ).toBe(false);
    expect(
      productionArchived({ report_signed_at: "2026-11-01", stage: "closed" })
    ).toBe(true);
    expect(
      productionArchived({ report_signed_at: null, stage: "rehearsals" })
    ).toBe(false);
  });
});
