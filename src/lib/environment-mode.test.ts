import { describe, expect, it } from "vitest";
import { deploymentMode } from "@/lib/environment-mode";

describe("deploymentMode", () => {
  it.each(["DEV", "UAT", "PROD"] as const)("accepts %s mode", (mode) => {
    expect(deploymentMode(mode)).toBe(mode);
  });

  it("rejects unknown deployment modes", () => {
    expect(() => deploymentMode("staging")).toThrow("SHRESTA_ENVIRONMENT_MODE must be DEV, UAT, or PROD");
  });
});