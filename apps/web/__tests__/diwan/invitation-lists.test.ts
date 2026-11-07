import { describe, expect, it } from "vitest";
import { parseSignUps } from "@/components/diwan/admin/members/invitation-lists";

describe("parseSignUps", () => {
  it("reads one person a line: the address, then the first name", () => {
    expect(
      parseSignUps(
        " Fair.One@AUIB.edu.iq, Fair \n\nfair.two@auib.edu.iq\tSara Ali\nfair.three@auib.edu.iq"
      )
    ).toEqual([
      { email: "fair.one@auib.edu.iq", first_name: "Fair" },
      { email: "fair.two@auib.edu.iq", first_name: "Sara Ali" },
      { email: "fair.three@auib.edu.iq", first_name: "" },
    ]);
  });
});
