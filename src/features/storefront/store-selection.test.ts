import { describe, expect, it } from "vitest";
import { selectedStoreKeyAfterSearch } from "./store-selection";

describe("store selection", () => {
  it("focuses the only store left by search and clears hidden selections", () => {
    expect(selectedStoreKeyAfterSearch("bengaluru", ["bengaluru-premium-hub"], null))
      .toBe("bengaluru-premium-hub");
    expect(selectedStoreKeyAfterSearch("", ["bengaluru-premium-hub"], "mumbai-occasion-desk"))
      .toBeNull();
    expect(selectedStoreKeyAfterSearch("", ["bengaluru-premium-hub"], "bengaluru-premium-hub"))
      .toBe("bengaluru-premium-hub");
  });
});
