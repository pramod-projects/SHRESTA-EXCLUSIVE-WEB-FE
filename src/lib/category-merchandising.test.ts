import { describe, expect, it } from "vitest";
import { colorFilters, merchandisingTags } from "./category-merchandising";

describe("category merchandising", () => {
  it("returns configured tag icons and iconless colour filters", () => {
    const metadata = {
      merchandisingTags: [
        { value: "exclusive", label: "Exclusive Edit", icon: "Gem" },
        { value: "COLOR_RED", label: "Invalid tag", icon: "Star" },
        { value: "untrusted", label: "Invalid icon", icon: "CircleDollarSign" }
      ],
      colorFilters: [
        { value: "color_red", label: "Ruby Red", icon: "Heart" },
        { value: "blue", label: "Invalid colour" }
      ]
    };

    expect(merchandisingTags(metadata)).toEqual([
      { value: "EXCLUSIVE", label: "Exclusive Edit", icon: "Gem" }
    ]);
    expect(colorFilters(metadata)).toEqual([
      { value: "COLOR_RED", label: "Ruby Red" }
    ]);
  });

  it("uses defaults only when configuration is absent and honors explicit empty catalogs", () => {
    expect(merchandisingTags({})).not.toHaveLength(0);
    expect(colorFilters({})).not.toHaveLength(0);
    expect(merchandisingTags({ merchandisingTags: [] })).toEqual([]);
    expect(colorFilters({ colorFilters: [] })).toEqual([]);
  });
});