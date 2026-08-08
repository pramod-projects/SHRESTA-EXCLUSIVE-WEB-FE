import { requestApi, type FetchLike } from "@/lib/api-client";

export type StorefrontHome = {
  brand: Brand;
  navigation: NavigationItem[];
  heroSlides: HeroSlide[];
  trustBadges: TrustBadge[];
  featuredCollectionsSection: SectionCopy;
  featuredCollections: FeaturedCollection[];
  bestsellersSection: SectionCopy;
  bestsellers: ProductCard[];
  whyShrestaSection: SectionCopy;
  whyShresta: WhyShrestaFeature[];
  materialShowcase: MaterialShowcase;
  newsletter: Newsletter;
};

export type Brand = {
  itemKey: string;
  name: string;
  tagline: string;
  logo: MediaAsset | null;
  demoVideoUrl: string | null;
};

export type NavigationItem = {
  label: string;
  href: string;
};

export type MediaAsset = {
  assetKey: string;
  url: string;
  altText: string;
  width: number;
  height: number;
  deliveryMode: string;
  version: number;
  lqipDataUrl: string | null;
  variants: MediaVariant[];
};

export type MediaVariant = {
  variantKey: "original" | "thumbnail" | "small" | "medium" | "large" | string;
  format: "jpg" | "jpeg" | "png" | "webp" | "avif" | string;
  width: number;
  height: number;
  byteSize: number;
  url: string;
};

export type SectionCopy = {
  key: string;
  eyebrow: string | null;
  title: string;
  description: string | null;
};

export type HeroSlide = {
  id: string;
  familyKey: string;
  eyebrow: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  trustNote: string;
  image: MediaAsset | null;
};

export type TrustBadge = {
  iconKey: string;
  title: string;
  description: string;
};

export type FeaturedCollection = {
  id: string;
  familyKey: string;
  slug: string;
  title: string;
  description: string;
  itemCount: number;
  featured: boolean;
  productBadgeFilters: string[];
  qualityBadges: string[];
  image: MediaAsset | null;
};

export type ProductCard = {
  id: string;
  sku: string;
  name: string;
  slug: string;
  description: string | null;
  longDescription: string | null;
  familyKey: string;
  productType: string;
  pricePaise: number;
  compareAtPricePaise: number;
  rating: number;
  reviewCount: number;
  stockQuantity: number;
  badges: string[];
  image: MediaAsset | null;
  galleryImages: MediaAsset[];
  demoVideoUrl: string | null;
  isBestseller: boolean;
};

export type WhyShrestaFeature = {
  iconKey: string;
  title: string;
  description: string;
};

export type MaterialShowcase = {
  eyebrow: string;
  title: string;
  description: string;
  stories: MaterialStory[];
};

export type MaterialStory = {
  id: string;
  familyKey: string;
  title: string;
  description: string;
  highlights: string[];
  image: MediaAsset | null;
};

export type Newsletter = {
  eyebrow: string;
  title: string;
  description: string;
  ctaLabel: string;
};

export type FetchStorefrontHomeOptions = {
  apiBaseUrl?: string;
  fetchImpl?: FetchLike;
};

export function fetchStorefrontHome(options: FetchStorefrontHomeOptions = {}): Promise<StorefrontHome> {
  return requestApi<StorefrontHome>("/api/v1/storefront/home", {
    apiBaseUrl: options.apiBaseUrl,
    fetchImpl: options.fetchImpl,
    cache: "no-store"
  });
}
