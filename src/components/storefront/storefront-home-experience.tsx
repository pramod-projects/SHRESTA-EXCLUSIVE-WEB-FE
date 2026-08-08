"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Award,
  BadgeCheck,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Crown,
  Facebook,
  Gem,
  Heart,
  HeartHandshake,
  Home,
  Instagram,
  Mail,
  Menu,
  PackageCheck,
  RotateCcw,
  Search,
  Shield,
  ShieldCheck,
  Shirt,
  ShoppingBag,
  Sparkles,
  Star,
  Truck,
  Twitter,
  User,
  X
} from "lucide-react";
import { CustomerChatWidget } from "@/components/storefront/customer-chat-widget";
import { ProductImageBadgeRow } from "@/components/storefront/product-image-badge";
import { ResponsiveMedia, prefetchMedia } from "@/components/storefront/responsive-media";
import { BackendApiUnavailable } from "@/components/shared/backend-api-unavailable";
import type {
  FeaturedCollection,
  HeroSlide,
  ProductCard,
  StorefrontHome,
  TrustBadge,
  WhyShrestaFeature
} from "@/features/storefront/storefront-home";
import { useBrowserCart } from "@/features/cart/browser-cart";
import { useBrowserWishlist } from "@/features/wishlist/browser-wishlist";
import { asPriceInPaise, formatPaise } from "@/lib/currency";
import { INPUT_PATTERNS, INPUT_PATTERN_TITLES } from "@/lib/input-patterns";

type StorefrontHomeExperienceProps = {
  home: StorefrontHome;
};

export type StorefrontChromeControls = {
  cartCount: number;
  wishlistKeys: ReadonlySet<string>;
  addToCart: (productId: string, quantity?: number, maxQuantity?: number) => void;
  toggleWishlist: (productId: string) => void;
};

const SHOW_CUSTOMER_CHAT_WIDGET = false;

type StorefrontPageChromeProps = {
  home: StorefrontHome;
  children: ReactNode | ((controls: StorefrontChromeControls) => ReactNode);
};

const HERO_INTERVAL_MS = 6000;
const LOCAL_MEDIA_PROXY_PATH = "/api/media-proxy/";
const LOCAL_MEDIA_HOSTS = new Set(["localhost", "127.0.0.1"]);

type BrandLogoVariant = "header" | "mobile" | "footer";

const BRAND_LOGO_STYLES: Record<BrandLogoVariant, { wrapper: string; media: string; sizes: string }> = {
  header: {
    wrapper: "inline-flex h-[4.8rem] w-[186px] items-center overflow-hidden sm:h-[4.9rem] sm:w-[220px] md:h-[4.9rem] md:w-[250px] lg:h-[5.9rem] lg:w-[356px] xl:h-[6.1rem] xl:w-[388px]",
    media: "h-full w-auto origin-left scale-[1.16] select-none object-contain object-left lg:scale-[1.15]",
    sizes: "388px"
  },
  mobile: {
    wrapper: "inline-flex h-[4.8rem] w-full max-w-[224px] items-center overflow-hidden",
    media: "h-full w-auto origin-left scale-[1.16] object-contain object-left",
    sizes: "250px"
  },
  footer: {
    wrapper: "inline-flex h-[6.8rem] w-full max-w-[320px] overflow-hidden sm:h-[7.4rem] sm:max-w-[336px] lg:h-[8.2rem] lg:max-w-[348px]",
    media: "h-full w-full origin-left object-contain object-left",
    sizes: "468px"
  }
};

function BrandLogo({ eager = true, media, variant }: { eager?: boolean; media: StorefrontHome["brand"]["logo"]; variant: BrandLogoVariant }) {
  const style = BRAND_LOGO_STYLES[variant];
  return (
    <span className={style.wrapper}>
      <ResponsiveMedia eager={eager} className={style.media} media={media} sizes={style.sizes} />
    </span>
  );
}

export function StorefrontPageChrome({ home, children }: StorefrontPageChromeProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { itemCount: wishlistCount, productIdSet: wishlistKeys, toggleItem: toggleWishlist } = useBrowserWishlist();
  const { addItem, itemCount: cartCount } = useBrowserCart();

  const controls: StorefrontChromeControls = {
    cartCount,
    wishlistKeys,
    addToCart: (productId, quantity = 1, maxQuantity) => addItem(productId, quantity, maxQuantity),
    toggleWishlist
  };

  return (
    <main className="min-h-screen bg-[var(--shresta-logo-bg)] text-[var(--shresta-logo-text)]">
      {prefetchMedia(home.heroSlides[0]?.image)}
      {prefetchMedia(home.featuredCollections[0]?.image)}

      <CustomerHeader
        cartCount={cartCount}
        home={home}
        mobileOpen={mobileOpen}
        searchOpen={searchOpen}
        setMobileOpen={setMobileOpen}
        setSearchOpen={setSearchOpen}
        wishlistCount={wishlistCount}
      />
      <MobileSearchOverlay home={home} isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      {typeof children === "function" ? children(controls) : children}
      <CustomerFooter home={home} />
      <MobileBottomNav
        cartCount={cartCount}
        onOpenSearch={() => {
          setMobileOpen(false);
          setSearchOpen(true);
        }}
        searchOpen={searchOpen}
        wishlistCount={wishlistCount}
      />
      {SHOW_CUSTOMER_CHAT_WIDGET ? <CustomerChatWidget /> : null}
    </main>
  );
}

export function StorefrontHomeExperience({ home }: StorefrontHomeExperienceProps) {
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [showAllBestsellers, setShowAllBestsellers] = useState(false);
  const { itemCount: wishlistCount, productIdSet: wishlistKeys, toggleItem: toggleWishlist } = useBrowserWishlist();
  const { addItem, itemCount: cartCount } = useBrowserCart();

  const heroSlides = home.heroSlides;
  const activeHero = heroSlides[activeHeroIndex] ?? heroSlides[0];
  const collections = home.featuredCollections.slice(0, 6);
  const trustBadges = home.trustBadges.slice(0, 4);

  useEffect(() => {
    if (heroSlides.length <= 1) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setActiveHeroIndex((current) => (current + 1) % heroSlides.length);
    }, HERO_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [heroSlides.length]);

  return (
    <main className="min-h-screen bg-[var(--shresta-logo-bg)] text-[var(--shresta-logo-text)]">
      {prefetchMedia(heroSlides[1]?.image)}
      {prefetchMedia(collections[0]?.image)}

      <CustomerHeader
        cartCount={cartCount}
        home={home}
        mobileOpen={mobileOpen}
        searchOpen={searchOpen}
        setMobileOpen={setMobileOpen}
        setSearchOpen={setSearchOpen}
        wishlistCount={wishlistCount}
      />
      <MobileSearchOverlay home={home} isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      {activeHero ? (
        <HeroCarousel
          activeHero={activeHero}
          activeHeroIndex={activeHeroIndex}
          heroSlides={heroSlides}
          setActiveHeroIndex={setActiveHeroIndex}
        />
      ) : null}

      <TrustBadges badges={trustBadges} />

      {home.brand.demoVideoUrl ? (
        <BrandIntroVideo brandName={home.brand.name} videoUrl={home.brand.demoVideoUrl} />
      ) : null}

      <section className="bg-gradient-to-b from-[var(--shresta-logo-bg)] to-[var(--shresta-logo-surface)] py-14 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeader
            eyebrow={home.featuredCollectionsSection.eyebrow}
            title={home.featuredCollectionsSection.title}
            subtitle={home.featuredCollectionsSection.description}
          />
          <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-6">
            {collections.map((collection, index) => (
              <CollectionCard collection={collection} index={index} key={collection.id} />
            ))}
          </div>
        </div>
      </section>

      <WhyShrestaSection features={home.whyShresta} section={home.whyShrestaSection} />

      <section className="bg-[var(--shresta-logo-bg)] py-14 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeader
            eyebrow={home.bestsellersSection.eyebrow}
            title={home.bestsellersSection.title}
            subtitle={home.bestsellersSection.description}
          />
          {(() => {
            const featuredBestsellers = home.bestsellers.filter((p) => p.isBestseller !== false);
            const visibleBestsellers = showAllBestsellers ? featuredBestsellers : featuredBestsellers.slice(0, 8);
            return (
              <>
                <div className="mt-8 grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
                  {visibleBestsellers.map((product, index) => (
                    <ProductTile
                      eager={index < 4}
                      isWishlisted={wishlistKeys.has(product.id)}
                      key={product.id}
                      onAddToCart={() => addItem(product.id, 1, product.stockQuantity)}
                      onToggleWishlist={() => toggleWishlist(product.id)}
                      product={product}
                    />
                  ))}
                </div>
                {featuredBestsellers.length > 8 && (
                  <div className="mt-8 flex justify-center">
                    <button
                      className="group flex items-center gap-2.5 rounded-full border border-[rgba(212,175,55,0.35)] bg-transparent px-8 py-3 font-serif text-sm font-light tracking-[0.12em] text-[var(--gold-600)] transition-all duration-300 hover:border-[var(--gold-500)] hover:bg-[rgba(212,175,55,0.07)] hover:text-[var(--gold-500)]"
                      onClick={() => setShowAllBestsellers(!showAllBestsellers)}
                      type="button"
                    >
                      {showAllBestsellers
                        ? "Show Less"
                        : `View All ${featuredBestsellers.length} Bestsellers`}
                      <ChevronDown
                        className={`h-4 w-4 transition-transform duration-300 ${
                          showAllBestsellers ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </section>

      <MaterialShowcase home={home} />
      <NewsletterSection home={home} />
      <CustomerFooter home={home} />
      <MobileBottomNav
        cartCount={cartCount}
        onOpenSearch={() => {
          setMobileOpen(false);
          setSearchOpen(true);
        }}
        searchOpen={searchOpen}
        wishlistCount={wishlistCount}
      />
      {SHOW_CUSTOMER_CHAT_WIDGET ? <CustomerChatWidget /> : null}
    </main>
  );
}

export function StorefrontBackendUnavailable() {
  return <BackendApiUnavailable surface="Storefront" />;
}

type CustomerHeaderProps = {
  home: StorefrontHome;
  cartCount: number;
  wishlistCount: number;
  mobileOpen: boolean;
  searchOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
};

function CustomerHeader({
  home,
  cartCount,
  wishlistCount,
  mobileOpen,
  searchOpen,
  setMobileOpen,
  setSearchOpen
}: CustomerHeaderProps) {
  const productTypeCollections = Array.from(new Set(home.bestsellers.map((product) => product.productType).filter(Boolean)))
    .map((productType) => ({
      key: productType,
      label: productTypeLabel(productType),
      href: `/products?query=${encodeURIComponent(productType)}`
    }));
  const exploreLinks = [
    { href: "/products", label: "All Sarees" },
    { href: "/products?query=New%20Arrival", label: "Fresh Loom Drops" },
    { href: "/products?occasion=Daily%20Wear%20Edit", label: "Everyday Elegance" },
    { href: "/products?occasion=Wedding%20Edit", label: "Bridal Spotlight" },
    { href: "/products?occasion=Festival%20Edit", label: "Festival Glow" },
    { href: "/products?occasion=Party%20Edit", label: "Evening Edit" },
    { href: "/products?query=Collection", label: "Weave Stories" }
  ];
  const [activeMegaMenu, setActiveMegaMenu] = useState<string | null>(null);
  const prefersReducedMotion = useReducedMotion();

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-bg)] shadow-[0_10px_24px_rgba(47,33,21,0.12)]">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="relative flex h-20 items-center justify-between lg:h-[6.4rem] xl:h-[6.8rem]">
          <button
            aria-label="Open menu"
            className="reference-icon-button !h-9 !w-9 flex lg:hidden"
            onClick={() => setMobileOpen(true)}
            type="button"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link aria-label={`${home.brand.name} home`} className="flex min-w-0 items-center" href="/">
            <BrandLogo media={home.brand.logo} variant="header" />
          </Link>

          <nav className="hidden items-center gap-3 lg:absolute lg:left-1/2 lg:flex lg:-translate-x-1/2 xl:gap-4">
            {home.navigation.map((item) => (
              <div
                className="relative"
                key={item.href}
                onMouseEnter={() => item.label.toLowerCase() === "shop" ? setActiveMegaMenu(item.label) : undefined}
                onMouseLeave={() => setActiveMegaMenu(null)}
              >
                <Link
                  className="flex items-center gap-1.5 px-5 py-2.5 text-base font-medium text-[var(--shresta-logo-muted)] transition-colors duration-300 hover:text-[var(--shresta-logo-text)]"
                  href={item.href}
                >
                  {item.label}
                  {item.label.toLowerCase() === "shop" ? <ChevronDown className="h-[1.1rem] w-[1.1rem] transition-transform duration-300" /> : null}
                </Link>
                <AnimatePresence>
                {item.label.toLowerCase() === "shop" && activeMegaMenu === item.label ? (
                  <motion.div
                    animate="visible"
                    className="absolute left-0 top-full z-50 pt-2"
                    exit="exit"
                    initial="hidden"
                    variants={prefersReducedMotion ? undefined : {
                      hidden: { opacity: 0, y: -10 },
                      visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.4, 0.25, 1] } },
                      exit: { opacity: 0, y: -10, transition: { duration: 0.2 } }
                    }}
                  >
                    <div className="w-[760px] overflow-hidden rounded-2xl border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-bg)] shadow-2xl shadow-[rgba(47,33,21,0.12)] backdrop-blur">
                      {/* Top accent line */}
                      <div className="h-px w-full bg-gradient-to-r from-transparent via-gold-500/40 to-transparent" />

                      <div className="grid grid-cols-[1.1fr_0.9fr_1fr] divide-x divide-[var(--shresta-logo-border)] p-6">
                        {/* Column 1 — Explore */}
                        <div className="pr-6">
                          <p className="mb-4 flex items-center gap-2 text-[0.6rem] font-bold uppercase tracking-[0.2em] text-[var(--shresta-logo-muted)]">
                            <span className="h-1.5 w-1.5 rounded-full bg-gold-500" />
                            Explore
                          </p>
                          <ul className="space-y-0.5">
                            {exploreLinks.map((link) => (
                              <li key={link.href}>
                                <Link
                                  className="group flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-[var(--shresta-logo-muted)] transition-all duration-200 hover:bg-[var(--shresta-logo-surface)] hover:text-[var(--shresta-logo-text)]"
                                  href={link.href}
                                >
                                  <ChevronRight className="h-3 w-3 shrink-0 -translate-x-1 text-gold-500 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100" />
                                  {link.label}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Column 2 — Collections */}
                        <div className="px-6">
                          <p className="mb-4 flex items-center gap-2 text-[0.6rem] font-bold uppercase tracking-[0.2em] text-[var(--shresta-logo-muted)]">
                            <span className="h-1.5 w-1.5 rounded-full bg-gold-500" />
                            Collections
                          </p>
                          <ul className="max-h-[18rem] space-y-0.5 overflow-y-auto pr-1">
                            {productTypeCollections.map((collection) => (
                              <li key={collection.key}>
                                <Link
                                  className="group flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-[var(--shresta-logo-muted)] transition-all duration-200 hover:bg-[var(--shresta-logo-surface)] hover:text-[var(--shresta-logo-text)]"
                                  href={collection.href}
                                >
                                  <ChevronRight className="h-3 w-3 shrink-0 -translate-x-1 text-gold-500 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100" />
                                  {collection.label}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Column 3 — By Occasion */}
                        <div className="pl-6">
                          <p className="mb-4 flex items-center gap-2 text-[0.6rem] font-bold uppercase tracking-[0.2em] text-[var(--shresta-logo-muted)]">
                            <span className="h-1.5 w-1.5 rounded-full bg-gold-500" />
                            By Occasion
                          </p>
                          <div className="space-y-2">
                            {([
                              { label: "Wedding Sarees", query: "Wedding Edit", Icon: Crown },
                              { label: "Festival Sarees", query: "Festival Edit", Icon: Sparkles },
                              { label: "Party Sarees", query: "Party Edit", Icon: Star },
                              { label: "Daily Wear Sarees", query: "Daily Wear Edit", Icon: Shirt }
                            ] as const).map(({ label, query, Icon }) => (
                              <Link
                                className="group flex items-center gap-3 rounded-xl border border-[var(--shresta-logo-border)] px-3 py-2.5 text-sm text-[var(--shresta-logo-muted)] transition-all duration-200 hover:border-gold-500/30 hover:bg-[var(--shresta-logo-surface)] hover:text-[var(--shresta-logo-text)]"
                                href={`/products?occasion=${encodeURIComponent(query)}`}
                                key={label}
                              >
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--shresta-logo-surface)] transition-colors duration-200 group-hover:bg-[rgba(212,175,55,0.12)]">
                                  <Icon className="h-3.5 w-3.5 text-[var(--shresta-logo-muted)] transition-colors duration-200 group-hover:text-gold-400" />
                                </span>
                                {label}
                              </Link>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Bottom strip */}
                      <div className="flex items-center justify-between border-t border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] px-6 py-3">
                        <p className="text-[0.65rem] font-medium uppercase tracking-[0.14em] text-[var(--shresta-logo-muted)]">SHRESTA EXCLUSIVE — Sarees</p>
                        <Link
                          className="group flex items-center gap-1.5 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[var(--shresta-logo-text)] transition-colors hover:text-gold-600"
                          href="/products"
                        >
                          All Products
                          <ArrowRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5" />
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                ) : null}
                </AnimatePresence>
              </div>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-0 sm:gap-1 lg:ml-auto lg:justify-end">
            <AnimatePresence>
            {searchOpen ? (
              <motion.form
                action="/products"
                animate={{ width: 200, opacity: 1 }}
                className="hidden md:block"
                exit={{ width: 0, opacity: 0 }}
                initial={{ width: 0, opacity: 0 }}
                transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.3, ease: [0.25, 0.4, 0.25, 1] }}
              >
                <input
                  autoFocus
                  className="h-9 w-full rounded-full border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] px-4 text-sm text-[var(--shresta-logo-text)] outline-none placeholder:text-[var(--shresta-logo-muted)] focus:border-gold-500"
                  name="query"
                  placeholder="Search..."
                  type="search"
                />
              </motion.form>
            ) : null}
            </AnimatePresence>
            <button
              aria-label={searchOpen ? "Close search" : "Open search"}
              className="reference-icon-button hidden md:flex lg:scale-110"
              onClick={() => setSearchOpen(!searchOpen)}
              type="button"
            >
              <motion.span animate={{ rotate: searchOpen ? 90 : 0 }} transition={{ duration: 0.2 }}>
                {searchOpen ? <X className="h-5 w-5 lg:h-[1.35rem] lg:w-[1.35rem]" /> : <Search className="h-5 w-5 lg:h-[1.35rem] lg:w-[1.35rem]" />}
              </motion.span>
            </button>
            <Link
              aria-label="View wishlist"
              className="reference-icon-button !h-9 !w-9 relative inline-flex lg:scale-110"
              href="/wishlist"
            >
              <Heart className="h-5 w-5 lg:h-[1.35rem] lg:w-[1.35rem]" />
              {wishlistCount > 0 ? <CounterBadge count={wishlistCount} /> : null}
            </Link>
            <Link
              aria-label={`Cart with ${cartCount} items`}
              className="reference-icon-button !h-9 !w-9 relative inline-flex lg:scale-110"
              href="/cart"
            >
              <ShoppingBag className="h-5 w-5 lg:h-[1.35rem] lg:w-[1.35rem]" />
              {cartCount > 0 ? <CounterBadge count={cartCount} /> : null}
            </Link>
            <Link
              aria-label="Account, login, and profile"
              className="reference-icon-button !h-9 !w-9 relative inline-flex lg:scale-110"
              href="/account"
              title="Account"
            >
              <User className="h-5 w-5 lg:h-[1.35rem] lg:w-[1.35rem]" />
            </Link>
          </div>
        </div>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-black/60" aria-label="Close menu" onClick={() => setMobileOpen(false)} type="button" />
          <aside className="relative h-full w-80 max-w-[86vw] border-r border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-bg)] p-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--shresta-logo-border)] pb-4">
              <BrandLogo media={home.brand.logo} variant="mobile" />
              <button className="reference-icon-button inline-flex" onClick={() => setMobileOpen(false)} type="button">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="mt-6 space-y-2">
              {home.navigation.map((item) => (
                <Link
                  className="block rounded-lg px-3 py-3 text-lg font-medium text-[var(--shresta-logo-text)] transition-colors hover:bg-[var(--shresta-logo-surface)]"
                  href={item.href}
                  key={item.href}
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="mt-8 border-t border-[var(--shresta-logo-border)] pt-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--shresta-logo-muted)]">Categories</p>
              <div className="mt-3 max-h-[17rem] space-y-1 overflow-y-auto pr-1">
                {productTypeCollections.map((collection) => (
                  <Link
                    className="block rounded-lg px-3 py-2 text-[var(--shresta-logo-muted)] transition-colors hover:bg-[var(--shresta-logo-surface)] hover:text-[var(--shresta-logo-text)]"
                    href={collection.href}
                    key={collection.key}
                    onClick={() => setMobileOpen(false)}
                  >
                    {collection.label}
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </header>
  );
}

function productTypeLabel(productType: string): string {
  return productType
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function HeroCarousel({
  activeHero,
  activeHeroIndex,
  heroSlides,
  setActiveHeroIndex
}: {
  activeHero: HeroSlide;
  activeHeroIndex: number;
  heroSlides: HeroSlide[];
  setActiveHeroIndex: (index: number) => void;
}) {
  const prefersReducedMotion = useReducedMotion();
  const next = () => setActiveHeroIndex((activeHeroIndex + 1) % heroSlides.length);
  const previous = () => setActiveHeroIndex((activeHeroIndex - 1 + heroSlides.length) % heroSlides.length);

  return (
    <section
      aria-label="Featured Collections"
      className="relative w-full overflow-hidden bg-[var(--shresta-logo-bg)]"
      style={{ height: "calc(100vh - 125px)", minHeight: "500px", maxHeight: "900px" }}
    >
      <AnimatePresence initial={false} mode="wait">
        <motion.div
          animate={{ opacity: 1 }}
          className="absolute inset-0"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          key={activeHero.id}
          transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <motion.div
            animate={{ scale: 1, opacity: 1 }}
            className="absolute inset-0"
            initial={{ scale: 1.15, opacity: 0 }}
            transition={prefersReducedMotion ? { duration: 0 } : { scale: { duration: 1.6, ease: [0.25, 0.1, 0.25, 1] }, opacity: { duration: 0.7 } }}
          >
            <ResponsiveMedia
              eager
              className="h-full w-full object-cover"
              media={activeHero.image}
              sizes="100vw"
            />
          </motion.div>
          <div className="absolute inset-0 bg-gradient-to-r from-wine-950/95 via-wine-950/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-wine-950 via-transparent to-wine-950/20" />
        </motion.div>
      </AnimatePresence>

      <div className="relative z-10 mx-auto flex h-full max-w-7xl items-end px-4 pb-16 sm:px-6 md:items-center md:px-20 md:pb-0 lg:px-24">
        <motion.div
          animate={{ opacity: 1 }}
          className="max-w-2xl"
          initial={{ opacity: 0 }}
          key={`${activeHero.id}-copy`}
          transition={prefersReducedMotion ? { duration: 0 } : { staggerChildren: 0.15, delayChildren: 0.2 }}
        >
          <motion.p
            animate={{ y: 0, opacity: 1 }}
            className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-gold-300 md:text-base"
            initial={{ y: 40, opacity: 0 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
          >
            {activeHero.eyebrow}
          </motion.p>
          <motion.h1
            animate={{ y: 0, opacity: 1 }}
            className="font-serif text-5xl font-light leading-[1.04] text-white sm:text-6xl lg:text-7xl"
            initial={{ y: 40, opacity: 0 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.8, delay: 0.08, ease: [0.25, 0.1, 0.25, 1] }}
          >
            {activeHero.title}
          </motion.h1>
          <motion.p
            animate={{ y: 0, opacity: 1 }}
            className="mt-5 max-w-xl text-base leading-7 text-white/80 sm:text-lg"
            initial={{ y: 40, opacity: 0 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.8, delay: 0.16, ease: [0.25, 0.1, 0.25, 1] }}
          >
            {activeHero.description}
          </motion.p>
          <motion.div
            animate={{ y: 0, opacity: 1 }}
            className="mt-8 flex flex-wrap items-center gap-4"
            initial={{ y: 40, opacity: 0 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.8, delay: 0.24, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <Link
              className="reference-primary-button group"
              href={activeHero.ctaHref}
            >
              {activeHero.ctaLabel}
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </Link>
            <span className="text-sm font-medium text-white/75">+ {activeHero.trustNote}</span>
          </motion.div>
        </motion.div>
      </div>

      {heroSlides.length > 1 ? (
        <>
          <div className="pointer-events-none absolute left-4 right-4 top-1/2 z-20 flex -translate-y-1/2 items-center justify-between md:left-8 md:right-8">
            <HeroCarouselArrowButton direction="previous" onClick={previous} />
            <HeroCarouselArrowButton direction="next" onClick={next} />
          </div>
          <div className="absolute bottom-7 left-0 right-0 z-20">
            <div className="flex items-center justify-center gap-3">
              {heroSlides.map((slide, index) => (
                <button
                  aria-current={index === activeHeroIndex ? "true" : undefined}
                  aria-label={`Go to slide ${index + 1}: ${slide.title}`}
                  className={index === activeHeroIndex ? "h-2 w-9 rounded-full bg-gold-400 transition-all" : "h-2 w-2 rounded-full bg-[rgba(253,246,235,0.5)] transition-all hover:bg-[rgba(253,246,235,0.74)]"}
                  key={slide.id}
                  onClick={() => setActiveHeroIndex(index)}
                  type="button"
                />
              ))}
            </div>
          </div>
          <div className="absolute bottom-7 right-8 z-20 hidden items-center gap-2 text-sm font-medium text-white/70 md:flex">
            <span className="font-serif text-lg text-gold-300">{String(activeHeroIndex + 1).padStart(2, "0")}</span>
            <span className="text-white/40">/</span>
            <span>{String(heroSlides.length).padStart(2, "0")}</span>
          </div>
        </>
      ) : null}
    </section>
  );
}

function HeroCarouselArrowButton({
  direction,
  onClick
}: {
  direction: "previous" | "next";
  onClick: () => void;
}) {
  const Icon = direction === "previous" ? ChevronLeft : ChevronRight;
  const label = direction === "previous" ? "Previous slide" : "Next slide";

  return (
    <motion.button
      aria-label={label}
      className="pointer-events-auto group relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-gold-500/60 bg-[rgba(253,246,235,0.95)] text-[var(--wine-800)] shadow-[0_18px_45px_rgba(0,0,0,0.34)] backdrop-blur-xl transition-colors duration-300 hover:border-gold-500 hover:bg-gold-500 hover:text-wine-950 md:h-16 md:w-16"
      onClick={onClick}
      type="button"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.96 }}
    >
      <span className="absolute inset-1 rounded-full border border-[rgba(253,246,235,0.18)] transition-colors group-hover:border-wine-950/20" />
      <span className="absolute left-3 right-3 top-2 h-px bg-gradient-to-r from-transparent via-gold-200/70 to-transparent opacity-80 transition group-hover:via-wine-950/50" />
      <Icon className="relative z-10 h-6 w-6 transition-transform duration-300 group-hover:scale-110" />
    </motion.button>
  );
}

function TrustBadges({ badges }: { badges: TrustBadge[] }) {
  return (
    <section className="relative overflow-hidden border-y border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(212,175,55,0.04)_0%,_transparent_70%)]" />
      <div className="relative mx-auto grid max-w-7xl grid-cols-2 md:grid-cols-4">
        {badges.map((badge, index) => (
          <motion.article
            className="group relative flex min-h-24 flex-col items-center justify-center p-5 text-center transition hover:bg-[var(--shresta-logo-surface)]/60 sm:p-6 md:min-h-28"
            initial={{ opacity: 0, y: 20 }}
            key={badge.title}
            transition={{ duration: 0.5, delay: index * 0.08, ease: [0.25, 0.4, 0.25, 1] }}
            viewport={{ once: true, margin: "-50px" }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gold-500/10 text-gold-400 ring-2 ring-gold-500/20 transition-all duration-300 group-hover:scale-110 group-hover:bg-gold-500/20">
              <ReferenceIcon className="h-6 w-6" iconKey={badge.iconKey} />
            </div>
            <div className="mx-auto flex max-w-[10rem] flex-col items-center">
              <h2 className="text-wrap text-sm font-semibold tracking-wide text-[var(--shresta-logo-text)] transition group-hover:text-gold-400 md:text-base">
                {badge.title}
              </h2>
              <p className="mt-1 max-w-full text-wrap text-xs leading-5 text-[var(--shresta-logo-muted)] md:text-sm">{badge.description}</p>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}

function BrandIntroVideo({ brandName, videoUrl }: { brandName: string; videoUrl: string }) {
  const AUTO_PLAY_VISIBILITY = 0.7;
  const AUTO_PAUSE_VISIBILITY = 0.15;
  const VISIBILITY_DEBOUNCE_MS = 180;

  const sectionRef = useRef<HTMLElement | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const autoplayAttemptedRef = useRef<string | null>(null);
  const autoPausedByVisibilityRef = useRef(false);
  const isAutoPauseInProgressRef = useRef(false);
  const userPausedRef = useRef(false);
  const visibilityActionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const normalizedVideoUrl = normalizeVideoUrl(videoUrl);

  useEffect(() => {
    const video = videoRef.current;
    const section = sectionRef.current;
    if (!video || !section) {
      return;
    }

    let cancelled = false;

    autoplayAttemptedRef.current = null;
    autoPausedByVisibilityRef.current = false;
    userPausedRef.current = false;

    const handlePause = () => {
      if (isAutoPauseInProgressRef.current) {
        isAutoPauseInProgressRef.current = false;
        return;
      }

      userPausedRef.current = true;
    };

    const handlePlay = () => {
      userPausedRef.current = false;
      autoPausedByVisibilityRef.current = false;
    };

    video.addEventListener("pause", handlePause);
    video.addEventListener("play", handlePlay);

    const attemptAutoplay = async () => {
      autoplayAttemptedRef.current = normalizedVideoUrl;
      video.muted = false;
      try {
        await video.play();
        return;
      } catch {
        if (cancelled) {
          return;
        }
      }

      video.muted = true;
      try {
        await video.play();
      } catch {
        // Ignore blocked autoplay; user can still start playback manually.
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) {
          return;
        }

        const isHighlyVisible = entry.isIntersecting && entry.intersectionRatio >= AUTO_PLAY_VISIBILITY;
        const isBarelyVisible = !entry.isIntersecting || entry.intersectionRatio < AUTO_PAUSE_VISIBILITY;

        if (visibilityActionTimeoutRef.current) {
          clearTimeout(visibilityActionTimeoutRef.current);
          visibilityActionTimeoutRef.current = null;
        }

        visibilityActionTimeoutRef.current = setTimeout(() => {
          if (cancelled) {
            return;
          }

          if (isHighlyVisible && autoplayAttemptedRef.current !== normalizedVideoUrl) {
            void attemptAutoplay();
            return;
          }

          if (isHighlyVisible
            && autoplayAttemptedRef.current === normalizedVideoUrl
            && autoPausedByVisibilityRef.current
            && video.paused
            && !userPausedRef.current
          ) {
            void video.play().then(() => {
              autoPausedByVisibilityRef.current = false;
            }).catch(() => {
              // Ignore blocked resume; user can still tap play.
            });
            return;
          }

          if (isBarelyVisible && !video.paused) {
            autoPausedByVisibilityRef.current = true;
            isAutoPauseInProgressRef.current = true;
            video.pause();
          }
        }, VISIBILITY_DEBOUNCE_MS);
      },
      { threshold: [0, AUTO_PAUSE_VISIBILITY, AUTO_PLAY_VISIBILITY, 0.95] }
    );

    observer.observe(section);

    return () => {
      cancelled = true;
      observer.disconnect();
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("play", handlePlay);
      if (visibilityActionTimeoutRef.current) {
        clearTimeout(visibilityActionTimeoutRef.current);
        visibilityActionTimeoutRef.current = null;
      }
    };
  }, [normalizedVideoUrl]);

  return (
    <section className="bg-[var(--shresta-logo-bg)] py-12 md:py-14" ref={sectionRef}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="overflow-hidden rounded-2xl border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] shadow-[0_20px_50px_rgba(47,33,21,0.14)]">
          <div className="border-b border-[var(--shresta-logo-border)] px-5 py-4 sm:px-6">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold-500">Brand Intro</p>
            <h2 className="mt-1 font-serif text-2xl font-light text-[var(--shresta-logo-text)] sm:text-3xl">{brandName} Story in Motion</h2>
          </div>
          <div className="relative aspect-video w-full bg-black">
            <video
              autoPlay
              className="h-full w-full object-cover"
              controls
              controlsList="nodownload"
              onContextMenu={(event) => event.preventDefault()}
              playsInline
              preload="metadata"
              ref={videoRef}
            >
              <source src={normalizedVideoUrl} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      </div>
    </section>
  );
}

function normalizeVideoUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const isLocalMediaHost = LOCAL_MEDIA_HOSTS.has(parsed.hostname);
    const isLocalMediaPort = parsed.port === "9010";

    if (isLocalMediaHost && isLocalMediaPort) {
      const normalizedPath = parsed.pathname.startsWith("/") ? parsed.pathname.slice(1) : parsed.pathname;
      return `${LOCAL_MEDIA_PROXY_PATH}${normalizedPath}${parsed.search}`;
    }
  } catch {
    // Keep relative URLs unchanged.
  }

  return encodeURI(url);
}

function CollectionCard({ collection, index }: { collection: FeaturedCollection; index: number }) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className="group relative"
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.5, delay: index * 0.04, ease: [0.25, 0.4, 0.25, 1] }}
      viewport={{ once: true, margin: "-80px" }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
    >
      <Link className="block" href={`/categories/${collection.slug}`}>
      <motion.article
        className="reference-card-glow relative aspect-[4/5] overflow-hidden rounded-lg border border-[var(--shresta-logo-border)] bg-wine-700 transition-colors duration-500 group-hover:border-gold-500/30"
        whileHover={prefersReducedMotion ? undefined : { y: -6 }}
      >
        <motion.div
          className="absolute inset-0"
          transition={{ duration: 0.7, ease: [0.25, 0.4, 0.25, 1] }}
          whileHover={prefersReducedMotion ? undefined : { scale: 1.12 }}
        >
          <ResponsiveMedia
            className="h-full w-full object-cover"
            eager={index < 4}
            media={collection.image}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 17vw"
          />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--wine-950)] via-[rgba(26,9,12,0.32)] to-transparent" />
        {collection.featured ? (
          <motion.div
            className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-gold-500/20 px-2.5 py-1 backdrop-blur-sm"
            whileHover={{ scale: 1.05, rotate: [-1, 1, -1, 0] }}
          >
            <Sparkles className="h-3 w-3 text-gold-400" />
            <span className="text-xs font-medium text-gold-300">Popular</span>
          </motion.div>
        ) : null}
        <motion.div className="absolute right-3 top-3 rounded-full bg-[var(--shresta-logo-bg)]/60 px-2.5 py-1 backdrop-blur-sm" whileHover={{ y: -2 }}>
          <span className="text-xs text-white/80">
          {collection.itemCount} item{collection.itemCount === 1 ? "" : "s"}
          </span>
        </motion.div>
        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
          <motion.h3 className="font-serif text-lg font-light tracking-luxury text-white sm:text-xl" whileHover={{ y: -4 }}>
            {collection.title}
          </motion.h3>
          <p className="mt-1 text-sm text-white/80">{collection.description}</p>
          <motion.div
            className="mt-4 flex items-center gap-2 text-gold-400"
            initial={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.3, ease: [0.25, 0.4, 0.25, 1] }}
            whileHover={{ opacity: 1, y: 0 }}
          >
            <span className="text-sm font-medium uppercase tracking-wider">Explore</span>
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
          </motion.div>
        </div>
      </motion.article>
      </Link>
    </motion.div>
  );
}

function WhyShrestaSection({ features, section }: { features: WhyShrestaFeature[]; section: StorefrontHome["whyShrestaSection"] }) {
  return (
    <section className="bg-[var(--shresta-logo-surface)] py-12 md:py-14 lg:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeader eyebrow={section.eyebrow} title={section.title} subtitle={section.description} />
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <motion.article
              className="group text-center"
              initial={{ opacity: 0, y: 30 }}
              key={feature.title}
              transition={{ duration: 0.6, delay: index * 0.08, ease: [0.25, 0.1, 0.25, 1] }}
              viewport={{ once: true, margin: "-100px" }}
              whileInView={{ opacity: 1, y: 0 }}
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gold-500/10 text-gold-400 transition-all duration-300 group-hover:scale-110 group-hover:bg-gold-500/20">
                <ReferenceIcon className="h-6 w-6" iconKey={feature.iconKey} />
              </div>
              <h3 className="font-serif text-lg font-light tracking-luxury text-[var(--shresta-logo-text)]">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--shresta-logo-muted)]">{feature.description}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductTile({
  product,
  eager,
  isWishlisted,
  onToggleWishlist,
  onAddToCart
}: {
  product: ProductCard;
  eager: boolean;
  isWishlisted: boolean;
  onToggleWishlist: () => void;
  onAddToCart: () => void;
}) {
  const price = formatPaise(asPriceInPaise(product.pricePaise));
  const compareAt = formatPaise(asPriceInPaise(product.compareAtPricePaise));
  const hasDiscount = product.compareAtPricePaise > product.pricePaise;
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.article
      className="group relative flex h-full flex-col"
      whileHover={prefersReducedMotion ? undefined : { y: -8, transition: { type: "spring", stiffness: 300, damping: 25 } }}
    >
      <Link className="group/card flex h-full flex-col" href={`/products/${product.slug}`}>
        <motion.div
          className="relative aspect-square overflow-hidden rounded-2xl bg-[var(--shresta-logo-surface)] focus-within:ring-2 focus-within:ring-gold-500 focus-within:ring-offset-2 focus-within:ring-offset-wine-900"
          transition={{ duration: 0.4, ease: [0.25, 0.4, 0.25, 1] }}
          whileHover={prefersReducedMotion ? undefined : {
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5), 0 12px 24px -8px rgba(0,0,0,0.3)"
          }}
        >
          <div className="pointer-events-none absolute inset-0 z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <div className="reference-shimmer h-full w-full translate-x-[-100%] transition-transform duration-700 group-hover:translate-x-[200%]" />
          </div>
          <ProductImageBadgeRow badges={product.badges} />
          <ResponsiveMedia
            className="h-full w-full object-cover transition-all duration-500 ease-out group-hover:scale-105"
            eager={eager}
            media={product.image}
            sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 25vw"
          />
          <button
            aria-label={isWishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
            className={isWishlisted ? "absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-rose-500/20 to-rose-600/30 text-rose-400 shadow-md shadow-rose-500/20 ring-1 ring-rose-500/30 backdrop-blur-sm transition-all duration-300 hover:scale-110" : "absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--shresta-logo-surface)]/95 text-gold-400/80 shadow-md backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:bg-[var(--shresta-logo-bg)] hover:text-gold-400 hover:shadow-lg"}
            onClick={(event) => {
              event.preventDefault();
              onToggleWishlist();
            }}
            type="button"
          >
            <Heart className={isWishlisted ? "h-5 w-5 fill-current" : "h-5 w-5"} />
          </button>
          <div className="absolute bottom-4 left-4 right-4 translate-y-3 opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
            <button
              className={product.stockQuantity === 0 ? "reference-primary-button min-h-12 w-full cursor-not-allowed px-4 opacity-50 shadow-xl" : "reference-primary-button min-h-12 w-full px-4 shadow-xl"}
              disabled={product.stockQuantity === 0}
              onClick={(event) => {
                event.preventDefault();
                if (product.stockQuantity !== 0) onAddToCart();
              }}
              type="button"
            >
              <ShoppingBag className="h-4 w-4" />
              {product.stockQuantity === 0 ? "Out of Stock" : "Add to Cart"}
            </button>
          </div>
        </motion.div>
        <motion.div className="mt-4 flex flex-1 flex-col px-1">
          <h3 className="heading-card line-clamp-2 min-h-[2.5rem] text-sm leading-5 text-[var(--shresta-logo-text)] transition-colors duration-300 group-hover:text-gold-400">
            {product.name}
          </h3>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-[var(--shresta-logo-text)]">{price}</span>
            {hasDiscount ? <span className="text-sm text-[var(--shresta-logo-muted)] line-through">{compareAt}</span> : null}
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            <StarRating rating={product.rating} />
            <span className="text-body-xs text-[var(--shresta-logo-muted)]">({product.reviewCount})</span>
          </div>
          {product.stockQuantity > 0 && product.stockQuantity <= 10 ? (
            <div className="mt-1.5 text-xs font-semibold text-amber-400">{product.stockQuantity} in stock</div>
          ) : product.stockQuantity === 0 ? (
            <div className="mt-1.5 text-xs font-semibold text-red-400">Out of Stock</div>
          ) : null}
          <div className="mt-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--shresta-logo-border)]/30 bg-[var(--shresta-logo-surface)]/50 px-2.5 py-1 text-xs font-medium text-[var(--shresta-logo-muted)]">
              <ReferenceIcon className="h-3 w-3 text-gold-400" iconKey={product.familyKey} />
              {product.familyKey.replaceAll("_", " ")}
            </span>
          </div>
        </motion.div>
      </Link>
    </motion.article>
  );
}

function MaterialShowcase({ home }: { home: StorefrontHome }) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="bg-gradient-to-b from-[var(--shresta-logo-bg)] to-[var(--shresta-logo-surface)] py-14 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeader
          eyebrow={home.materialShowcase.eyebrow}
          title={home.materialShowcase.title}
          subtitle={home.materialShowcase.description}
        />
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          {home.materialShowcase.stories.map((story, index) => (
            <motion.article
              className="group flex h-full flex-col overflow-hidden rounded-lg bg-[var(--shresta-logo-surface)] shadow-luxury-sm transition-all duration-500 hover:shadow-luxury-lg"
              initial={{ opacity: 0, y: 40 }}
              key={story.id}
              transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.7, delay: index * 0.08, ease: [0.25, 0.1, 0.25, 1] }}
              viewport={{ once: true, margin: "-100px" }}
              whileInView={{ opacity: 1, y: 0 }}
            >
              <div className="relative aspect-[3/2] overflow-hidden">
                <ResponsiveMedia
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  media={story.image}
                  sizes="(max-width: 768px) 92vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-wine-900/80 via-wine-900/20 to-transparent" />
              </div>
              <div className="flex flex-1 flex-col p-6">
                <h3 className="min-h-[3.75rem] font-serif text-xl font-light leading-tight tracking-luxury text-[var(--shresta-logo-text)]">{story.title}</h3>
                <p className="mt-2 min-h-[4.5rem] text-sm leading-relaxed text-[var(--shresta-logo-muted)]">{story.description}</p>
                <ul className="mt-4 space-y-2">
                  {story.highlights.map((benefit) => (
                    <li className="flex items-center gap-2 text-sm text-[var(--shresta-logo-text)]" key={benefit}>
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold-500/20">
                        <Check className="h-3 w-3 text-gold-400" strokeWidth={2.5} />
                      </span>
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

function NewsletterSection({ home }: { home: StorefrontHome }) {
  return (
    <section className="relative overflow-hidden bg-gold-600 px-4 py-16 text-center text-white">
      <motion.div
        animate={{ x: ["-100%", "100%"] }}
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
      />
      <div className="relative">
      <span className="inline-flex items-center gap-2 rounded-full bg-black/20 px-4 py-1.5 text-xs font-medium text-white/90 backdrop-blur-sm">
        <Sparkles className="h-3.5 w-3.5" />
        {home.newsletter.eyebrow}
      </span>
      <h2 className="mt-4 font-serif text-4xl font-light text-white">{home.newsletter.title}</h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/80">{home.newsletter.description}</p>
      <form action="/newsletter" className="mx-auto mt-6 flex max-w-xl flex-col gap-3 sm:flex-row">
        <label className="relative flex min-h-11 flex-1 items-center rounded-full border border-[rgba(26,9,12,0.15)] bg-[rgba(253,246,235,0.96)] px-5 text-sm shadow-sm">
          <Mail className="mr-3 h-4 w-4 shrink-0 text-gold-600" />
          <input
            className="flex-1 bg-transparent text-wine-900 placeholder:text-wine-400 outline-none"
            name="email"
            pattern={INPUT_PATTERNS.email}
            placeholder="Enter your email"
            title={INPUT_PATTERN_TITLES.email}
            type="email"
          />
        </label>
        <button
          className="group relative min-h-11 overflow-hidden rounded-full px-8 text-sm font-semibold tracking-wide text-white transition-all duration-700 ease-out hover:scale-[1.03] hover:shadow-[0_4px_44px_rgba(212,175,55,0.5)] active:scale-[0.97] active:duration-100"
          type="submit"
        >
          {/* wine gradient background */}
          <span className="absolute inset-0 rounded-full bg-gradient-to-br from-wine-700 to-wine-900" />
          {/* gold accent ring — breathes open on hover */}
          <span className="absolute inset-0 rounded-full ring-1 ring-gold-500/40 transition-all duration-700 group-hover:ring-2 group-hover:ring-gold-400/70" />
          {/* slow luxurious sweep shine */}
          <span className="absolute inset-0 -translate-x-full rounded-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-[1100ms] ease-in-out group-hover:translate-x-full" />
          <span className="relative z-10 flex items-center gap-2">
            {home.newsletter.ctaLabel}
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-500 ease-out group-hover:translate-x-1.5" />
          </span>
        </button>
      </form>
      <p className="mt-4 text-xs text-white/50">By subscribing, you agree to our Privacy Policy and consent to receive updates.</p>
      </div>
    </section>
  );
}

function CustomerFooter({ home }: { home: StorefrontHome }) {
  return (
    <footer className="bg-[var(--shresta-logo-bg)] pb-24 pt-12 text-[var(--shresta-logo-muted)] md:pb-0">
      <div className="mx-auto grid max-w-7xl gap-7 px-4 pb-8 sm:px-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4 lg:-ml-1 xl:-ml-2">
          <BrandLogo media={home.brand.logo} variant="footer" />
          <p className="max-w-sm text-sm leading-relaxed text-[var(--shresta-logo-muted)]">{home.brand.tagline}</p>
          <div className="flex gap-4">
            {[
              { label: "Instagram", icon: <Instagram className="h-5 w-5" /> },
              { label: "Facebook", icon: <Facebook className="h-5 w-5" /> },
              { label: "Twitter", icon: <Twitter className="h-5 w-5" /> }
            ].map((social) => (
              <a
                aria-label={social.label}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] text-[var(--shresta-logo-muted)] transition-colors hover:bg-gold-500 hover:text-wine-950"
                href="#"
                key={social.label}
              >
                {social.icon}
              </a>
            ))}
          </div>
        </div>
        <FooterList title="Categories" links={home.featuredCollections.slice(0, 6).map((collection) => ({ label: collection.title, href: `/categories/${collection.slug}` }))} />
        <FooterList title="Customer Service" links={[{ label: "Contact Us", href: "/support" }, { label: "Shipping & Delivery", href: "/support/shipping" }, { label: "Returns & Exchanges", href: "/support/returns" }, { label: "Size Guide", href: "/support/size-guide" }, { label: "FAQs", href: "/support/faqs" }]} />
        <div>
          <h3 className="mb-4 font-semibold text-[var(--shresta-logo-text)]">Contact</h3>
          <ul className="space-y-3 text-sm text-[var(--shresta-logo-muted)]">
            <li>
              <span className="block text-[var(--shresta-logo-muted)]">Email</span>
              <a className="transition hover:text-gold-400" href="mailto:support@shrestaexclusive.com">support@shrestaexclusive.com</a>
            </li>
            <li>
              <span className="block text-[var(--shresta-logo-muted)]">Phone</span>
              <a className="transition hover:text-gold-400" href="tel:+911234567890">+91 12345 67890</a>
            </li>
            <li>
              <span className="block text-[var(--shresta-logo-muted)]/60">Hours</span>
              Mon - Sat: 10AM - 7PM IST
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[var(--shresta-logo-border)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 text-sm text-[var(--shresta-logo-muted)] sm:px-6 md:flex-row md:items-center md:justify-between">
          <p>&copy; {new Date().getFullYear()} SHRESTA EXCLUSIVE. All rights reserved.</p>
          <div className="flex flex-wrap gap-5">
            <Link className="transition hover:text-gold-400" href="/privacy">Privacy Policy</Link>
            <Link className="transition hover:text-gold-400" href="/terms">Terms of Service</Link>
            <Link className="transition hover:text-gold-400" href="/cookies">Cookie Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterList({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <h3 className="mb-4 font-semibold text-[var(--shresta-logo-text)]">{title}</h3>
      <ul className="mt-4 space-y-3">
        {links.map((link) => (
          <li key={link.href}>
            <Link className="text-sm text-[var(--shresta-logo-muted)] transition-colors hover:text-gold-400" href={link.href}>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MobileSearchOverlay({
  home,
  isOpen,
  onClose
}: {
  home: StorefrontHome;
  isOpen: boolean;
  onClose: () => void;
}) {
  const isMobileViewport = useMobileSearchViewport();
  const quickLinks = home.featuredCollections.slice(0, 5);

  useEffect(() => {
    if (!isOpen || !isMobileViewport) {
      return undefined;
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
  }, [isMobileViewport, isOpen, onClose]);

  if (!isOpen || !isMobileViewport) {
    return null;
  }

  return (
    <div aria-label="Search SHRESTA catalog" aria-modal="true" className="fixed inset-0 z-[90] md:hidden" role="dialog">
      <button aria-label="Close search" className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} type="button" />
      <section className="absolute inset-x-0 top-0 rounded-b-3xl border-b border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-bg)] px-4 pb-6 pt-[calc(1rem+env(safe-area-inset-top,0px))] shadow-2xl">
        <div className="mx-auto max-w-md">
          <div className="flex items-center gap-3">
            <button
              aria-label="Close search"
              className="reference-icon-button inline-flex shrink-0"
              onClick={onClose}
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
            <form action="/products" className="flex min-h-12 flex-1 overflow-hidden rounded-full border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] focus-within:border-gold-500">
              <span className="flex w-11 shrink-0 items-center justify-center text-[var(--shresta-logo-muted)]">
                <Search className="h-5 w-5" />
              </span>
              <input
                autoFocus
                className="min-w-0 flex-1 bg-transparent text-base text-[var(--shresta-logo-text)] outline-none placeholder:text-[var(--shresta-logo-muted)]"
                name="query"
                placeholder="Search SHRESTA sarees..."
                type="search"
              />
              <button
                aria-label="Submit search"
                className="flex w-12 shrink-0 items-center justify-center bg-gold-500 text-wine-950 transition hover:bg-gold-400"
                type="submit"
              >
                <ArrowRight className="h-5 w-5" />
              </button>
            </form>
          </div>
          <div className="mt-5 rounded-2xl border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold-400">Quick search</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {quickLinks.map((collection) => (
                <Link
                  className="inline-flex min-h-9 items-center rounded-full border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] px-3 text-sm font-medium text-[var(--shresta-logo-muted)] transition hover:border-gold-500 hover:text-gold-600"
                  href={`/categories/${collection.slug}`}
                  key={collection.id}
                  onClick={onClose}
                >
                  {collection.title}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function useMobileSearchViewport() {
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobileViewport(media.matches);

    update();
    media.addEventListener("change", update);

    return () => media.removeEventListener("change", update);
  }, []);

  return isMobileViewport;
}

function MobileBottomNav({
  cartCount,
  onOpenSearch,
  searchOpen,
  wishlistCount
}: {
  cartCount: number;
  onOpenSearch: () => void;
  searchOpen: boolean;
  wishlistCount: number;
}) {
  const pathname = usePathname() ?? "/";
  const navItems: Array<{
    href?: string;
    label: string;
    icon: ReactNode;
    count?: number;
    onClick?: () => void;
  }> = [
    { href: "/", label: "Home", icon: <Home className="h-5 w-5" /> },
    { label: "Search", icon: <Search className="h-5 w-5" />, onClick: onOpenSearch },
    { href: "/cart", label: "Cart", icon: <ShoppingBag className="h-5 w-5" />, count: cartCount },
    { href: "/wishlist", label: "Wishlist", icon: <Heart className="h-5 w-5" />, count: wishlistCount },
    { href: "/account", label: "Account", icon: <User className="h-5 w-5" /> }
  ];

  return (
    <nav aria-label="Mobile navigation" className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-bg)] shadow-lg md:hidden">
      <div className="flex h-16 items-center justify-around pb-[env(safe-area-inset-bottom,0px)]">
        {navItems.map((item) => {
          const active = item.label === "Search"
            ? searchOpen || pathname === "/products"
            : item.href === "/" ? pathname === "/" : Boolean(item.href && (pathname === item.href || pathname.startsWith(`${item.href}/`)));
          const className = active ? "flex h-full min-h-11 min-w-11 flex-1 flex-col items-center justify-center gap-1 text-gold-500" : "flex h-full min-h-11 min-w-11 flex-1 flex-col items-center justify-center gap-1 text-[var(--shresta-logo-muted)] transition hover:text-gold-400";
          const content = (
            <>
              <span className="relative">
                {item.icon}
                {item.count ? (
                  <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold-500 px-1 text-[10px] font-bold text-wine-950">
                    {item.count > 9 ? "9+" : item.count}
                  </span>
                ) : null}
              </span>
              <span className="text-[11px] font-medium tracking-[0.08em]">{item.label}</span>
            </>
          );

          if (item.onClick) {
            return (
              <button
                aria-label={searchOpen ? "Search catalog open" : "Open catalog search"}
                aria-pressed={searchOpen}
                className={className}
                key={item.label}
                onClick={item.onClick}
                type="button"
              >
                {content}
              </button>
            );
          }

          return (
            <Link
              aria-current={active ? "page" : undefined}
              aria-label={`${item.label}${item.count ? ` (${item.count} items)` : ""}`}
              className={className}
              href={item.href ?? "/"}
              key={item.href}
            >
              {content}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function SectionHeader({ eyebrow, title, subtitle }: { eyebrow?: string | null; title: string; subtitle?: string | null }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      {eyebrow ? <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold-400">{eyebrow}</p> : null}
      <h2 className="mt-2 font-serif text-3xl font-light tracking-luxury text-[var(--shresta-logo-text)] md:text-4xl">{title}</h2>
      {subtitle ? <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[var(--shresta-logo-muted)] md:text-base">{subtitle}</p> : null}
      <div className="mx-auto mt-4 h-px w-20 bg-gradient-to-r from-transparent via-gold-500 to-transparent" />
    </div>
  );
}

function CounterBadge({ count }: { count: number }) {
  return (
    <motion.span
      animate={{ scale: 1 }}
      className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-gold-500 px-1 text-[10px] font-bold text-wine-950"
      initial={{ scale: 0 }}
      transition={{ type: "spring", stiffness: 500, damping: 25 }}
    >
      {count > 99 ? "99+" : count}
    </motion.span>
  );
}

function ReferenceIcon({ iconKey, className }: { iconKey: string; className?: string }) {
  const normalized = iconKey.toLowerCase();
  if (normalized.includes("shield")) {
    return <ShieldCheck className={className} strokeWidth={1.5} />;
  }
  if (normalized.includes("truck") || normalized.includes("delivery")) {
    return <Truck className={className} strokeWidth={1.5} />;
  }
  if (normalized.includes("return") || normalized.includes("rotate")) {
    return <RotateCcw className={className} strokeWidth={1.5} />;
  }
  if (normalized.includes("package") || normalized.includes("packaging")) {
    return <PackageCheck className={className} strokeWidth={1.5} />;
  }
  if (normalized.includes("clock")) {
    return <Clock className={className} strokeWidth={1.5} />;
  }
  if (normalized.includes("heart") || normalized.includes("skin")) {
    return <HeartHandshake className={className} strokeWidth={1.5} />;
  }
  if (normalized.includes("cert") || normalized.includes("verified")) {
    return <BadgeCheck className={className} strokeWidth={1.5} />;
  }
  if (normalized.includes("award")) {
    return <Award className={className} strokeWidth={1.5} />;
  }
  if (normalized.includes("ad")) {
    return <Gem className={className} strokeWidth={1.5} />;
  }
  if (normalized.includes("spark") || normalized.includes("shine")) {
    return <Sparkles className={className} strokeWidth={1.5} />;
  }
  if (normalized.includes("silk") || normalized.includes("saree")) {
    return <Shirt className={className} strokeWidth={1.5} />;
  }
  return <Shield className={className} strokeWidth={1.5} />;
}

function StarRating({ rating, maxStars = 5 }: { rating: number; maxStars?: number }) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;

  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating.toFixed(1)} out of ${maxStars} stars`}>
      {Array.from({ length: maxStars }).map((_, index) => {
        if (index < fullStars) {
          return <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" key={`star-full-${index}`} />;
        }
        if (index === fullStars && hasHalfStar) {
          return (
            <span className="relative h-3.5 w-3.5" key={`star-half-${index}`}>
              <Star className="absolute h-3.5 w-3.5 text-wine-700" />
              <span className="absolute overflow-hidden" style={{ width: "50%" }}>
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              </span>
            </span>
          );
        }
        return <Star className="h-3.5 w-3.5 text-wine-700" key={`star-empty-${index}`} />;
      })}
      <span className="ml-1 text-body-xs font-medium text-[var(--shresta-logo-muted)]">{rating.toFixed(1)}</span>
    </div>
  );
}
