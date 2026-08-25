import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { renderProductBadgeIcon } from "./product-image-badge";

describe("product image badge", () => {
  it("renders the configured allowlisted icon ahead of legacy badge inference", () => {
    const markup = renderToStaticMarkup(renderProductBadgeIcon("BESTSELLER", "regular", "Gem"));

    expect(markup).toContain("lucide-gem");
    expect(markup).not.toContain("lucide-flame");
  });

  it("falls back to legacy inference for an unknown configured icon", () => {
    const markup = renderToStaticMarkup(renderProductBadgeIcon("BESTSELLER", "regular", "UnknownIcon"));

    expect(markup).toContain("lucide-flame");
  });
});