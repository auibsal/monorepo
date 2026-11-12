import { describe, expect, test } from "vitest";
import { deviceName } from "./device";

describe("a device's name", () => {
  test("names the browser and the system, never versions", () => {
    expect(
      deviceName(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
      )
    ).toBe("Chrome · Windows");
    expect(
      deviceName(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1"
      )
    ).toBe("Safari · iPhone");
    expect(
      deviceName(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0"
      )
    ).toBe("Edge · Windows");
  });

  test("says so when it can't tell", () => {
    expect(deviceName(null)).toBe("?");
  });
});
