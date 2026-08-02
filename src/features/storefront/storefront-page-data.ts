import { fetchCategoryFamilies, type CategoryFamily } from "@/features/catalog/category-config";
import {
  fetchStorefrontHome,
  type FeaturedCollection,
  type ProductCard,
  type StorefrontHome
} from "@/features/storefront/storefront-home";
import { fetchStorefrontStores, type StorefrontStores } from "@/features/storefront/storefront-stores";
import { nullWhenShrestaApiUnavailable } from "@/lib/api-page-fallback";

export type StorefrontPageData = {
  home: StorefrontHome;
  categories: CategoryFamily[];
};

export type StorefrontStoresPageData = {
  home: StorefrontHome;
  stores: StorefrontStores;
};

export async function fetchStorefrontPageData(): Promise<StorefrontPageData | null> {
  return nullWhenShrestaApiUnavailable(async () => {
    const apiBaseUrl = process.env.SHRESTA_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8090";
    const [home, categories] = await Promise.all([
      fetchStorefrontHome({ apiBaseUrl }),
      fetchCategoryFamilies({ apiBaseUrl })
    ]);
    return { home, categories };
  });
}

export async function fetchStorefrontStoresPageData(): Promise<StorefrontStoresPageData | null> {
  return nullWhenShrestaApiUnavailable(async () => {
    const apiBaseUrl = process.env.SHRESTA_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8090";
    const [home, stores] = await Promise.all([
      fetchStorefrontHome({ apiBaseUrl }),
      fetchStorefrontStores({ apiBaseUrl })
    ]);
    return { home, stores };
  });
}

export function familyKeyToSlug(familyKey: string): string {
  if (familyKey === "silk_saree") {
    return "silk-sarees";
  }
  return familyKey.replaceAll("_", "-");
}

export function slugToFamilyKey(slug: string): string {
  if (slug === "silk-sarees") {
    return "silk_saree";
  }
  return slug.replaceAll("-", "_");
}

export function findCollectionBySlug(home: StorefrontHome, slug: string): FeaturedCollection | undefined {
  return home.featuredCollections.find((collection) => collection.slug === slug);
}

export function findCategoryBySlug(categories: CategoryFamily[], slug: string): CategoryFamily | undefined {
  const familyKey = slugToFamilyKey(slug);
  return categories.find((category) => category.familyKey === familyKey);
}

export function findProductBySlug(home: StorefrontHome, slug: string): ProductCard | undefined {
  return home.bestsellers.find((product) => product.slug === slug);
}

export function productsForFamily(home: StorefrontHome, familyKey?: string): ProductCard[] {
  if (!familyKey) {
    return home.bestsellers;
  }

  return home.bestsellers.filter((product) => product.familyKey === familyKey);
}

export function productsForCollection(home: StorefrontHome, collection?: FeaturedCollection): ProductCard[] {
  if (!collection) {
    return home.bestsellers;
  }

  const productBadgeFilters = collection.productBadgeFilters ?? [];
  if (productBadgeFilters.length > 0) {
    return home.bestsellers.filter((product) => matchesAnyBadgeFilter(product, productBadgeFilters));
  }

  return productsForFamily(home, collection.familyKey);
}

function matchesAnyBadgeFilter(product: ProductCard, badgeFilters: string[]): boolean {
  const normalizedFilters = badgeFilters.map(badgeToken);
  return (product.badges ?? [])
    .map((badge) => badgeToken(badge))
    .some((badge) => normalizedFilters.includes(badge));
}

function badgeToken(badge: string): string {
  return badge.trim().toUpperCase().replaceAll("-", "_").replaceAll(" ", "_");
}

export function productsMatchingQuery(products: ProductCard[], query?: string): ProductCard[] {
  const normalizedQuery = query?.trim().toLowerCase();
  if (!normalizedQuery) {
    return products;
  }

  return products.filter((product) => {
    const searchable = [
      product.name,
      product.sku,
      product.familyKey,
      product.productType,
      ...product.badges
    ].join(" ").toLowerCase();
    return searchable.includes(normalizedQuery);
  });
}

export function relatedProducts(home: StorefrontHome, current: ProductCard, limit = 4): ProductCard[] {
  const sameFamily = home.bestsellers.filter((product) => product.familyKey === current.familyKey && product.slug !== current.slug);
  const remaining = home.bestsellers.filter((product) => product.familyKey !== current.familyKey && product.slug !== current.slug);
  return [...sameFamily, ...remaining].slice(0, limit);
}
