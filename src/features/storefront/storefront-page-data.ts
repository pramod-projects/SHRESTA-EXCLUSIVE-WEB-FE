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

  const productTypeMatched = home.bestsellers.filter((product) => matchesCollectionProductType(product, collection.slug));
  if (productTypeMatched.length > 0) {
    return productTypeMatched;
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

function matchesCollectionProductType(product: ProductCard, collectionSlug: string): boolean {
  if (!product.productType || !collectionSlug) {
    return false;
  }
  return collectionTypeToken(product.productType) === collectionTypeToken(collectionSlug);
}

function collectionTypeToken(value: string): string {
  return value.trim().toLowerCase().replaceAll("_", "-").replace(/[^a-z0-9-]/g, "");
}

export function productsMatchingQuery(products: ProductCard[], query?: string): ProductCard[] {
  const queryTokens = tokenizeSearchTerms(query);
  if (queryTokens.length === 0) {
    return products;
  }

  return products
    .map((product, index) => ({
      index,
      product,
      score: scoreProductMatch(product, queryTokens)
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      return left.index - right.index;
    })
    .map((entry) => entry.product);
}

function scoreProductMatch(product: ProductCard, queryTokens: string[]): number {
  const searchable = [
    product.name,
    product.sku,
    product.slug,
    product.familyKey,
    product.productType,
    product.description,
    product.longDescription,
    ...product.badges
  ].filter(Boolean).join(" ");

  const searchableTokens = tokenizeSearchTerms(searchable);
  if (searchableTokens.length === 0) {
    return 0;
  }

  let totalScore = 0;
  for (const queryToken of queryTokens) {
    let bestTokenScore = 0;
    for (const searchableToken of searchableTokens) {
      bestTokenScore = Math.max(bestTokenScore, tokenMatchScore(queryToken, searchableToken));
      if (bestTokenScore === 1) {
        break;
      }
    }

    if (bestTokenScore === 0) {
      return 0;
    }
    totalScore += bestTokenScore;
  }

  let score = totalScore / queryTokens.length;
  const nameTokens = tokenizeSearchTerms(product.name);
  if (queryTokens.every((queryToken) => nameTokens.some((nameToken) => tokenMatchScore(queryToken, nameToken) >= 0.82))) {
    score += 0.08;
  }

  const normalizedSku = normalizeSearchValue(product.sku);
  if (queryTokens.some((queryToken) => normalizedSku.includes(queryToken))) {
    score += 0.06;
  }

  return score;
}

function tokenMatchScore(queryToken: string, searchableToken: string): number {
  if (searchableToken === queryToken) {
    return 1;
  }
  if (searchableToken.startsWith(queryToken)) {
    return 0.92;
  }
  if (searchableToken.includes(queryToken)) {
    return 0.82;
  }
  if (isFuzzyTokenMatch(queryToken, searchableToken)) {
    return 0.68;
  }
  return 0;
}

function isFuzzyTokenMatch(queryToken: string, searchableToken: string): boolean {
  if (queryToken.length < 4 || searchableToken.length < 4) {
    return false;
  }

  const lengthDelta = Math.abs(queryToken.length - searchableToken.length);
  const maxDistance = Math.max(1, Math.floor(Math.max(queryToken.length, searchableToken.length) / 6));
  if (lengthDelta > maxDistance) {
    return false;
  }

  return levenshteinDistance(queryToken, searchableToken) <= maxDistance;
}

function levenshteinDistance(source: string, target: string): number {
  if (source === target) {
    return 0;
  }
  if (source.length === 0) {
    return target.length;
  }
  if (target.length === 0) {
    return source.length;
  }

  const previousRow = new Array<number>(target.length + 1);
  for (let i = 0; i <= target.length; i += 1) {
    previousRow[i] = i;
  }

  for (let sourceIndex = 1; sourceIndex <= source.length; sourceIndex += 1) {
    let diagonalValue = previousRow[0] ?? 0;
    previousRow[0] = sourceIndex;

    for (let targetIndex = 1; targetIndex <= target.length; targetIndex += 1) {
      const previousAbove = previousRow[targetIndex] ?? 0;
      const substitutionCost = source[sourceIndex - 1] === target[targetIndex - 1] ? 0 : 1;
      const deleteCost = previousAbove + 1;
      const insertCost = (previousRow[targetIndex - 1] ?? 0) + 1;
      const replaceCost = diagonalValue + substitutionCost;
      previousRow[targetIndex] = Math.min(
        deleteCost,
        insertCost,
        replaceCost
      );
      diagonalValue = previousAbove;
    }
  }

  return previousRow[target.length] ?? Math.max(source.length, target.length);
}

function normalizeSearchValue(value?: string | null): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokenizeSearchTerms(value?: string | null): string[] {
  const normalized = normalizeSearchValue(value);
  if (!normalized) {
    return [];
  }

  return Array.from(new Set(normalized
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1)));
}

export function relatedProducts(home: StorefrontHome, current: ProductCard, limit = 4): ProductCard[] {
  const sameFamily = home.bestsellers.filter((product) => product.familyKey === current.familyKey && product.slug !== current.slug);
  const remaining = home.bestsellers.filter((product) => product.familyKey !== current.familyKey && product.slug !== current.slug);
  return [...sameFamily, ...remaining].slice(0, limit);
}
