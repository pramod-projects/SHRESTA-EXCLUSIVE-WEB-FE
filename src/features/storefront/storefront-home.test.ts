import { describe, expect, it } from "vitest";
import type { FetchLike } from "@/lib/api-client";
import { fetchStorefrontHome } from "./storefront-home";

describe("storefront-home", () => {
  it("fetches the backend-owned storefront home contract", async () => {
    const fetchImpl: FetchLike = async (input, init) => {
      expect(input).toBe("http://localhost:8090/api/v1/storefront/home");
      expect(init?.cache).toBe("no-store");
      return new Response(JSON.stringify({
        success: true,
        data: {
          brand: { name: "SHRESTA EXCLUSIVE", tagline: "Premium", logo: media(), demoVideoUrl: null },
          navigation: [],
          heroSlides: [],
          trustBadges: [],
          featuredCollectionsSection: { key: "featured_collections", eyebrow: "Shop", title: "Shop by Category", description: "Categories" },
          featuredCollections: [],
          bestsellersSection: { key: "bestsellers", eyebrow: null, title: "Bestsellers", description: "Products" },
          bestsellers: [],
          whyShrestaSection: { key: "why_shresta", eyebrow: null, title: "Why Choose SHRESTA?", description: "Why" },
          whyShresta: [],
          materialShowcase: { eyebrow: "Materials", title: "Materials", description: "Stories", stories: [] },
          newsletter: { eyebrow: "Offer", title: "Join", description: "Subscribe", ctaLabel: "Subscribe" }
        },
        error: null,
        traceId: "trace-home",
        timestamp: "2026-07-05T00:00:00Z"
      }), { headers: { "Content-Type": "application/json" } });
    };

    const home = await fetchStorefrontHome({ apiBaseUrl: "http://localhost:8090", fetchImpl });

    expect(home.brand.name).toBe("SHRESTA EXCLUSIVE");
    expect(home.brand.logo).not.toBeNull();
    expect(home.brand.logo?.variants[0]?.variantKey).toBe("thumbnail");
  });
});

function media() {
  return {
    assetKey: "hero-silk-saree-maroon-gold",
    url: "http://localhost:8090/shresta-media/categories/silk-saree-maroon-gold.png",
    altText: "Silk saree",
    width: 1154,
    height: 1398,
    deliveryMode: "backend-static-dev",
    version: 1,
    lqipDataUrl: "data:image/jpeg;base64,abc",
    variants: [
      {
        variantKey: "thumbnail",
        format: "jpg",
        width: 160,
        height: 160,
        byteSize: 12000,
        url: "http://localhost:8090/shresta-media/variants/hero-silk-saree-maroon-gold/v1/160.jpg"
      }
    ]
  };
}
