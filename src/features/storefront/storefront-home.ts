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
  tags: string[];
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
  badgeIcons: Record<string, string>;
  colorFilter: string | null;
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

export async function fetchStorefrontHome(options: FetchStorefrontHomeOptions = {}): Promise<StorefrontHome> {
  const home = await requestApi<StorefrontHome>("/api/v1/storefront/home", {
    apiBaseUrl: options.apiBaseUrl,
    fetchImpl: options.fetchImpl,
    cache: "no-store"
  });
  return normalizeStorefrontHomeMediaUrls(home);
}

export function normalizeStorefrontHomeMediaUrls(home: StorefrontHome): StorefrontHome {
  return {
    ...home,
    brand: {
      ...home.brand,
      logo: normalizeMedia(home.brand.logo),
      demoVideoUrl: browserSafeMediaUrl(home.brand.demoVideoUrl)
    },
    heroSlides: home.heroSlides.map((slide) => ({ ...slide, image: normalizeMedia(slide.image) })),
    featuredCollections: home.featuredCollections.map((collection) => ({
      ...collection,
      image: normalizeMedia(collection.image)
    })),
    bestsellers: home.bestsellers.map((product) => ({
      ...product,
      image: normalizeMedia(product.image),
      galleryImages: product.galleryImages.map((image) => normalizeMedia(image)!),
      demoVideoUrl: browserSafeMediaUrl(product.demoVideoUrl)
    })),
    materialShowcase: {
      ...home.materialShowcase,
      stories: home.materialShowcase.stories.map((story) => ({ ...story, image: normalizeMedia(story.image) }))
    }
  };
}

export function browserSafeMediaUrl(value: string | null): string | null {
  if (!value || !usesLocalDevelopmentMedia()) {
    return value;
  }

  try {
    const url = new URL(value);
    if (["localhost", "127.0.0.1"].includes(url.hostname) && url.pathname.startsWith("/shresta-local-assets/")) {
      return `${url.pathname}${url.search}${url.hash}`;
    }
  } catch {
    return value;
  }
  return value;
}

function normalizeMedia(media: MediaAsset | null): MediaAsset | null {
  if (!media) {
    return null;
  }
  return { ...media, url: browserSafeMediaUrl(media.url) ?? media.url };
}

function usesLocalDevelopmentMedia(): boolean {
  const mediaBaseUrl = process.env.NEXT_PUBLIC_MEDIA_BASE_URL ?? "http://localhost:9010";
  try {
    return ["localhost", "127.0.0.1"].includes(new URL(mediaBaseUrl).hostname);
  } catch {
    return false;
  }
}
