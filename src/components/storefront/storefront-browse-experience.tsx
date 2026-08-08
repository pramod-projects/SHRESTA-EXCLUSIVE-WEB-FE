"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Building2,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Crown,
  Gem,
  ImageIcon,
  IndianRupee,
  MapPin,
  Minus,
  PackageCheck,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Shirt,
  SlidersHorizontal,
  Sparkles,
  Truck,
  X,
  type LucideIcon
} from "lucide-react";
import { ResponsiveMedia } from "@/components/storefront/responsive-media";
import { ProductImageBadgeRow } from "@/components/storefront/product-image-badge";
import { StorefrontLeafletMap } from "@/components/storefront/storefront-leaflet-map";
import { StorefrontPageChrome, type StorefrontChromeControls } from "@/components/storefront/storefront-home-experience";
import type { CategoryFamily } from "@/features/catalog/category-config";
import type { ProductCard, StorefrontHome } from "@/features/storefront/storefront-home";
import type { StoreLocation, StorefrontStores } from "@/features/storefront/storefront-stores";
import {
  familyKeyToSlug,
  findCategoryBySlug,
  findCollectionBySlug,
  productsForCollection,
  productsForFamily,
  productsMatchingQuery
} from "@/features/storefront/storefront-page-data";
import { selectedStoreKeyAfterSearch } from "@/features/storefront/store-selection";
import { enumDisplayLabel } from "@/lib/admin-enums";
import { asPriceInPaise, formatPaise } from "@/lib/currency";

type ListingMode = "all" | "category" | "collection";
type SortOption = "relevance" | "price_asc" | "price_desc" | "popularity" | "rating";
type ViewMode = "grid" | "list";
type PriceRangeSelection = {
  label: string;
  min: number;
  max: number;
  source: "bucket" | "manual";
};
type CatalogFilterChipItem = {
  key: string;
  label: string;
  onRemove: () => void;
};

const priceBuckets = [
  { label: "Under ₹8,000", min: 0, max: 800000 },
  { label: "₹8,000 - ₹10,000", min: 800000, max: 1000000 },
  { label: "₹10,000 - ₹12,000", min: 1000000, max: 1200000 },
  { label: "₹12,000 - ₹15,000", min: 1200000, max: 1500000 },
  { label: "₹15,000 & Above", min: 1500000, max: Number.MAX_SAFE_INTEGER }
];

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "relevance", label: "Most Relevant" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "popularity", label: "Most Popular" },
  { value: "rating", label: "Highest Rated" }
];

const PRODUCTS_PER_CATALOG_PAGE = 8;

export function StorefrontListingExperience({
  home,
  categories,
  mode,
  slug,
  query
}: {
  home: StorefrontHome;
  categories: CategoryFamily[];
  mode: ListingMode;
  slug?: string;
  query?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedPriceRange, setSelectedPriceRange] = useState<PriceRangeSelection | null>(null);
  const [manualPriceMin, setManualPriceMin] = useState("");
  const [manualPriceMax, setManualPriceMax] = useState("");
  const [selectedProductTypes, setSelectedProductTypes] = useState<Set<string>>(() => new Set());
  const [selectedBadges, setSelectedBadges] = useState<Set<string>>(() => new Set());
  const [selectedFamilyKeys, setSelectedFamilyKeys] = useState<Set<string>>(() => new Set());
  const [sortBy, setSortBy] = useState<SortOption>("relevance");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const category = slug ? findCategoryBySlug(categories, slug) : undefined;
  const collection = slug ? findCollectionBySlug(home, slug) : undefined;
  const familyKey = collection?.familyKey ?? category?.familyKey;
  const allBrowsableProducts = productsMatchingQuery(collection ? productsForCollection(home, collection) : productsForFamily(home, familyKey), query);
  // Apply multi-select category filter only in "all" mode (all products page)
  const browsableProducts = mode === "all" && selectedFamilyKeys.size > 0
    ? allBrowsableProducts.filter((p) => selectedFamilyKeys.has(p.familyKey ?? ""))
    : allBrowsableProducts;
  const productTypeCounts = countValues(browsableProducts.map((product) => product.productType));
  const badgeCounts = countValues(
    browsableProducts.flatMap((product) => product.badges).filter((badge) => !isCollectionBadgeToken(badge))
  );
  const categoryProductCounts = countValues(home.bestsellers.map((product) => product.familyKey));
  const availableProductTypes = sortedFilterValues(productTypeCounts);
  const availableBadges = sortedFilterValues(badgeCounts);
  const scopedProductTypes = selectedValuesInScope(selectedProductTypes, productTypeCounts);
  const scopedBadges = selectedValuesInScope(selectedBadges, badgeCounts);
  const products = sortProducts(
    browsableProducts.filter((product) => {
      if (!selectedPriceRange) {
        return matchesCatalogFilters(product, scopedProductTypes, scopedBadges);
      }
      return product.pricePaise >= selectedPriceRange.min
        && product.pricePaise <= selectedPriceRange.max
        && matchesCatalogFilters(product, scopedProductTypes, scopedBadges);
    }),
    sortBy
  );
  const requestedPage = catalogPageFromParam(searchParams.get("page"));
  const pageCount = Math.max(1, Math.ceil(products.length / PRODUCTS_PER_CATALOG_PAGE));
  const currentPage = Math.min(requestedPage, pageCount);
  const pageStartIndex = products.length > 0 ? (currentPage - 1) * PRODUCTS_PER_CATALOG_PAGE : 0;
  const paginatedProducts = products.slice(pageStartIndex, pageStartIndex + PRODUCTS_PER_CATALOG_PAGE);
  const visibleFrom = products.length > 0 ? pageStartIndex + 1 : 0;
  const visibleTo = products.length > 0 ? pageStartIndex + paginatedProducts.length : 0;
  const goToCatalogPage = (page: number) => {
    const nextPage = Math.min(Math.max(1, page), pageCount);
    const params = new URLSearchParams(searchParams.toString());

    if (nextPage <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(nextPage));
    }

    const href = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.push(href, { scroll: false });
    window.requestAnimationFrame(() => {
      document.getElementById("catalog-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };
  const resetCatalogPage = () => {
    if (currentPage > 1 || requestedPage > 1) {
      goToCatalogPage(1);
    }
  };
  const heading = listingHeading(mode, home, category, collection);
  const description = listingDescription(mode, home, category, collection, query);
  const hasProductFilters = Boolean(selectedPriceRange || scopedProductTypes.size > 0 || scopedBadges.size > 0 || selectedFamilyKeys.size > 0);
  const hasActiveFilters = Boolean(query || selectedPriceRange || familyKey || scopedProductTypes.size > 0 || scopedBadges.size > 0 || selectedFamilyKeys.size > 0);
  const clearPriceRange = () => {
    resetCatalogPage();
    setSelectedPriceRange(null);
    setManualPriceMin("");
    setManualPriceMax("");
  };
  const clearProductFilters = () => {
    resetCatalogPage();
    setSelectedPriceRange(null);
    setManualPriceMin("");
    setManualPriceMax("");
    setSelectedProductTypes(new Set());
    setSelectedBadges(new Set());
    setSelectedFamilyKeys(new Set());
  };
  const selectPriceBucket = (bucket: (typeof priceBuckets)[number]) => {
    if (selectedPriceRange?.source === "bucket" && selectedPriceRange.label === bucket.label) {
      clearPriceRange();
      return;
    }
    resetCatalogPage();
    setManualPriceMin(rupeeInputFromPaise(bucket.min));
    setManualPriceMax(rupeeInputFromPaise(bucket.max));
    setSelectedPriceRange({ ...bucket, source: "bucket" });
  };
  const setManualPriceRange = (minInput: string, maxInput: string) => {
    resetCatalogPage();
    setManualPriceMin(minInput);
    setManualPriceMax(maxInput);
    const minPaise = paiseFromRupeeInput(minInput);
    const maxPaise = paiseFromRupeeInput(maxInput);
    if (minPaise == null && maxPaise == null) {
      setSelectedPriceRange(null);
      return;
    }
    setSelectedPriceRange({
      label: manualPriceRangeLabel(minInput, maxInput),
      min: minPaise ?? 0,
      max: maxPaise ?? Number.MAX_SAFE_INTEGER,
      source: "manual"
    });
  };
  const toggleProductTypeFilter = (productType: string) => {
    resetCatalogPage();
    setSelectedProductTypes((current) => toggledSet(current, productType));
  };
  const toggleBadgeFilter = (badge: string) => {
    resetCatalogPage();
    setSelectedBadges((current) => toggledSet(current, badge));
  };
  const toggleFamilyKeyFilter = (key: string) => {
    resetCatalogPage();
    setSelectedFamilyKeys((current) => toggledSet(current, key));
  };
  const clearSelectedFamilyKeys = () => {
    resetCatalogPage();
    setSelectedFamilyKeys(new Set());
  };
  const activeProductFilterCount = (selectedPriceRange ? 1 : 0) + scopedProductTypes.size + scopedBadges.size + selectedFamilyKeys.size;
  const productFilterChips: CatalogFilterChipItem[] = [
    ...(selectedPriceRange ? [{
      key: `price-${selectedPriceRange.label}`,
      label: selectedPriceRange.label,
      onRemove: clearPriceRange
    }] : []),
    ...Array.from(scopedProductTypes).map((productType) => ({
      key: `type-${productType}`,
      label: enumDisplayLabel(productType),
      onRemove: () => toggleProductTypeFilter(productType)
    })),
    ...Array.from(scopedBadges).map((badge) => ({
      key: `badge-${badge}`,
      label: enumDisplayLabel(badge),
      onRemove: () => toggleBadgeFilter(badge)
    })),
    ...Array.from(selectedFamilyKeys).map((key) => ({
      key: `family-${key}`,
      label: categories.find((c) => c.familyKey === key)?.displayName ?? enumDisplayLabel(key),
      onRemove: () => toggleFamilyKeyFilter(key)
    }))
  ];
  const filterPanelProps = {
    activeFilterChips: productFilterChips,
    activeFilterCount: activeProductFilterCount,
    badgeCounts,
    badges: availableBadges,
    categoryProductCounts,
    categories,
    hasActiveFilters: hasProductFilters,
    manualPriceMax,
    manualPriceMin,
    multiSelectCategories: mode === "all",
    onClearAllFilters: clearProductFilters,
    onClearFamilyKeys: clearSelectedFamilyKeys,
    onClearPriceRange: clearPriceRange,
    onManualPriceChange: setManualPriceRange,
    onToggleBadge: toggleBadgeFilter,
    onToggleFamilyKey: toggleFamilyKeyFilter,
    onToggleProductType: toggleProductTypeFilter,
    productTypeCounts,
    productTypes: availableProductTypes,
    resultCount: products.length,
    selected: category,
    selectedBadges: scopedBadges,
    selectedFamilyKeys,
    selectedPriceRange,
    selectedProductTypes: scopedProductTypes,
    totalProductCount: allBrowsableProducts.length
  } satisfies CatalogFilterPanelProps;

  return (
    <StorefrontPageChrome home={home}>
      {(controls) => (
        <>
          <ListingHero
            description={description}
            eyebrow={mode === "all" ? "SHRESTA EXCLUSIVE CATALOG" : "Curated edit"}
            productCount={products.length}
            query={query}
            title={heading}
          />
          <section className="border-b border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] px-4 py-4 sm:px-6">
            <div className="mx-auto max-w-7xl">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <span className="shrink-0 text-sm font-semibold text-[var(--shresta-logo-muted)]">Filter by price:</span>
                <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:snap-x sm:overflow-x-auto sm:pb-1 sm:[scrollbar-width:none] sm:[&::-webkit-scrollbar]:hidden">
                  {priceBuckets.map((bucket) => (
                    <button
                      className={selectedPriceRange?.source === "bucket" && selectedPriceRange.label === bucket.label ? activeChipClass : inactiveChipClass}
                      key={bucket.label}
                      onClick={() => selectPriceBucket(bucket)}
                      type="button"
                    >
                      {bucket.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
          <section className="bg-[var(--shresta-logo-bg)] px-4 py-10 sm:px-6 lg:py-14">
            <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[336px_1fr] xl:grid-cols-[360px_1fr]">
              <CatalogSidebar {...filterPanelProps} />
              <CatalogMobileFilterDrawer
                {...filterPanelProps}
                isOpen={mobileFiltersOpen}
                onClose={() => setMobileFiltersOpen(false)}
              />
              <div className="min-w-0" id="catalog-results">
                <div className="mb-5 flex flex-col gap-4 border-b border-[var(--shresta-logo-border)] pb-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold-400)]">Curated SHRESTA results</p>
                    <h2 className="mt-1 font-serif text-3xl font-light text-[var(--shresta-logo-text)]">{products.length} products</h2>
                    {products.length > PRODUCTS_PER_CATALOG_PAGE ? (
                      <p className="mt-1 text-sm font-medium text-[var(--shresta-logo-muted)]">
                        Showing {visibleFrom}-{visibleTo} of {products.length}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-2 lg:hidden">
                      <button
                        aria-expanded={mobileFiltersOpen}
                        aria-label="Open filters"
                        className="relative inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] px-4 text-sm font-bold text-[var(--shresta-logo-text)] shadow-[0_10px_24px_rgba(47,33,21,0.12)] transition hover:border-[var(--gold-500)] hover:text-[var(--gold-600)] active:scale-[0.98]"
                        onClick={() => setMobileFiltersOpen(true)}
                        type="button"
                      >
                        <SlidersHorizontal className="h-4 w-4 text-[var(--gold-400)]" />
                        Filters
                        {activeProductFilterCount > 0 ? (
                          <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-[var(--shresta-logo-bg)] bg-[var(--gold-500)] px-1 text-[0.65rem] font-black text-[var(--wine-950)]">
                            {activeProductFilterCount}
                          </span>
                        ) : null}
                      </button>
                      {activeProductFilterCount > 0 ? (
                        <span className="text-xs font-medium text-[var(--shresta-logo-muted)]">{activeProductFilterCount} active</span>
                      ) : null}
                    </div>
                    <form action="/products" className="flex min-h-11 w-full max-w-md overflow-hidden rounded-full border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] sm:w-auto">
                      <input
                        aria-label="Search products"
                        className="min-w-0 flex-1 bg-transparent px-4 text-sm text-[var(--shresta-logo-text)] outline-none placeholder:text-[var(--shresta-logo-muted)]"
                        defaultValue={query}
                        name="query"
                        placeholder="Search sarees"
                        type="search"
                      />
                      <button className="bg-[var(--gold-500)] px-5 text-sm font-bold text-[var(--wine-950)]" type="submit">
                        Search
                      </button>
                    </form>
                    <div className="flex items-center gap-3">
                      <div className="hidden items-center rounded-lg border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] p-1 sm:flex">
                        <button
                          aria-label="Grid view"
                          className={viewMode === "grid" ? activeIconButtonClass : inactiveIconButtonClass}
                          onClick={() => setViewMode("grid")}
                          type="button"
                        >
                          <GridIcon />
                        </button>
                        <button
                          aria-label="List view"
                          className={viewMode === "list" ? activeIconButtonClass : inactiveIconButtonClass}
                          onClick={() => setViewMode("list")}
                          type="button"
                        >
                          <ListIcon />
                        </button>
                      </div>
                      <label className="flex items-center gap-2 text-sm text-[var(--shresta-logo-muted)]">
                        <SortIcon />
                        <select
                          className="h-10 rounded-lg border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] px-3 text-sm text-[var(--shresta-logo-text)] outline-none"
                          onChange={(event) => {
                            resetCatalogPage();
                            setSortBy(event.target.value as SortOption);
                          }}
                          value={sortBy}
                        >
                          {sortOptions.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </div>
                </div>

                {hasActiveFilters ? (
                  <div className="mb-6 flex flex-wrap items-center gap-2">
                    {familyKey ? <span className={activeFilterClass}>{category?.displayName ?? collection?.title ?? enumDisplayLabel(familyKey)}</span> : null}
                    {query ? <span className={activeFilterClass}>Search: {query}</span> : null}
                    {productFilterChips.map((filter) => (
                      <CatalogFilterChip key={filter.key} label={filter.label} onRemove={filter.onRemove} />
                    ))}
                    {hasProductFilters ? (
                      <button
                        className="text-sm text-[var(--shresta-logo-muted)] hover:text-[var(--gold-400)]"
                        onClick={clearProductFilters}
                        type="button"
                      >
                        Clear product filters
                      </button>
                    ) : null}
                  </div>
                ) : null}

                {products.length > 0 ? (
                  <div className={viewMode === "grid" ? "grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4 md:gap-6" : "space-y-4"}>
                    {paginatedProducts.map((product, index) => (
                      <StorefrontProductCard
                        controls={controls}
                        eager={index < 6}
                        key={product.id}
                        product={product}
                        variant={viewMode}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyCatalogState query={query} />
                )}

                {products.length > PRODUCTS_PER_CATALOG_PAGE ? (
                  <CatalogPager
                    currentPage={currentPage}
                    onPageChange={goToCatalogPage}
                    pageCount={pageCount}
                    pageSize={PRODUCTS_PER_CATALOG_PAGE}
                    resultCount={products.length}
                    visibleFrom={visibleFrom}
                    visibleTo={visibleTo}
                  />
                ) : null}
              </div>
            </div>
          </section>
        </>
      )}
    </StorefrontPageChrome>
  );
}

export function StorefrontProductDetailExperience({
  home,
  categories,
  product,
  related
}: {
  home: StorefrontHome;
  categories: CategoryFamily[];
  product: ProductCard;
  related: ProductCard[];
}) {
  const category = categories.find((candidate) => candidate.familyKey === product.familyKey);
  const collection = home.featuredCollections.find((candidate) => candidate.familyKey === product.familyKey);
  const price = formatPaise(asPriceInPaise(product.pricePaise));
  const compareAt = formatPaise(asPriceInPaise(product.compareAtPricePaise));
  const hasDiscount = product.compareAtPricePaise > product.pricePaise;
  const discountPercent = hasDiscount ? Math.round(((product.compareAtPricePaise - product.pricePaise) / product.compareAtPricePaise) * 100) : 0;
  const [quantityState, setQuantityState] = useState<{ productId: string; quantity: number }>({
    productId: product.id,
    quantity: product.stockQuantity > 0 ? 1 : 0
  });
  const [selectedImageState, setSelectedImageState] = useState<{ productId: string; image: ProductCard["image"] }>({
    productId: product.id,
    image: product.image
  });
  const assurance = productAssurance(product, category);
  const AssuranceIcon = assurance.icon;
  const allImages = [product.image, ...(product.galleryImages ?? [])].filter(Boolean);
  const quantity = quantityState.productId === product.id ? quantityState.quantity : (product.stockQuantity > 0 ? 1 : 0);
  const selectedImage = selectedImageState.productId === product.id ? selectedImageState.image : product.image;
  const hasDemoVideo = Boolean(product.demoVideoUrl);

  const handleDecreaseQuantity = () => {
    setQuantityState((current) => {
      const currentQuantity = current.productId === product.id ? current.quantity : (product.stockQuantity > 0 ? 1 : 0);
      return {
        productId: product.id,
        quantity: Math.max(1, currentQuantity - 1)
      };
    });
  };

  const handleIncreaseQuantity = () => {
    setQuantityState((current) => {
      const currentQuantity = current.productId === product.id ? current.quantity : (product.stockQuantity > 0 ? 1 : 0);
      return {
        productId: product.id,
        quantity: product.stockQuantity > 0 ? Math.min(product.stockQuantity, currentQuantity + 1) : currentQuantity + 1
      };
    });
  };

  const handleSelectImage = (image: ProductCard["image"]) => {
    setSelectedImageState({
      productId: product.id,
      image
    });
  };

  return (
    <StorefrontPageChrome home={home}>
      {(controls) => {
        const wishlisted = controls.wishlistKeys.has(product.id);
        return (
          <>
            <section className="bg-[var(--shresta-logo-bg)] px-4 py-8 sm:px-6 lg:py-12">
              <div className="mx-auto max-w-7xl">
                <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-2 text-sm text-[var(--shresta-logo-muted)]">
                  <Link className="hover:text-[var(--gold-400)]" href="/">Home</Link>
                  <span>/</span>
                  <Link className="hover:text-[var(--gold-400)]" href="/products">Products</Link>
                  {collection ? (
                    <>
                      <span>/</span>
                      <Link className="hover:text-[var(--gold-400)]" href={`/categories/${collection.slug}`}>{collection.title}</Link>
                    </>
                  ) : null}
                </nav>

                <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
	                  <div className="self-start">
	                    <div className="relative overflow-hidden rounded-lg border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)]">
	                      <ResponsiveMedia
                        eager
                        className="aspect-square w-full object-cover"
                        media={selectedImage}
                        sizes="(max-width: 1024px) 94vw, 52vw"
                      />
	                      <div className="absolute left-4 top-4 flex flex-wrap gap-2">
	                        {discountPercent > 0 ? (
	                          <span className="rounded-full bg-rose-500 px-3 py-1 text-xs font-bold uppercase tracking-[0.08em] text-[var(--shresta-logo-text)]">
	                            {discountPercent}% Off
	                          </span>
	                        ) : null}
	                        <ProductImageBadgeRow badges={product.badges} floating={false} limit={4} />
	                      </div>
	                      <div className="absolute right-4 top-4 flex gap-2">
	                        <button
	                          aria-label={wishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
                              className={wishlisted ? "flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(212,175,55,0.22)] text-[var(--gold-600)] shadow-md backdrop-blur" : "flex h-10 w-10 items-center justify-center rounded-full bg-[var(--shresta-logo-surface)] text-[var(--gold-400)] shadow-md backdrop-blur hover:bg-[var(--shresta-logo-surface)]"}
	                          onClick={() => controls.toggleWishlist(product.id)}
	                          type="button"
	                        >
	                          <HeartMark filled={wishlisted} />
	                        </button>
	                        <button
	                          aria-label="Share product"
	                          className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--shresta-logo-surface)] text-[var(--shresta-logo-muted)] shadow-md backdrop-blur hover:bg-[var(--shresta-logo-surface)] hover:text-[var(--gold-400)]"
	                          type="button"
	                        >
	                          <ShareIcon />
	                        </button>
	                      </div>
	                    </div>

                    {allImages.length > 1 ? (
                      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {allImages.map((img, index) => (
                          <button
                            aria-label={`View image ${index + 1}`}
                            className={`shrink-0 overflow-hidden rounded-lg border-2 transition ${selectedImage?.assetKey === img?.assetKey ? "border-[var(--gold-500)]" : "border-[var(--shresta-logo-border)] hover:border-[var(--gold-400)]"}`}
                            key={img?.assetKey ?? index}
                            onClick={() => handleSelectImage(img)}
                            type="button"
                          >
                            <ResponsiveMedia
                              className="h-16 w-16 object-cover sm:h-20 sm:w-20"
                              media={img}
                              sizes="80px"
                            />
                          </button>
                        ))}
                      </div>
                    ) : null}

                    {hasDemoVideo ? (
                      <a
                        className="mt-3 flex items-center gap-3 rounded-lg border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] px-4 py-3 text-sm font-semibold text-[var(--shresta-logo-text)] hover:border-[var(--gold-500)] hover:text-[var(--gold-600)]"
                        href={product.demoVideoUrl!}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--gold-500)] text-[var(--wine-950)]">
                          <PlayIcon />
                        </span>
                        Watch product demo
                      </a>
                    ) : null}
	                  </div>

                  <aside className="flex flex-col justify-center">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold-400)]">{product.sku}</p>
                    <h1 className="mt-3 font-serif text-4xl font-light leading-tight text-[var(--shresta-logo-text)] sm:text-5xl">{product.name}</h1>
                    <p className="mt-4 max-w-xl text-sm leading-6 text-[var(--shresta-logo-muted)]">
                      {productDetailDescription(product, category)}
                    </p>
                    <div className="mt-6 flex flex-wrap items-baseline gap-3">
                      <span className="text-3xl font-semibold text-[var(--shresta-logo-text)]">{price}</span>
                      {hasDiscount ? <span className="text-base text-[var(--shresta-logo-muted)] line-through">{compareAt}</span> : null}
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-sm text-[var(--shresta-logo-muted)]">
                      <span className="font-semibold text-amber-700">{product.rating.toFixed(1)}</span>
                      <span>{product.reviewCount} reviews</span>
                      <span className="text-[var(--wine-700)]">|</span>
                      <span>{enumDisplayLabel(product.productType)}</span>
                    </div>
                    {product.stockQuantity > 0 ? (
                      <div className="mt-3 flex items-center gap-1.5 text-sm">
                        {product.stockQuantity <= 10 ? (
                          <span className="font-semibold text-amber-400">{product.stockQuantity} in stock</span>
                        ) : (
                          <span className="text-emerald-700 font-medium">Available</span>
                        )}
                      </div>
                    ) : product.stockQuantity === 0 ? (
                      <div className="mt-3 text-sm font-semibold text-red-400">Out of Stock</div>
                    ) : null}
	                    <div className="mt-6 rounded-xl border border-[rgba(212,175,55,0.3)] bg-[rgba(212,175,55,0.1)] p-4">
	                      <div className="flex items-center gap-3">
	                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--gold-500)] text-[var(--wine-950)] shadow-[0_12px_28px_rgba(212,175,55,0.22)]">
	                          <AssuranceIcon className="h-6 w-6" strokeWidth={2.2} />
	                        </div>
	                        <div>
	                          <p className="font-semibold text-[var(--shresta-logo-text)]">{assurance.title}</p>
	                          <p className="text-sm text-[var(--shresta-logo-muted)]">{assurance.description}</p>
	                        </div>
	                      </div>
	                    </div>

	                    <div className="mt-7 grid gap-3 sm:grid-cols-[160px_1fr_1fr]">
	                      {product.stockQuantity !== 0 ? (
	                        <div className="flex min-h-12 items-center justify-between rounded-xl border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] px-2">
	                          <button
	                            aria-label="Decrease quantity"
	                            className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--shresta-logo-muted)] hover:bg-[var(--shresta-logo-surface)] disabled:opacity-40"
	                            disabled={quantity <= 1}
                              onClick={handleDecreaseQuantity}
	                            type="button"
	                          >
	                            <Minus className="h-4 w-4" />
	                          </button>
	                          <span className="w-10 text-center font-semibold text-[var(--shresta-logo-text)]">{quantity}</span>
	                          <button
	                            aria-label="Increase quantity"
	                            className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--shresta-logo-muted)] hover:bg-[var(--shresta-logo-surface)] disabled:opacity-40"
	                            disabled={product.stockQuantity > 0 && quantity >= product.stockQuantity}
                              onClick={handleIncreaseQuantity}
	                            type="button"
	                          >
	                            <Plus className="h-4 w-4" />
	                          </button>
	                        </div>
	                      ) : (
	                        <div className="flex min-h-12 items-center justify-center rounded-xl border border-red-900/40 bg-red-950/30 px-2">
	                          <span className="text-sm font-semibold text-red-400">Out of Stock</span>
	                        </div>
	                      )}
	                      <button
	                        className="min-h-12 rounded-full bg-[var(--gold-500)] px-6 text-sm font-bold text-[var(--wine-950)] shadow-[0_14px_34px_rgba(212,175,55,0.24)] hover:bg-[var(--gold-600)] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
	                        disabled={product.stockQuantity === 0}
                          onClick={() => controls.addToCart(product.id, quantity, product.stockQuantity)}
	                        type="button"
	                      >
	                        Add to Cart
                      </button>
                      <button
                        className={wishlisted ? "min-h-12 rounded-full border border-[var(--gold-500)] bg-[rgba(212,175,55,0.16)] px-6 text-sm font-bold text-[var(--gold-600)]" : "min-h-12 rounded-full border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] px-6 text-sm font-bold text-[var(--shresta-logo-text)] hover:border-[var(--gold-500)]"}
                        onClick={() => controls.toggleWishlist(product.id)}
                        type="button"
                      >
                        {wishlisted ? "Saved" : "Save to Wishlist"}
                      </button>
                    </div>

	                    <div className="mt-8 grid gap-3 sm:grid-cols-3">
	                      <DetailMetric icon={categoryMetricIcon(product.familyKey)} label="Family" value={category?.displayName ?? enumDisplayLabel(product.familyKey)} />
	                      <DetailMetric icon={Gem} label="Type" value={enumDisplayLabel(product.productType)} />
                      <DetailMetric icon={ImageIcon} label="Media" value={product.image ? `${product.image.variants.length} variants` : "Media pending"} />
	                    </div>

	                    <div className="mt-6 grid grid-cols-3 gap-3 rounded-xl border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] p-4">
	                      <TrustItem icon={Truck} label="Fast Delivery" />
	                      <TrustItem icon={RotateCcw} label="15-Day Returns" />
	                      <TrustItem icon={PackageCheck} label="Secure Packaging" />
	                    </div>

	                    <div className="mt-6 border-t border-[var(--shresta-logo-border)] pt-6">
	                      <h2 className="font-semibold text-[var(--shresta-logo-text)]">Description</h2>
	                      <p className="mt-2 text-sm leading-6 text-[var(--shresta-logo-muted)]">
	                        {productLongDescription(product, category)}
	                      </p>
	                    </div>

	                    <div className="mt-6 border-t border-[var(--shresta-logo-border)] pt-6">
	                      <h2 className="font-semibold text-[var(--shresta-logo-text)]">Specifications</h2>
	                      <dl className="mt-3 space-y-2 text-sm">
	                        <SpecRow label="SKU" value={product.sku} />
	                        <SpecRow label="Product Type" value={enumDisplayLabel(product.productType)} />
	                        <SpecRow label="Product Visuals" value={product.image ? "High-resolution gallery ready" : "Gallery being prepared"} />
	                        <SpecRow label="Occasion Fit" value={category?.displayName ?? enumDisplayLabel(product.familyKey)} />
	                      </dl>
	                    </div>
	                  </aside>
                </div>
              </div>
            </section>

            {category ? <CategoryRules category={category} /> : null}
            {related.length > 0 ? (
              <section className="bg-[var(--shresta-logo-surface)] px-4 py-12 sm:px-6">
                <div className="mx-auto max-w-7xl">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold-400)]">More from SHRESTA</p>
                  <h2 className="mt-2 font-serif text-3xl font-light text-[var(--shresta-logo-text)]">Related products</h2>
                  <div className="mt-6 grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
                    {related.map((item, index) => (
                      <StorefrontProductCard controls={controls} eager={index < 4} key={item.id} product={item} />
                    ))}
                  </div>
                </div>
              </section>
            ) : null}
          </>
        );
      }}
    </StorefrontPageChrome>
  );
}

export function StorefrontCollectionsExperience({
  home,
  categories,
  surface = "collections"
}: {
  home: StorefrontHome;
  categories: CategoryFamily[];
  surface?: "categories" | "collections";
}) {
  const isCategories = surface === "categories";
  return (
    <StorefrontPageChrome home={home}>
      <section className="border-b border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-[var(--shresta-logo-muted)]">
            <Link className="hover:text-[var(--gold-400)]" href="/">Home</Link>
            <span>/</span>
            <span className="text-[var(--shresta-logo-text)]">{isCategories ? "Categories" : "Collections"}</span>
          </nav>
          <h1 className="mt-4 font-serif text-4xl font-light text-[var(--shresta-logo-text)] sm:text-5xl">{isCategories ? "Shop by Category" : "Our Collections"}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--shresta-logo-muted)]">
            {isCategories
              ? "Browse SHRESTA saree edits for weddings, festivals, and daily wear from one place."
              : "Curated SHRESTA saree edits across weave stories and occasion-led collections."}
          </p>
        </div>
      </section>

      <section className="bg-[var(--shresta-logo-bg)] px-4 py-12 sm:px-6">
        <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-2">
          {home.featuredCollections.map((collection) => (
            <Link
              className="group relative overflow-hidden rounded-lg border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)]"
              href={`/collections/${collection.slug}`}
              key={collection.id}
            >
              <div className="relative aspect-[16/9]">
                <ResponsiveMedia
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  media={collection.image}
                  sizes="(max-width: 768px) 94vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--wine-950)] via-[rgba(26,9,12,0.48)] to-transparent" />
              </div>
              <div className="absolute inset-0 flex flex-col justify-end p-6">
                <h2 className="font-serif text-2xl font-light text-white transition group-hover:text-[var(--gold-300)]">{collection.title}</h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-white/80">{collection.description}</p>
                <p className="mt-3 text-sm font-semibold text-[var(--gold-400)]">{collection.itemCount} products</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-[var(--shresta-logo-surface)] px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold-400)]">Category families</p>
          <h2 className="mt-2 font-serif text-3xl font-light text-[var(--shresta-logo-text)]">SHRESTA product families</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {categories.map((category) => (
              <Link
                className="rounded-lg border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] p-5 hover:border-[var(--gold-500)]"
                href={`/categories/${familyKeyToSlug(category.familyKey)}`}
                key={category.familyKey}
              >
                <h3 className="font-serif text-2xl font-light text-[var(--shresta-logo-text)]">{category.displayName}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--shresta-logo-muted)]">{category.description}</p>
                <p className="mt-4 text-xs font-bold uppercase tracking-[0.12em] text-[var(--shresta-logo-muted)]">
                  {category.productTypes.length} subcategories - {category.filters.length} filters
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </StorefrontPageChrome>
  );
}

export function StorefrontStoresExperience({ home, stores }: { home: StorefrontHome; stores: StorefrontStores }) {
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("all");
  const [state, setState] = useState("all");
  const [selectedStoreKey, setSelectedStoreKey] = useState<string | null>(null);
  const filteredStores = useMemo(() => filterStoresByControls(stores.stores, query, city, state), [city, query, state, stores.stores]);
  const selectedStore = selectedStoreKey
    ? filteredStores.find((store) => store.storeKey === selectedStoreKey) ?? null
    : null;
  const highlights = Array.from(new Set(stores.stores.flatMap((store) => store.highlights))).slice(0, 4);
  const visitHighlights = highlights.length > 0
    ? highlights
    : ["Personal Consultation", "Virtual Try-On", "Custom Design", "Exclusive Collections"];
  const hasStoreFilters = Boolean(query || city !== "all" || state !== "all");
  const clearStoreFilters = () => {
    setQuery("");
    setCity("all");
    setState("all");
    setSelectedStoreKey(null);
  };
  const syncSelectedStore = (nextQuery: string, nextCity: string, nextState: string) => {
    const nextKeys = filterStoresByControls(stores.stores, nextQuery, nextCity, nextState)
      .map((store) => store.storeKey);
    setSelectedStoreKey((current) => selectedStoreKeyAfterSearch(nextQuery, nextKeys, current));
  };
  const updateQuery = (nextQuery: string) => {
    setQuery(nextQuery);
    syncSelectedStore(nextQuery, city, state);
  };
  const updateCity = (nextCity: string) => {
    setCity(nextCity);
    syncSelectedStore(query, nextCity, state);
  };
  const updateState = (nextState: string) => {
    setState(nextState);
    syncSelectedStore(query, city, nextState);
  };

  return (
    <StorefrontPageChrome home={home}>
      <section className="border-b border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-[var(--shresta-logo-muted)]">
            <Link className="hover:text-[var(--shresta-logo-text)]" href="/">Home</Link>
            <span>/</span>
            <span className="text-[var(--shresta-logo-text)]">Store Locator</span>
          </nav>
          <div className="mt-4 flex items-center gap-3">
            <MapPin className="h-8 w-8 text-[var(--gold-500)]" />
            <h1 className="text-3xl font-light text-[var(--shresta-logo-text)]">{stores.section.title}</h1>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--shresta-logo-muted)]">
            {stores.section.description}
          </p>
        </div>
      </section>

      <section className="bg-[var(--shresta-logo-bg)] px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 rounded-xl border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <label className="grid flex-1 gap-2 text-sm font-medium text-[var(--shresta-logo-muted)]">
                Search Stores
                <span className="relative block">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--shresta-logo-muted)]" />
                  <input
                    className="min-h-11 w-full rounded-lg border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] px-10 text-sm text-[var(--shresta-logo-text)] outline-none placeholder:text-[var(--shresta-logo-muted)] focus:border-[var(--gold-500)]"
                    onChange={(event) => updateQuery(event.target.value)}
                    placeholder="Search by store name, city, or address..."
                    value={query}
                  />
                  {query ? (
                    <button
                      aria-label="Clear store search"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--shresta-logo-muted)] hover:text-[var(--shresta-logo-text)]"
                      onClick={() => updateQuery("")}
                      type="button"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </span>
              </label>
              <label className="grid gap-2 text-sm font-medium text-[var(--shresta-logo-muted)] sm:w-48">
                <span><MapPin className="mr-1 inline h-4 w-4" />City</span>
                <select
                  className="min-h-11 rounded-lg border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] px-4 text-sm text-[var(--shresta-logo-text)] outline-none focus:border-[var(--gold-500)]"
                  onChange={(event) => updateCity(event.target.value)}
                  value={city}
                >
                  <option value="all">All cities</option>
                  {stores.cities.map((cityName) => (
                    <option key={cityName} value={cityName}>{cityName}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium text-[var(--shresta-logo-muted)] sm:w-48">
                <span><Building2 className="mr-1 inline h-4 w-4" />State</span>
                <select
                  className="min-h-11 rounded-lg border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] px-4 text-sm text-[var(--shresta-logo-text)] outline-none focus:border-[var(--gold-500)]"
                  onChange={(event) => updateState(event.target.value)}
                  value={state}
                >
                  <option value="all">All states</option>
                  {stores.states.map((stateName) => (
                    <option key={stateName} value={stateName}>{stateName}</option>
                  ))}
                </select>
              </label>
              {hasStoreFilters ? (
                <button
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium text-[var(--shresta-logo-muted)] transition hover:bg-[var(--shresta-logo-bg)] hover:text-[var(--shresta-logo-text)]"
                  onClick={clearStoreFilters}
                  type="button"
                >
                  <X className="h-4 w-4" />
                  Clear Filters
                </button>
              ) : null}
            </div>

            {city !== "all" || state !== "all" ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {city !== "all" ? (
                  <StoreFilterChip icon={MapPin} label={city} onRemove={() => updateCity("all")} />
                ) : null}
                {state !== "all" ? (
                  <StoreFilterChip icon={Building2} label={state} onRemove={() => updateState("all")} />
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="grid gap-6 lg:grid-cols-[400px_1fr] xl:grid-cols-[450px_1fr]">
            <div className="max-h-[calc(100vh-300px)] overflow-y-auto rounded-xl border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] p-4 lg:max-h-[700px]">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-[var(--shresta-logo-muted)]">
                  <MapPin className="mr-1 inline h-4 w-4" />
                  {filteredStores.length} store{filteredStores.length === 1 ? "" : "s"} found
                </p>
                <span className="text-xs text-[var(--shresta-logo-muted)]">{stores.stores.length} total</span>
              </div>
              <div className="space-y-4">
                {filteredStores.map((store) => (
                  <StoreNetworkCard
                    isSelected={selectedStoreKey === store.storeKey}
                    key={store.storeKey}
                    onSelect={() => setSelectedStoreKey(store.storeKey)}
                    store={store}
                  />
                ))}
                {filteredStores.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-bg)] px-5 py-16 text-center">
                    <MapPin className="mb-4 h-8 w-8 text-[var(--shresta-logo-muted)]" />
                    <h2 className="text-lg font-medium text-[var(--shresta-logo-text)]">No stores found</h2>
                    <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--shresta-logo-muted)]">Try adjusting your search or filters.</p>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="h-96 lg:h-[700px]">
              <StoreCoverageMap
                onSelect={(storeKey) => setSelectedStoreKey(storeKey)}
                selectedStore={selectedStore}
                stores={filteredStores}
              />
            </div>
          </div>

          <div className="mt-8 rounded-xl border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] p-6">
            <h2 className="text-xl font-medium text-[var(--shresta-logo-text)]">Why Visit Our Stores?</h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {visitHighlights.slice(0, 4).map((title, index) => (
                <div className="space-y-2" key={title}>
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[rgba(212,175,55,0.14)] text-lg font-bold text-[var(--gold-400)]">{index + 1}</span>
                  <h3 className="font-medium text-[var(--shresta-logo-text)]">{title}</h3>
                  <p className="text-sm leading-6 text-[var(--shresta-logo-muted)]">{stores.section.serviceNote}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-[var(--shresta-logo-muted)]">
              Can&apos;t visit a store?{" "}
              <Link className="text-[var(--gold-500)] hover:text-[var(--gold-400)]" href="/support">
                Contact us
              </Link>{" "}
              for a virtual appointment or visit our{" "}
              <Link className="text-[var(--gold-400)] hover:text-[var(--gold-600)]" href="/products">
                online store
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
    </StorefrontPageChrome>
  );
}

function StoreFilterChip({ icon: Icon, label, onRemove }: { icon: LucideIcon; label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(212,175,55,0.18)] px-3 py-1 text-sm text-[var(--gold-600)]">
      <Icon className="h-3 w-3" />
      {label}
      <button aria-label={`Remove ${label}`} className="ml-1 hover:text-[var(--shresta-logo-text)]" onClick={onRemove} type="button">
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

function filterStoresByControls(stores: StoreLocation[], query: string, city: string, state: string): StoreLocation[] {
  const normalizedQuery = query.trim().toLowerCase();
  return stores.filter((store) => {
    const searchable = [
      store.displayName,
      store.shortName,
      store.address.locality,
      store.address.city,
      store.address.state,
      store.address.postalCode,
      store.serviceModes.join(" "),
      store.highlights.join(" ")
    ].join(" ").toLowerCase();
    return (!normalizedQuery || searchable.includes(normalizedQuery))
      && (city === "all" || store.address.city === city)
      && (state === "all" || store.address.state === state);
  });
}

function StoreCoverageMap({
  onSelect,
  selectedStore,
  stores
}: {
  onSelect: (storeKey: string) => void;
  selectedStore: StoreLocation | null;
  stores: StoreLocation[];
}) {
  return (
    <div className="relative h-full overflow-hidden rounded-xl border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-bg)]">
      <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(111,86,58,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(111,86,58,0.08)_1px,transparent_1px)] [background-size:44px_44px]" />
      <div className="relative flex h-full flex-col p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold-400)]">India Service Map</p>
            <h2 className="mt-2 font-serif text-3xl font-light text-[var(--shresta-logo-text)] sm:text-4xl">Coverage Map</h2>
            <p className="mt-2 max-w-lg text-sm leading-6 text-[var(--shresta-logo-muted)]">
              Search or select a SHRESTA store to zoom into its nearby service area.
            </p>
          </div>
          {selectedStore ? (
            <span className="rounded-full border border-[rgba(212,175,55,0.38)] bg-[rgba(212,175,55,0.12)] px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold-600)]">
              Zoomed: {selectedStore.shortName}
            </span>
          ) : null}
        </div>

        <div className="relative mt-5 min-h-0 flex-1 overflow-hidden rounded-lg border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)]">
          <StorefrontLeafletMap
            onSelect={onSelect}
            selectedStore={selectedStore}
            stores={stores}
          />
          <div className="absolute bottom-4 left-4 right-4 rounded-lg border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-bg)] p-4 shadow-[0_18px_48px_rgba(47,33,21,0.12)] backdrop-blur">
            {selectedStore ? (
              <div>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-[var(--shresta-logo-text)]">{selectedStore.displayName}</p>
                    <p className="mt-1 text-sm text-[var(--shresta-logo-muted)]">{selectedStore.address.city}, {selectedStore.address.state}</p>
                  </div>
                  <span className="rounded-full border border-[rgba(212,175,55,0.38)] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--gold-600)]">
                    {titleCase(selectedStore.status)}
                  </span>
                </div>
                <p className="mt-3 text-xs text-[var(--shresta-logo-muted)]">{selectedStore.fulfillment.deliveryPromise} - pickup {selectedStore.fulfillment.pickupPromise}</p>
              </div>
            ) : (
              <p className="text-sm text-[var(--shresta-logo-muted)]">{stores.length} active SHRESTA service location{stores.length === 1 ? "" : "s"} available across India.</p>
            )}
          </div>
        </div>

        <div className="mt-4 grid gap-2 text-xs sm:grid-cols-3">
          <MapLegend dotClass="bg-[var(--gold-500)]" label="Flagship / same-day" />
          <MapLegend dotClass="bg-[var(--shresta-logo-bg)] border-2 border-[var(--gold-400)]" label="Selected store" />
          <MapLegend dotClass="bg-[var(--wine-600)] border-2 border-white" label="Regular store" />
        </div>
      </div>
    </div>
  );
}

function MapLegend({ dotClass, label }: { dotClass: string; label: string }) {
  return (
    <span className="flex items-center gap-2 rounded-lg bg-[var(--shresta-logo-surface)] px-3 py-2 text-[var(--shresta-logo-muted)]">
      <span className={`h-4 w-4 rounded-full ${dotClass}`} />
      {label}
    </span>
  );
}

function StoreNetworkCard({
  isSelected,
  onSelect,
  store
}: {
  isSelected: boolean;
  onSelect: () => void;
  store: StoreLocation;
}) {
  const openHours = store.openingHours
    .map((hours) => hours.closed ? `${hours.day}: Closed` : `${hours.day}: ${hours.opensAt}-${hours.closesAt}`)
    .join(" / ");

  return (
    <button
      className={isSelected ? "block w-full rounded-xl border border-[var(--gold-500)] bg-[rgba(212,175,55,0.12)] p-4 text-left shadow-[0_0_0_1px_rgba(212,175,55,0.12)]" : "block w-full rounded-xl border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] p-4 text-left transition hover:border-[var(--gold-500)]"}
      onClick={onSelect}
      type="button"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-[var(--shresta-logo-text)]">{store.displayName}</p>
          <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold-400)]">{titleCase(store.status)}</p>
        </div>
        {store.fulfillment.sameDayAvailable ? (
          <span className="shrink-0 whitespace-nowrap rounded-full bg-[rgba(212,175,55,0.16)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--gold-600)]">
            Same day
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-sm leading-6 text-[var(--shresta-logo-muted)]">
        {store.address.addressLine1}{store.address.addressLine2 ? `, ${store.address.addressLine2}` : ""}, {store.address.locality}, {store.address.city} {store.address.postalCode}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {store.serviceModes.map((mode) => (
          <span className="whitespace-nowrap rounded-full border border-[var(--shresta-logo-border)] px-2.5 py-1 text-[11px] font-semibold text-[var(--shresta-logo-muted)]" key={mode}>
            {titleCase(mode)}
          </span>
        ))}
      </div>
      <dl className="mt-4 grid gap-3 text-xs text-[var(--shresta-logo-muted)]">
        <div>
          <dt className="font-bold uppercase tracking-[0.12em] text-[var(--shresta-logo-muted)]">Hours</dt>
          <dd className="mt-1">{openHours}</dd>
        </div>
        <div>
          <dt className="font-bold uppercase tracking-[0.12em] text-[var(--shresta-logo-muted)]">Delivery</dt>
          <dd className="mt-1">{store.fulfillment.deliveryPromise} - pickup {store.fulfillment.pickupPromise}</dd>
        </div>
        <div>
          <dt className="font-bold uppercase tracking-[0.12em] text-[var(--shresta-logo-muted)]">Contact</dt>
          <dd className="mt-1">{store.contact.phone ?? store.contact.email ?? "SHRESTA support"}</dd>
        </div>
      </dl>
    </button>
  );
}

export function StorefrontUtilityPageExperience({
  home,
  title,
  eyebrow,
  description,
  primaryHref = "/products",
  primaryLabel = "Explore Products",
  panels
}: {
  home: StorefrontHome;
  title: string;
  eyebrow: string;
  description: string;
  primaryHref?: string;
  primaryLabel?: string;
  panels: { title: string; body: string }[];
}) {
  return (
    <StorefrontPageChrome home={home}>
      {(controls) => (
        <>
          <section className="bg-[var(--shresta-logo-bg)] px-4 py-12 sm:px-6 lg:py-16">
            <div className="mx-auto max-w-5xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold-400)]">{eyebrow}</p>
              <h1 className="mt-3 font-serif text-4xl font-light leading-tight text-[var(--shresta-logo-text)] sm:text-6xl">{title}</h1>
              <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-[var(--shresta-logo-muted)] sm:text-base">{description}</p>
              <Link className="mt-6 inline-flex min-h-12 items-center rounded-full bg-[var(--gold-500)] px-7 text-sm font-bold text-[var(--wine-950)] hover:bg-[var(--gold-600)]" href={primaryHref}>
                {primaryLabel}
              </Link>
            </div>
          </section>

          <section className="bg-[var(--shresta-logo-surface)] px-4 py-12 sm:px-6">
            <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-3">
              {panels.map((panel) => (
                <article className="rounded-lg border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] p-5" key={panel.title}>
                  <h2 className="font-serif text-2xl font-light text-[var(--shresta-logo-text)]">{panel.title}</h2>
                  <p className="mt-3 text-sm leading-6 text-[var(--shresta-logo-muted)]">{panel.body}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="bg-[var(--shresta-logo-bg)] px-4 py-12 sm:px-6">
            <div className="mx-auto max-w-7xl">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold-400)]">Recommended for you</p>
              <h2 className="mt-2 font-serif text-3xl font-light text-[var(--shresta-logo-text)]">Continue shopping</h2>
              <div className="mt-6 grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
                {home.bestsellers.slice(0, 4).map((product, index) => (
                  <StorefrontProductCard controls={controls} eager={index < 4} key={product.id} product={product} />
                ))}
              </div>
            </div>
          </section>
        </>
      )}
    </StorefrontPageChrome>
  );
}

function ListingHero({
  title,
  eyebrow,
  description,
  productCount,
  query
}: {
  title: string;
  eyebrow: string;
  description: string;
  productCount: number;
  query?: string;
}) {
  return (
    <section className="border-b border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold-500)]">{eyebrow}</p>
        <h1 className="mt-3 font-serif text-4xl font-light leading-tight text-[var(--shresta-logo-text)] sm:text-5xl">{title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--shresta-logo-muted)]">{description}</p>
        <p className="mt-3 text-sm text-[var(--shresta-logo-muted)]">
          {query ? `${productCount} results for "${query}"` : `${productCount} products`}
        </p>
      </div>
    </section>
  );
}

type CatalogFilterPanelProps = {
  activeFilterChips: CatalogFilterChipItem[];
  activeFilterCount: number;
  badgeCounts: Map<string, number>;
  badges: string[];
  categoryProductCounts: Map<string, number>;
  categories: CategoryFamily[];
  hasActiveFilters: boolean;
  multiSelectCategories: boolean;
  onClearAllFilters: () => void;
  onClearFamilyKeys: () => void;
  onClearPriceRange: () => void;
  onManualPriceChange: (minInput: string, maxInput: string) => void;
  onToggleBadge: (badge: string) => void;
  onToggleFamilyKey: (familyKey: string) => void;
  onToggleProductType: (productType: string) => void;
  manualPriceMax: string;
  manualPriceMin: string;
  productTypeCounts: Map<string, number>;
  productTypes: string[];
  resultCount: number;
  selected?: CategoryFamily;
  selectedBadges: ReadonlySet<string>;
  selectedFamilyKeys: ReadonlySet<string>;
  selectedPriceRange: PriceRangeSelection | null;
  selectedProductTypes: ReadonlySet<string>;
  totalProductCount: number;
};

function CatalogMobileFilterDrawer({
  isOpen,
  onClose,
  ...filterProps
}: CatalogFilterPanelProps & {
  isOpen: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div aria-label="Catalog filters" aria-modal="true" className="fixed inset-0 z-[90] lg:hidden" role="dialog">
      <button
        aria-label="Close filters"
        className="absolute inset-0 bg-black/65 backdrop-blur-sm"
        onClick={onClose}
        type="button"
      />
      <div className="absolute inset-y-0 right-0 flex w-full max-w-[420px] flex-col border-l border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-bg)] shadow-2xl">
        <CatalogSidebar {...filterProps} onClose={onClose} variant="drawer" />
      </div>
    </div>
  );
}

function CatalogSidebar({
  activeFilterChips,
  activeFilterCount,
  badgeCounts,
  badges,
  categoryProductCounts,
  categories,
  hasActiveFilters,
  multiSelectCategories,
  onClearAllFilters,
  onClearFamilyKeys,
  onClearPriceRange,
  onManualPriceChange,
  onToggleBadge,
  onToggleFamilyKey,
  onToggleProductType,
  manualPriceMax,
  manualPriceMin,
  productTypeCounts,
  productTypes,
  resultCount,
  selected,
  selectedBadges,
  selectedFamilyKeys,
  selectedPriceRange,
  selectedProductTypes,
  totalProductCount,
  onClose,
  variant = "desktop"
}: CatalogFilterPanelProps & {
  onClose?: () => void;
  variant?: "desktop" | "drawer";
}) {
  const isDrawer = variant === "drawer";

  return (
    <aside className={isDrawer
      ? "flex h-full min-h-0 flex-col overflow-hidden bg-[var(--shresta-logo-surface)] backdrop-blur"
      : "hidden flex-col overflow-hidden rounded-2xl border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] shadow-2xl shadow-black/30 backdrop-blur lg:sticky lg:top-24 lg:flex lg:max-h-[calc(100vh-8rem)]"
    }>
      <div className="shrink-0 flex items-center justify-between border-b border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[rgba(212,175,55,0.22)] bg-[rgba(212,175,55,0.14)]">
            <SlidersHorizontal className="h-4 w-4 text-[var(--gold-400)]" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[var(--shresta-logo-text)]">Filters</h2>
            <p className="text-xs text-[var(--shresta-logo-muted)]">
              {activeFilterCount > 0 ? `${activeFilterCount} active` : "Refine results"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters ? (
            <button
              aria-label="Clear all filters"
              className="group flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-[var(--shresta-logo-muted)] transition hover:bg-[var(--shresta-logo-surface)] hover:text-[var(--shresta-logo-text)]"
              onClick={onClearAllFilters}
              type="button"
            >
              <RotateCcw className="h-3.5 w-3.5 transition-transform group-hover:-rotate-180" />
              Clear
            </button>
          ) : null}
          {onClose ? (
            <button
              aria-label="Close filters"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--shresta-logo-border)] text-[var(--shresta-logo-muted)] transition hover:border-[var(--gold-500)] hover:text-[var(--gold-600)]"
              onClick={onClose}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      {activeFilterChips.length > 0 ? (
        <div className="shrink-0 border-b border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] px-5 py-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-[var(--shresta-logo-muted)]">Active Filters</span>
            <span className="text-xs font-medium text-[var(--gold-400)]">{activeFilterChips.length}</span>
          </div>
          <div className="flex max-h-28 flex-wrap gap-2 overflow-y-auto pr-1">
            {activeFilterChips.map((filter) => (
              <CatalogFilterChip key={filter.key} label={filter.label} onRemove={filter.onRemove} />
            ))}
          </div>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        <div className="space-y-1">
          <CheckboxFilterGroup
            activeCount={selectedProductTypes.size}
            counts={productTypeCounts}
            defaultOpen={false}
            icon={Gem}
            onToggle={onToggleProductType}
            selectedValues={selectedProductTypes}
            title="Collections"
            values={productTypes}
          />

          <CheckboxFilterGroup
            activeCount={selectedBadges.size}
            counts={badgeCounts}
            defaultOpen={false}
            icon={Sparkles}
            onToggle={onToggleBadge}
            selectedValues={selectedBadges}
            title="Tags"
            values={badges}
          />

          <ManualPriceRangeFilterGroup
            maxInput={manualPriceMax}
            minInput={manualPriceMin}
            onChange={onManualPriceChange}
            onClear={onClearPriceRange}
            selectedRange={selectedPriceRange}
          />

          {categories.length > 1 ? (
            <CategoryNavigationFilterGroup
              categories={categories}
              counts={categoryProductCounts}
              multiSelect={multiSelectCategories}
              onClearFamilyKeys={onClearFamilyKeys}
              onToggleFamilyKey={onToggleFamilyKey}
              selected={selected}
              selectedFamilyKeys={selectedFamilyKeys}
              totalProductCount={totalProductCount}
            />
          ) : null}
        </div>
      </div>

      <div className="shrink-0 border-t border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] px-5 py-3">
        <p className="text-center text-xs font-medium uppercase tracking-[0.14em] text-[var(--shresta-logo-muted)]">
          Showing <span className="text-[var(--gold-400)]">{resultCount}</span> SHRESTA products
        </p>
      </div>
    </aside>
  );
}

function CatalogPager({
  currentPage,
  onPageChange,
  pageCount,
  pageSize,
  resultCount,
  visibleFrom,
  visibleTo
}: {
  currentPage: number;
  onPageChange: (page: number) => void;
  pageCount: number;
  pageSize: number;
  resultCount: number;
  visibleFrom: number;
  visibleTo: number;
}) {
  const pageTokens = catalogPageTokens(currentPage, pageCount);

  return (
    <nav aria-label="Catalog pagination" className="mt-8 space-y-3">
      <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-3 rounded-full border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] p-2 shadow-[0_16px_48px_rgba(47,33,21,0.16)]">
        <CatalogPagerButton
          direction="previous"
          disabled={currentPage <= 1}
          helper={currentPage <= 1 ? "First page" : `Page ${currentPage - 1}`}
          label="Previous"
          onClick={() => onPageChange(currentPage - 1)}
        />
        <div className="flex min-h-16 min-w-28 items-center justify-center rounded-full border border-[var(--gold-500)] bg-[linear-gradient(135deg,var(--gold-300),var(--gold-600))] px-5 text-[var(--wine-950)] shadow-[0_12px_34px_rgba(212,175,55,0.24)]">
          <div className="text-center">
            <span className="block text-[0.6rem] font-bold uppercase tracking-[0.18em] opacity-75">{pageSize} per page</span>
            <span className="block font-serif text-2xl leading-6">{String(currentPage).padStart(2, "0")}</span>
            <span className="block text-[0.62rem] font-black uppercase tracking-[0.12em] opacity-75">of {String(pageCount).padStart(2, "0")}</span>
          </div>
        </div>
        <CatalogPagerButton
          direction="next"
          disabled={currentPage >= pageCount}
          helper={currentPage >= pageCount ? "Last page" : `Page ${currentPage + 1}`}
          label="Next"
          onClick={() => onPageChange(currentPage + 1)}
        />
      </div>
      <div className="mx-auto flex max-w-xl flex-col items-center gap-3">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.16em] text-[var(--shresta-logo-muted)]">
          Showing <span className="text-[var(--gold-400)]">{visibleFrom}-{visibleTo}</span> of <span className="text-[var(--gold-400)]">{resultCount}</span>
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {pageTokens.map((token, index) => typeof token === "number" ? (
            <button
              aria-current={token === currentPage ? "page" : undefined}
              aria-label={`Go to catalog page ${token}`}
              className={token === currentPage
                ? "flex h-9 min-w-9 items-center justify-center rounded-full border border-[var(--gold-500)] bg-[rgba(212,175,55,0.18)] px-3 text-sm font-black text-[var(--gold-600)]"
                : "flex h-9 min-w-9 items-center justify-center rounded-full border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] px-3 text-sm font-bold text-[var(--shresta-logo-muted)] transition hover:border-[var(--gold-500)] hover:text-[var(--gold-600)]"
              }
              key={token}
              onClick={() => onPageChange(token)}
              type="button"
            >
              {token}
            </button>
          ) : (
            <span className="px-1 text-sm font-bold text-[var(--shresta-logo-muted)]" key={`${token}-${index}`}>...</span>
          ))}
        </div>
      </div>
    </nav>
  );
}

function CatalogPagerButton({
  disabled,
  direction,
  helper,
  label,
  onClick
}: {
  disabled: boolean;
  direction: "previous" | "next";
  helper: string;
  label: string;
  onClick: () => void;
}) {
  const Icon = direction === "previous" ? ChevronLeft : ChevronRight;
  const className = disabled
    ? "flex min-h-14 flex-1 cursor-not-allowed items-center justify-center gap-2 rounded-full border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] px-3 text-left text-[var(--shresta-logo-muted)] opacity-60 transition sm:justify-start sm:px-4"
    : "flex min-h-14 flex-1 items-center justify-center gap-2 rounded-full border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] px-3 text-left text-[var(--shresta-logo-muted)] transition hover:border-[var(--gold-500)] hover:bg-[rgba(212,175,55,0.1)] hover:text-[var(--gold-600)] active:scale-[0.98] sm:justify-start sm:px-4";

  return (
    <button
      aria-label={`${label} catalog page`}
      className={className}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {direction === "previous" ? (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--gold-500)] bg-[rgba(212,175,55,0.12)] text-[var(--gold-600)]">
          <Icon className="h-4 w-4" />
        </span>
      ) : null}
      <span className={direction === "next" ? "hidden min-w-0 flex-1 text-right sm:block" : "hidden min-w-0 flex-1 sm:block"}>
        <span className="block text-sm font-semibold text-[var(--shresta-logo-muted)]">{label}</span>
        <span className="block text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[var(--shresta-logo-muted)]">{helper}</span>
      </span>
      {direction === "next" ? (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--gold-500)] bg-[rgba(212,175,55,0.12)] text-[var(--gold-600)]">
          <Icon className="h-4 w-4" />
        </span>
      ) : null}
    </button>
  );
}

function catalogPageFromParam(value: string | null): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function catalogPageTokens(currentPage: number, pageCount: number): Array<number | "ellipsis"> {
  if (pageCount <= 5) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  const pages = new Set([1, pageCount, currentPage, currentPage - 1, currentPage + 1]);
  const sortedPages = Array.from(pages)
    .filter((page) => page >= 1 && page <= pageCount)
    .sort((a, b) => a - b);
  const tokens: Array<number | "ellipsis"> = [];

  sortedPages.forEach((page, index) => {
    const previousPage = sortedPages[index - 1];
    if (previousPage && page - previousPage > 1) {
      tokens.push("ellipsis");
    }
    tokens.push(page);
  });

  return tokens;
}

function CheckboxFilterGroup({
  activeCount,
  counts,
  defaultOpen = false,
  icon,
  onToggle,
  selectedValues,
  title,
  values
}: {
  activeCount: number;
  counts: Map<string, number>;
  defaultOpen?: boolean;
  icon: LucideIcon;
  onToggle: (value: string) => void;
  selectedValues: ReadonlySet<string>;
  title: string;
  values: string[];
}) {
  return (
    <CollapsibleFilterSection activeCount={activeCount} defaultOpen={defaultOpen} icon={icon} title={title}>
      <div className="space-y-0.5">
        {values.length > 0 ? values.map((value) => (
          <ReferenceCheckboxRow
            checked={selectedValues.has(value)}
            count={counts.get(value) ?? 0}
            key={value}
            label={enumDisplayLabel(value)}
            onToggle={() => onToggle(value)}
          />
        )) : (
          <p className="rounded-lg px-2 py-2 text-sm text-[var(--shresta-logo-muted)]">No filters for this view</p>
        )}
      </div>
    </CollapsibleFilterSection>
  );
}

function ManualPriceRangeFilterGroup({
  maxInput,
  minInput,
  onChange,
  onClear,
  selectedRange
}: {
  maxInput: string;
  minInput: string;
  onChange: (minInput: string, maxInput: string) => void;
  onClear: () => void;
  selectedRange: PriceRangeSelection | null;
}) {
  const isInvalid = minInput.trim() !== ""
    && maxInput.trim() !== ""
    && Number(minInput) > Number(maxInput);
  const previewLabel = selectedRange?.label ?? "Enter a custom price range";

  return (
    <CollapsibleFilterSection
      activeCount={selectedRange ? 1 : 0}
      contentClassName="px-4"
      defaultOpen={false}
      icon={IndianRupee}
      title="Price Range"
    >
      <div className="space-y-3">
        <div className="grid gap-3">
          <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--shresta-logo-muted)]">
            Min price
            <span className="flex min-h-12 overflow-hidden rounded-lg border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] transition-colors focus-within:border-[var(--gold-500)]">
              <span className="flex min-w-12 items-center justify-center border-r border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-bg)] text-sm font-semibold text-[var(--gold-600)]">
                ₹
              </span>
              <input
                aria-label="Minimum price"
                className="min-w-0 flex-1 bg-transparent px-3 text-right font-mono text-base text-[var(--shresta-logo-text)] outline-none placeholder:text-right placeholder:text-[var(--shresta-logo-muted)]"
                inputMode="numeric"
                onChange={(event) => onChange(sanitizePriceInput(event.target.value), maxInput)}
                placeholder=""
                type="text"
                value={minInput}
              />
            </span>
          </label>
          <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--shresta-logo-muted)]">
            Max price
            <span className="flex min-h-12 overflow-hidden rounded-lg border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] transition-colors focus-within:border-[var(--gold-500)]">
              <span className="flex min-w-12 items-center justify-center border-r border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-bg)] text-sm font-semibold text-[var(--gold-600)]">
                ₹
              </span>
              <input
                aria-label="Maximum price"
                className="min-w-0 flex-1 bg-transparent px-3 text-right font-mono text-base text-[var(--shresta-logo-text)] outline-none placeholder:text-right placeholder:text-[var(--shresta-logo-muted)]"
                inputMode="numeric"
                onChange={(event) => onChange(minInput, sanitizePriceInput(event.target.value))}
                placeholder=""
                type="text"
                value={maxInput}
              />
            </span>
          </label>
        </div>
        <div className="rounded-lg border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-bg)] px-3 py-2">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[var(--shresta-logo-muted)]">Manual range</p>
          <p className="mt-1 text-sm font-semibold leading-5 text-[var(--shresta-logo-text)] [overflow-wrap:anywhere]">{previewLabel}</p>
        </div>
        {isInvalid ? (
          <p className="text-xs font-medium text-rose-300">Minimum price should be less than maximum price.</p>
        ) : null}
        {selectedRange ? (
          <button className="inline-flex min-h-9 items-center rounded-full border border-[var(--shresta-logo-border)] px-4 text-xs font-semibold text-[var(--shresta-logo-muted)] hover:border-[var(--gold-500)] hover:text-[var(--gold-600)]" onClick={onClear} type="button">
            Clear price
          </button>
        ) : null}
      </div>
    </CollapsibleFilterSection>
  );
}

function CategoryNavigationFilterGroup({
  categories,
  counts,
  multiSelect,
  onClearFamilyKeys,
  onToggleFamilyKey,
  selected,
  selectedFamilyKeys,
  totalProductCount
}: {
  categories: CategoryFamily[];
  counts: Map<string, number>;
  multiSelect: boolean;
  onClearFamilyKeys: () => void;
  onToggleFamilyKey: (familyKey: string) => void;
  selected?: CategoryFamily;
  selectedFamilyKeys: ReadonlySet<string>;
  totalProductCount: number;
}) {
  const activeCount = multiSelect ? selectedFamilyKeys.size : (selected ? 1 : 0);
  const allSelected = !multiSelect || selectedFamilyKeys.size === 0;

  return (
    <CollapsibleFilterSection activeCount={activeCount} defaultOpen={false} icon={Crown} title="Categories">
      <div className="space-y-0.5">
        {/* All Products row */}
        {multiSelect ? (
          <button
            className="group flex min-h-11 w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-[var(--shresta-logo-surface)]"
            onClick={onClearFamilyKeys}
            type="button"
          >
            <span className={allSelected ? selectedIconBoxClass : unselectedIconBoxClass}>
              <Crown className={allSelected ? "h-4 w-4 text-[var(--gold-400)]" : "h-4 w-4 text-[var(--shresta-logo-muted)]"} />
            </span>
            <span className={allSelected ? selectedBoxClass : unselectedBoxClass}>
              {allSelected ? <Check className="h-3.5 w-3.5 text-[var(--wine-950)]" strokeWidth={3} /> : null}
            </span>
            <span className={allSelected ? "min-w-0 flex-1 text-sm font-medium text-[var(--gold-400)]" : "min-w-0 flex-1 text-sm text-[var(--shresta-logo-muted)] group-hover:text-[var(--shresta-logo-text)]"}>
              All Products
            </span>
            <span className="rounded-full bg-[var(--shresta-logo-bg)] px-2 py-0.5 text-xs text-[var(--shresta-logo-muted)]">
              {totalProductCount}
            </span>
          </button>
        ) : (
          <Link
            className="group flex min-h-11 items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-[var(--shresta-logo-surface)]"
            href="/products"
          >
            <span className={unselectedIconBoxClass}>
              <Crown className="h-4 w-4 text-[var(--shresta-logo-muted)]" />
            </span>
            <span className={unselectedBoxClass} />
            <span className="min-w-0 flex-1 text-sm text-[var(--shresta-logo-muted)] group-hover:text-[var(--shresta-logo-text)]">
              All Products
            </span>
            <span className="rounded-full bg-[var(--shresta-logo-bg)] px-2 py-0.5 text-xs text-[var(--shresta-logo-muted)]">
              {totalProductCount}
            </span>
          </Link>
        )}

        {/* Per-category rows */}
        {categories.map((category) => {
          const CategoryIcon = categoryMetricIcon(category.familyKey);

          if (multiSelect) {
            const isSelected = selectedFamilyKeys.has(category.familyKey);
            return (
              <button
                className="group flex min-h-11 w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-[var(--shresta-logo-surface)]"
                key={category.familyKey}
                onClick={() => onToggleFamilyKey(category.familyKey)}
                type="button"
              >
                <span className={isSelected ? selectedIconBoxClass : unselectedIconBoxClass}>
                  <CategoryIcon className={isSelected ? "h-4 w-4 text-[var(--gold-400)]" : "h-4 w-4 text-[var(--shresta-logo-muted)]"} />
                </span>
                <span className={isSelected ? selectedBoxClass : unselectedBoxClass}>
                  {isSelected ? <Check className="h-3.5 w-3.5 text-[var(--wine-950)]" strokeWidth={3} /> : null}
                </span>
                <span className={isSelected ? "min-w-0 flex-1 text-sm font-medium text-[var(--gold-400)]" : "min-w-0 flex-1 text-sm text-[var(--shresta-logo-muted)] group-hover:text-[var(--shresta-logo-text)]"}>
                  {category.displayName}
                </span>
                <span className="rounded-full bg-[var(--shresta-logo-bg)] px-2 py-0.5 text-xs text-[var(--shresta-logo-muted)]">
                  {counts.get(category.familyKey) ?? 0}
                </span>
              </button>
            );
          }

          // Non-multi-select: navigate to category page
          const isSelected = category.familyKey === selected?.familyKey;
          return (
            <Link
              className="group flex min-h-11 items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-[var(--shresta-logo-surface)]"
              href={`/categories/${familyKeyToSlug(category.familyKey)}`}
              key={category.familyKey}
            >
              <span className={isSelected ? selectedIconBoxClass : unselectedIconBoxClass}>
                <CategoryIcon className={isSelected ? "h-4 w-4 text-[var(--gold-400)]" : "h-4 w-4 text-[var(--shresta-logo-muted)]"} />
              </span>
              <span className={isSelected ? selectedBoxClass : unselectedBoxClass}>
                {isSelected ? <Check className="h-3.5 w-3.5 text-[var(--wine-950)]" strokeWidth={3} /> : null}
              </span>
              <span className={isSelected ? "min-w-0 flex-1 text-sm font-medium text-[var(--gold-400)]" : "min-w-0 flex-1 text-sm text-[var(--shresta-logo-muted)] group-hover:text-[var(--shresta-logo-text)]"}>
                {category.displayName}
              </span>
              <span className="rounded-full bg-[var(--shresta-logo-bg)] px-2 py-0.5 text-xs text-[var(--shresta-logo-muted)]">
                {counts.get(category.familyKey) ?? 0}
              </span>
            </Link>
          );
        })}
      </div>
    </CollapsibleFilterSection>
  );
}

function CollapsibleFilterSection({
  activeCount,
  children,
  contentClassName,
  defaultOpen = false,
  icon: Icon,
  title
}: {
  activeCount: number;
  children: ReactNode;
  contentClassName?: string;
  defaultOpen?: boolean;
  icon: LucideIcon;
  title: string;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const hasSelection = activeCount > 0;

  return (
    <div className="rounded-xl border border-transparent transition-colors hover:bg-[var(--shresta-logo-surface)]">
      <button
        aria-expanded={isOpen}
        aria-label={`${isOpen ? "Collapse" : "Expand"} ${title} filter`}
        className="flex min-h-11 w-full items-center justify-between px-4 py-3 text-left transition active:scale-[0.98]"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span className="flex items-center gap-3">
          <span className={hasSelection ? selectedIconBoxClass : unselectedIconBoxClass}>
            <Icon className={hasSelection ? "h-4 w-4 text-[var(--gold-400)]" : "h-4 w-4 text-[var(--shresta-logo-muted)]"} />
          </span>
          <span className="flex items-center gap-2">
            <span className={hasSelection ? "text-sm font-medium text-[var(--gold-400)]" : "text-sm font-medium text-[var(--shresta-logo-text)]"}>
              {title}
            </span>
            {activeCount > 0 ? (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--gold-500)] px-1.5 text-xs font-semibold text-[var(--wine-950)]">
                {activeCount}
              </span>
            ) : null}
          </span>
        </span>
        <ChevronDown className={isOpen ? "h-4 w-4 rotate-180 text-[var(--shresta-logo-muted)] transition-transform" : "h-4 w-4 text-[var(--shresta-logo-muted)] transition-transform"} />
      </button>
      {isOpen ? (
        <div className={`overflow-hidden pb-3 ${contentClassName ?? "pl-[3.25rem] pr-4"}`}>
          {children}
        </div>
      ) : null}
    </div>
  );
}

function ReferenceCheckboxRow({
  checked,
  count,
  label,
  onToggle
}: {
  checked: boolean;
  count: number;
  label: string;
  onToggle: () => void;
}) {
  return (
    <label className="group flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-[var(--shresta-logo-surface)] active:bg-[var(--shresta-logo-surface)]">
      <input checked={checked} className="peer sr-only" onChange={onToggle} type="checkbox" />
      <span className={checked ? selectedBoxClass : unselectedBoxClass}>
        {checked ? <Check className="h-3.5 w-3.5 text-[var(--wine-950)]" strokeWidth={3} /> : null}
      </span>
      <span className={checked ? "min-w-0 flex-1 text-sm font-medium text-[var(--gold-400)]" : "min-w-0 flex-1 text-sm text-[var(--shresta-logo-muted)] group-hover:text-[var(--shresta-logo-text)]"}>
        {label}
      </span>
      <span className="rounded-full bg-[var(--shresta-logo-bg)] px-2 py-0.5 text-xs text-[var(--shresta-logo-muted)]">{count}</span>
    </label>
  );
}

function CatalogFilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(212,175,55,0.42)] bg-[linear-gradient(90deg,rgba(212,175,55,0.2),rgba(184,134,11,0.1))] px-3 py-1.5 text-sm text-[var(--gold-400)] shadow-sm">
      <span className="font-medium">{label}</span>
      <button
        aria-label={`Remove ${label} filter`}
        className="ml-0.5 rounded-full p-1 text-[rgba(212,175,55,0.72)] transition hover:bg-[rgba(212,175,55,0.3)] hover:text-[var(--gold-600)]"
        onClick={onRemove}
        type="button"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

function StorefrontProductCard({
  product,
  eager,
  controls,
  variant = "grid"
}: {
  product: ProductCard;
  eager: boolean;
  controls: StorefrontChromeControls;
  variant?: ViewMode;
}) {
  const price = formatPaise(asPriceInPaise(product.pricePaise));
  const compareAt = formatPaise(asPriceInPaise(product.compareAtPricePaise));
  const hasDiscount = product.compareAtPricePaise > product.pricePaise;
  const wishlisted = controls.wishlistKeys.has(product.id);

  if (variant === "list") {
    return (
      <article className="group rounded-lg border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] p-4 transition hover:border-[var(--shresta-logo-border)]">
        <div className="grid gap-4 sm:grid-cols-[160px_1fr_auto]">
          <Link className="relative aspect-square overflow-hidden rounded-lg bg-[var(--shresta-logo-surface)]" href={`/products/${product.slug}`}>
            <ResponsiveMedia
              className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
              eager={eager}
              media={product.image}
              sizes="160px"
            />
          </Link>
          <div className="min-w-0">
            <Link href={`/products/${product.slug}`}>
              <h3 className="font-serif text-xl font-light text-[var(--shresta-logo-text)] transition group-hover:text-[var(--gold-400)]">{product.name}</h3>
            </Link>
            <p className="mt-1 text-sm text-[var(--shresta-logo-muted)]">{product.sku} - {enumDisplayLabel(product.productType)}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {product.badges.slice(0, 3).map((badge) => (
                <span className="rounded-full bg-[rgba(212,175,55,0.12)] px-2.5 py-1 text-xs font-semibold text-[var(--gold-600)]" key={badge}>
                  {enumDisplayLabel(badge)}
                </span>
              ))}
            </div>
            <p className="mt-3 text-xs text-[var(--shresta-logo-muted)]">{product.rating.toFixed(1)} rating - {product.reviewCount} reviews</p>
          </div>
          <div className="flex flex-col justify-between gap-4 sm:min-w-40 sm:items-end">
            <div className="flex flex-wrap items-baseline gap-2 sm:justify-end">
              <span className="text-xl font-semibold text-[var(--shresta-logo-text)]">{price}</span>
              {hasDiscount ? <span className="text-sm text-[var(--shresta-logo-muted)] line-through">{compareAt}</span> : null}
            </div>
            <div className="grid w-full grid-cols-[1fr_44px] gap-2">
              <button
                className="min-h-11 rounded-full bg-[var(--gold-500)] px-4 text-sm font-bold text-[var(--wine-950)] hover:bg-[var(--gold-600)] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={product.stockQuantity === 0}
                onClick={() => controls.addToCart(product.id, 1, product.stockQuantity)}
                type="button"
              >
                {product.stockQuantity === 0 ? "Out of Stock" : "Add"}
              </button>
              <button
                aria-label={wishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
                className={wishlisted ? "flex h-11 items-center justify-center rounded-full border border-[var(--gold-500)] bg-[rgba(212,175,55,0.14)] text-[var(--gold-600)]" : "flex h-11 items-center justify-center rounded-full border border-[var(--shresta-logo-border)] text-[var(--shresta-logo-muted)] hover:border-[var(--gold-500)] hover:text-[var(--gold-400)]"}
                onClick={() => controls.toggleWishlist(product.id)}
                type="button"
              >
                <HeartMark filled={wishlisted} />
              </button>
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="group flex h-full flex-col">
      <Link className="block" href={`/products/${product.slug}`}>
        <div className="relative aspect-square overflow-hidden rounded-lg border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] shadow-[0_8px_18px_rgba(0,0,0,0.22)] transition group-hover:-translate-y-1 group-hover:border-[rgba(212,175,55,0.36)]">
          <ResponsiveMedia
            className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
            eager={eager}
            media={product.image}
            sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 25vw"
          />
          <ProductImageBadgeRow badges={product.badges} size="compact" />
        </div>
        <div className="mt-4">
          <h3 className="min-h-10 text-sm font-medium leading-5 text-[var(--shresta-logo-text)] group-hover:text-[var(--gold-400)]">{product.name}</h3>
          <div className="mt-2 flex flex-wrap items-baseline gap-2">
            <span className="text-xl font-semibold text-[var(--shresta-logo-text)]">{price}</span>
            {hasDiscount ? <span className="text-sm text-[var(--shresta-logo-muted)] line-through">{compareAt}</span> : null}
          </div>
          <p className="mt-2 text-xs text-[var(--shresta-logo-muted)]">{product.rating.toFixed(1)} rating - {product.reviewCount} reviews</p>
        </div>
      </Link>
      <div className="mt-4 grid grid-cols-[1fr_44px] gap-2">
        <button
          className="min-h-11 rounded-full bg-[var(--gold-500)] px-4 text-sm font-bold text-[var(--wine-950)] hover:bg-[var(--gold-600)] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={product.stockQuantity === 0}
          onClick={() => controls.addToCart(product.id, 1, product.stockQuantity)}
          type="button"
        >
          {product.stockQuantity === 0 ? "Out of Stock" : "Add"}
        </button>
        <button
          aria-label={wishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
          className={wishlisted ? "flex h-11 items-center justify-center rounded-full border border-[var(--gold-500)] bg-[rgba(212,175,55,0.14)] text-[var(--gold-600)]" : "flex h-11 items-center justify-center rounded-full border border-[var(--shresta-logo-border)] text-[var(--shresta-logo-muted)] hover:border-[var(--gold-500)] hover:text-[var(--gold-400)]"}
          onClick={() => controls.toggleWishlist(product.id)}
          type="button"
        >
          <HeartMark filled={wishlisted} />
        </button>
      </div>
    </article>
  );
}

function CategoryRules({ category }: { category: CategoryFamily }) {
  return (
    <section className="bg-[var(--shresta-logo-bg)] px-4 py-12 sm:px-6">
      <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold-400)]">Category rules</p>
          <h2 className="mt-2 font-serif text-3xl font-light text-[var(--shresta-logo-text)]">{category.displayName}</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--shresta-logo-muted)]">{category.description}</p>
        </div>
        <div className="rounded-lg border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] p-4">
          <h3 className="font-semibold text-[var(--shresta-logo-text)]">Attributes</h3>
          <div className="mt-3 grid gap-2">
            {category.attributes.slice(0, 8).map((attribute) => (
              <div className="rounded-lg bg-[rgba(212,175,55,0.1)] px-3 py-2 text-xs leading-5 text-[var(--shresta-logo-muted)]" key={attribute.attributeKey}>
                <span className="font-bold text-[var(--gold-600)]">{categoryAttributeLabel(attribute.attributeKey, attribute.displayName)}</span>
                <span className="block">{attributeSummary(attribute)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function productDetailDescription(product: ProductCard, category: CategoryFamily | undefined): string {
  const description = cleanProductCopy(product.description);
  if (description) {
    return description;
  }
  if (product.familyKey === "silk_saree") {
    return "A premium silk saree edit with rich zari work, blouse-ready styling, and a polished occasion-ready finish.";
  }
  return `Curated by SHRESTA EXCLUSIVE for ${category?.displayName ?? enumDisplayLabel(product.familyKey)} with a balanced mix of shine, comfort, and occasion-ready styling.`;
}

function productLongDescription(product: ProductCard, category: CategoryFamily | undefined): string {
  const longDescription = cleanProductCopy(product.longDescription);
  if (longDescription) {
    return longDescription;
  }
  const description = cleanProductCopy(product.description);
  if (description) {
    return description;
  }
  if (product.familyKey === "silk_saree") {
    return `${product.name} is a SHRESTA silk saree selection for festive, wedding, and premium occasion wear, chosen for rich drape, zari detail, and blouse-ready styling.`;
  }
  return `${product.name} belongs to the ${category?.displayName ?? enumDisplayLabel(product.familyKey)} collection and is selected for SHRESTA customers who want premium styling, reliable finishing, and saree-focused curation.`;
}

function productAssurance(product: ProductCard, category: CategoryFamily | undefined): { icon: LucideIcon; title: string; description: string } {
  if (product.familyKey === "silk_saree") {
    return {
      icon: Shirt,
      title: "Silk & Zari Checked",
      description: "Fabric family, blouse availability, and zari-work guidance are reviewed before the saree reaches the SHRESTA storefront."
    };
  }
  const hasAdBadge = product.badges.some((badge) => badgeTokenForUi(badge).includes("AD"));
  return {
    icon: hasAdBadge ? BadgeCheck : ShieldCheck,
    title: hasAdBadge ? "AD Quality Checked" : `${category?.displayName ?? "SHRESTA"} Checked`,
    description: "Finish, product family, care badge, and styling fit are reviewed for a confident SHRESTA purchase."
  };
}

function cleanProductCopy(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function categoryAttributeLabel(attributeKey: string, displayName: string): string {
  if (attributeKey === "zari_type") {
    return "Zari Work";
  }
  if (attributeKey === "blouse_included") {
    return "Blouse Piece";
  }
  return displayName;
}

function attributeSummary(attribute: CategoryFamily["attributes"][number]): string {
  if (attribute.attributeKey === "zari_type") {
    return "Gold/silver thread work such as pure zari, tested zari, or half-fine zari.";
  }
  if (attribute.attributeKey === "blouse_included") {
    return "Shows whether a matching blouse piece is included with the saree.";
  }
  if (attribute.allowedValues.length > 0) {
    return attribute.allowedValues.map(enumDisplayLabel).join(", ");
  }
  return attribute.required ? "Required product detail." : "Optional product detail.";
}

function badgeTokenForUi(badge: string): string {
  return badge.trim().toUpperCase().replaceAll("-", "_").replaceAll(" ", "_");
}

function categoryMetricIcon(familyKey: string): LucideIcon {
  const normalized = familyKey.toLowerCase();
  if (normalized.includes("silk") || normalized.includes("saree")) {
    return Shirt;
  }
  return Sparkles;
}

function DetailMetric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] p-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[rgba(212,175,55,0.12)] text-[var(--gold-600)]">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-xs uppercase tracking-[0.12em] text-[var(--shresta-logo-muted)]">{label}</span>
        <span className="mt-1 block truncate text-sm font-semibold text-[var(--shresta-logo-text)]">{value}</span>
      </span>
    </div>
  );
}

function TrustItem({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[rgba(212,175,55,0.14)] text-[var(--gold-400)]">
        <Icon className="h-4 w-4" strokeWidth={2.2} />
      </span>
      <span className="text-xs leading-4 text-[var(--shresta-logo-muted)]">{label}</span>
    </div>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-[rgba(92,51,36,0.5)] py-2">
      <dt className="text-[var(--shresta-logo-muted)]">{label}</dt>
      <dd className="text-right font-medium text-[var(--shresta-logo-text)]">{value}</dd>
    </div>
  );
}

function EmptyCatalogState({ query }: { query?: string }) {
  return (
    <div className="rounded-lg border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] p-8 text-center">
      <h2 className="font-serif text-3xl font-light text-[var(--shresta-logo-text)]">No products found</h2>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[var(--shresta-logo-muted)]">
        {query ? "No SHRESTA products matched that search." : "No SHRESTA products are attached to this category yet."}
      </p>
      <Link className="mt-6 inline-flex min-h-11 items-center rounded-full bg-[var(--gold-500)] px-6 text-sm font-bold text-[var(--wine-950)]" href="/products">
        View all products
      </Link>
    </div>
  );
}

function HeartMark({ filled }: { filled: boolean }) {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill={filled ? "currentColor" : "none"} viewBox="0 0 24 24">
      <path
        d="M12 20.2S4.8 16 3 10.8C1.8 7.2 3.9 4 7.4 4c1.9 0 3.5 1 4.6 2.5C13.1 5 14.7 4 16.6 4c3.5 0 5.6 3.2 4.4 6.8-1.8 5.2-9 9.4-9 9.4Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path d="M8.5 12.5 15.5 8M8.5 12.5l7 4.5M8.5 12.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0ZM20.5 6.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0ZM20.5 18a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M6 4.75a.75.75 0 0 1 1.14-.643l12 7.25a.75.75 0 0 1 0 1.286l-12 7.25A.75.75 0 0 1 6 19.25V4.75Z" />
    </svg>
  );
}

function listingHeading(mode: ListingMode, home: StorefrontHome, category?: CategoryFamily, collection?: ReturnType<typeof findCollectionBySlug>): string {
  if (mode === "category") {
    return category?.displayName ?? collection?.title ?? "Category";
  }
  if (mode === "collection") {
    return collection?.title ?? "Collection";
  }
  return "All Products";
}

function listingDescription(
  mode: ListingMode,
  home: StorefrontHome,
  category?: CategoryFamily,
  collection?: ReturnType<typeof findCollectionBySlug>,
  query?: string
): string {
  if (query) {
    return `Search results for "${query}" across SHRESTA EXCLUSIVE products.`;
  }
  if (mode === "category") {
    return category?.description ?? collection?.description ?? "Explore this SHRESTA category.";
  }
  if (mode === "collection") {
    return collection?.description ?? "Explore this SHRESTA collection.";
  }
  return home.bestsellersSection.description ?? "Explore SHRESTA EXCLUSIVE sarees curated for festive, wedding, and signature drape moments.";
}

function titleCase(value: string): string {
  return value.toLowerCase().split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function countValues(values: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  values.forEach((value) => {
    const normalized = value.trim();
    if (!normalized) {
      return;
    }
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  });
  return counts;
}

function isCollectionBadgeToken(value: string): boolean {
  return value.trim().toLowerCase().startsWith("collection ");
}

function sortedFilterValues(counts: Map<string, number>): string[] {
  return Array.from(counts.keys()).sort((left, right) => enumDisplayLabel(left).localeCompare(enumDisplayLabel(right)));
}

function selectedValuesInScope(selectedValues: ReadonlySet<string>, counts: Map<string, number>): Set<string> {
  return new Set(Array.from(selectedValues).filter((value) => counts.has(value)));
}

function toggledSet(current: ReadonlySet<string>, value: string): Set<string> {
  const next = new Set(current);
  if (next.has(value)) {
    next.delete(value);
  } else {
    next.add(value);
  }
  return next;
}

function matchesCatalogFilters(
  product: ProductCard,
  productTypes: ReadonlySet<string>,
  badges: ReadonlySet<string>
): boolean {
  return (productTypes.size === 0 || productTypes.has(product.productType))
    && (badges.size === 0 || product.badges.some((badge) => badges.has(badge)));
}

function paiseFromRupeeInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const rupees = Number(trimmed);
  if (!Number.isFinite(rupees) || rupees < 0) {
    return null;
  }
  return Math.round(rupees * 100);
}

function rupeeInputFromPaise(paise: number): string {
  if (paise >= Number.MAX_SAFE_INTEGER) {
    return "";
  }
  return Math.round(paise / 100).toString();
}

function manualPriceRangeLabel(minInput: string, maxInput: string): string {
  const min = formattedRupeeInput(minInput);
  const max = formattedRupeeInput(maxInput);
  if (min && max) {
    return `₹${min} - ₹${max}`;
  }
  if (min) {
    return `Above ₹${min}`;
  }
  if (max) {
    return `Under ₹${max}`;
  }
  return "Custom price";
}

function formattedRupeeInput(value: string): string {
  const rupees = Number(value.trim());
  if (!Number.isFinite(rupees) || rupees < 0) {
    return "";
  }
  return Math.round(rupees).toLocaleString("en-IN");
}

function sanitizePriceInput(value: string): string {
  return value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
}

function sortProducts(products: ProductCard[], sortBy: SortOption): ProductCard[] {
  const result = [...products];
  if (sortBy === "price_asc") {
    return result.sort((left, right) => left.pricePaise - right.pricePaise);
  }
  if (sortBy === "price_desc") {
    return result.sort((left, right) => right.pricePaise - left.pricePaise);
  }
  if (sortBy === "popularity") {
    return result.sort((left, right) => right.reviewCount - left.reviewCount);
  }
  if (sortBy === "rating") {
    return result.sort((left, right) => right.rating - left.rating);
  }
  return result;
}

function GridIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path d="M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path d="M8 6h12M8 12h12M8 18h12" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      <path d="M4 6h.01M4 12h.01M4 18h.01" stroke="currentColor" strokeLinecap="round" strokeWidth="3" />
    </svg>
  );
}

function SortIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path d="M7 4v16m0 0-3-3m3 3 3-3M17 20V4m0 0-3 3m3-3 3 3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

const activeChipClass = "inline-flex min-h-10 w-full shrink-0 snap-start items-center justify-center whitespace-nowrap rounded-full bg-[var(--gold-500)] px-3 py-2 text-[0.72rem] font-bold leading-none text-[var(--wine-950)] sm:min-h-11 sm:w-auto sm:px-4 sm:text-sm";
const inactiveChipClass = "inline-flex min-h-10 w-full shrink-0 snap-start items-center justify-center whitespace-nowrap rounded-full border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] px-3 py-2 text-[0.72rem] leading-none text-[var(--shresta-logo-muted)] hover:border-[var(--gold-500)] hover:text-[var(--gold-400)] sm:min-h-11 sm:w-auto sm:px-4 sm:text-sm";
const activeIconButtonClass = "flex h-8 w-8 items-center justify-center rounded-md bg-[var(--gold-500)] text-[var(--wine-950)]";
const inactiveIconButtonClass = "flex h-8 w-8 items-center justify-center rounded-md text-[var(--shresta-logo-muted)] hover:text-[var(--shresta-logo-text)]";
const activeFilterClass = "rounded-full border border-[rgba(212,175,55,0.3)] bg-[rgba(212,175,55,0.12)] px-3 py-1 text-xs font-semibold text-[var(--gold-600)]";
const selectedBoxClass = "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 border-[var(--gold-500)] bg-[var(--gold-500)] transition";
const unselectedBoxClass = "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] transition group-hover:border-[var(--gold-500)]";
const selectedIconBoxClass = "flex h-8 w-8 items-center justify-center rounded-lg border border-[rgba(212,175,55,0.32)] bg-[rgba(212,175,55,0.18)] transition";
const unselectedIconBoxClass = "flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] transition";
