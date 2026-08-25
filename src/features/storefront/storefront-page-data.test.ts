import { describe, expect, it } from "vitest";
import type { FeaturedCollection, StorefrontHome } from "./storefront-home";
import { familyKeyToSlug, productsForCollection, productsForFamily, productsMatchingQuery, slugToFamilyKey } from "./storefront-page-data";

describe("storefront-page-data", () => {
  it("returns all backend products when no family key is provided", () => {
    const home = storefrontHomeFixture([
      { id: "product-shresta-kalankari-0001", familyKey: "silk_saree" },
      { id: "product-shresta-karishma-0001", familyKey: "silk_saree" },
      { id: "product-shresta-monalisa-0001", familyKey: "silk_saree" }
    ]);

    expect(productsForFamily(home).map((product) => product.id)).toEqual([
      "product-shresta-kalankari-0001",
      "product-shresta-karishma-0001",
      "product-shresta-monalisa-0001"
    ]);
  });

  it("filters collection products from backend product badge filter metadata", () => {
    const home = storefrontHomeFixture([
      { badges: ["Collection Kalankari"], id: "product-shresta-kalankari-0001", familyKey: "silk_saree" },
      { badges: ["Festival Edit", "Collection Karishma"], id: "product-shresta-karishma-0001", familyKey: "silk_saree" },
      { badges: ["Collection Monalisa"], id: "product-shresta-monalisa-0001", familyKey: "silk_saree" }
    ]);

    expect(productsForCollection(home, collectionFixture("karishma", "silk_saree", ["Collection Karishma"])).map((product) => product.id)).toEqual([
      "product-shresta-karishma-0001"
    ]);
  });

  it("prefers strict productType to collection slug matching", () => {
    const home = storefrontHomeFixture([
      { id: "product-shresta-kalankari-0001", familyKey: "silk_saree", productType: "kalankari", badges: ["Collection Monalisa"] },
      { id: "product-shresta-monalisa-0001", familyKey: "silk_saree", productType: "monalisa", badges: ["Collection Kalankari"] }
    ]);

    expect(productsForCollection(home, collectionFixture("kalankari", "silk_saree", ["Collection Kalankari"])).map((product) => product.id)).toEqual([
      "product-shresta-kalankari-0001"
    ]);
  });

  it("still filters real category family pages by family key", () => {
    const home = storefrontHomeFixture([
      { id: "product-shresta-kalankari-0001", familyKey: "silk_saree" },
      { id: "product-shresta-silk-0001", familyKey: "silk_saree" }
    ]);

    expect(productsForFamily(home, "silk_saree").map((product) => product.id)).toEqual([
      "product-shresta-kalankari-0001",
      "product-shresta-silk-0001"
    ]);
  });

  it("keeps customer-facing plural category slugs aligned to backend family keys", () => {
    expect(slugToFamilyKey("silk-sarees")).toBe("silk_saree");
    expect(familyKeyToSlug("silk_saree")).toBe("silk-sarees");
  });

  it("matches products when query omits in-between words", () => {
    const home = storefrontHomeFixture([
      { id: "Kalankari Soft Silk Saree 073439", familyKey: "silk_saree" },
      { id: "Karishma Banarasi Saree 123456", familyKey: "silk_saree" }
    ]);

    expect(productsMatchingQuery(home.bestsellers, "Kalankari Silk 073439").map((product) => product.id)).toEqual([
      "Kalankari Soft Silk Saree 073439"
    ]);
  });

  it("matches products for multi-word prefix query", () => {
    const home = storefrontHomeFixture([
      { id: "Kalankari Soft Silk Saree 073439", familyKey: "silk_saree" },
      { id: "Monalisa Tissue Saree 998877", familyKey: "silk_saree" }
    ]);

    expect(productsMatchingQuery(home.bestsellers, "Kalankari Silk Saree").map((product) => product.id)).toEqual([
      "Kalankari Soft Silk Saree 073439"
    ]);
  });

  it("tolerates minor typos in query tokens", () => {
    const home = storefrontHomeFixture([
      { id: "Kalankari Soft Silk Saree 073439", familyKey: "silk_saree" },
      { id: "Monalisa Tissue Saree 998877", familyKey: "silk_saree" }
    ]);

    expect(productsMatchingQuery(home.bestsellers, "Kalmkari Silk 073439").map((product) => product.id)).toEqual([
      "Kalankari Soft Silk Saree 073439"
    ]);
  });

  it("ranks exact token matches above fuzzy alternatives", () => {
    const home = storefrontHomeFixture([
      { id: "Kalankari Silk Saree 073439", familyKey: "silk_saree" },
      { id: "Kalmkari Silk Saree 073438", familyKey: "silk_saree" }
    ]);

    expect(productsMatchingQuery(home.bestsellers, "Kalankari Silk").map((product) => product.id)).toEqual([
      "Kalankari Silk Saree 073439",
      "Kalmkari Silk Saree 073438"
    ]);
  });
});

function storefrontHomeFixture(products: Array<{ badges?: string[]; id: string; familyKey: string; productType?: string }>): StorefrontHome {
  return {
    brand: { itemKey: "brand-shresta-exclusive", name: "SHRESTA EXCLUSIVE", tagline: "Premium", logo: null, demoVideoUrl: null },
    navigation: [],
    heroSlides: [],
    trustBadges: [],
    featuredCollectionsSection: { key: "featured_collections", eyebrow: "Shop", title: "Shop by Category", description: "Categories" },
    featuredCollections: [],
    bestsellersSection: { key: "bestsellers", eyebrow: null, title: "Bestsellers", description: "Products" },
    bestsellers: products.map((product) => ({
      id: product.id,
      sku: product.id.toUpperCase(),
      name: product.id,
      slug: product.id,
      description: `${product.id} short description`,
      longDescription: `${product.id} long description`,
      familyKey: product.familyKey,
      productType: product.productType ?? "test",
      pricePaise: 10000,
      compareAtPricePaise: 12000,
      rating: 4.5,
      reviewCount: 10,
      stockQuantity: 5,
      badges: product.badges ?? [],
      badgeIcons: {},
      colorFilter: null,
      image: null,
      galleryImages: [],
      demoVideoUrl: null,
      isBestseller: true
    })),
    whyShrestaSection: { key: "why_shresta", eyebrow: null, title: "Why Choose SHRESTA?", description: "Why" },
    whyShresta: [],
    materialShowcase: { eyebrow: "Materials", title: "Materials", description: "Stories", stories: [] },
    newsletter: { eyebrow: "Offer", title: "Join", description: "Subscribe", ctaLabel: "Subscribe" }
  };
}

function collectionFixture(slug: string, familyKey: string, productBadgeFilters: string[] = []): FeaturedCollection {
  return {
    description: "Collection",
    familyKey,
    featured: true,
    id: `collection-${slug}`,
    image: null,
    itemCount: 0,
    productBadgeFilters,
    qualityBadges: [],
    slug,
    title: slug
  };
}
