"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Home,
  Heart,
  Lock,
  MapPin,
  Minus,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Trash2,
  Truck,
  Zap,
  type LucideIcon
} from "lucide-react";
import { ResponsiveMedia } from "@/components/storefront/responsive-media";
import { StorefrontPageChrome } from "@/components/storefront/storefront-home-experience";
import { useCustomerSession } from "@/features/auth/use-customer-session";
import { useBrowserCart, type BrowserCartLine } from "@/features/cart/browser-cart";
import {
  createCustomerOrderDraft,
  markDraftPaymentFailed,
  createRazorpayOrder,
  placeCustomerOrder,
  verifyRazorpayPayment,
  type CustomerOrderDraftResponse,
  type CustomerOrderResponse
} from "@/features/orders/customer-orders";
import { ensureRazorpayCheckoutScriptLoaded } from "@/features/orders/razorpay-sdk";
import type { ProductCard, StorefrontHome } from "@/features/storefront/storefront-home";
import { useBrowserWishlist } from "@/features/wishlist/browser-wishlist";
import { enumDisplayLabel } from "@/lib/admin-enums";
import { asPriceInPaise, formatPaise } from "@/lib/currency";
import { INPUT_PATTERNS, INPUT_PATTERN_TITLES } from "@/lib/input-patterns";

type CommercePageProps = {
  home: StorefrontHome;
  products: ProductCard[];
};

type RazorpayPaymentSuccessPayload = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayCheckoutFailurePayload = {
  error?: {
    description?: string;
    metadata?: {
      order_id?: string;
      payment_id?: string;
    };
    reason?: string;
    source?: string;
    step?: string;
  };
};

type RazorpayCheckoutLaunchResult =
  | ({ ok: true } & { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string })
  | ({ ok: false } & {
      kind: "failed" | "interrupted" | "error";
      message: string;
      razorpayOrderId?: string;
      razorpayPaymentId?: string;
    });

type RazorpayCheckoutOptions = {
  amount: number;
  config?: {
    display?: {
      blocks?: Record<string, {
        instruments: Array<{ method: string; flows?: string[] }>;
        name: string;
      }>;
      preferences?: {
        show_default_blocks?: boolean;
      };
      sequence?: string[];
    };
  };
  currency: string;
  description: string;
  handler: (payload: RazorpayPaymentSuccessPayload) => void;
  key: string;
  method?: {
    card?: boolean;
    emi?: boolean;
    netbanking?: boolean;
    paylater?: boolean;
    upi?: boolean;
    wallet?: boolean;
  };
  modal?: { ondismiss?: () => void };
  name: string;
  notes?: Record<string, string>;
  order_id: string;
  prefill?: {
    contact?: string;
    email?: string;
    name?: string;
  };
  theme?: { color?: string };
};

type RazorpayCheckoutInstance = {
  on: (event: "payment.failed", callback: (payload: RazorpayCheckoutFailurePayload) => void) => void;
  open: () => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayCheckoutInstance;
  }
}

type CartProductLine = {
  line: BrowserCartLine;
  product: ProductCard;
};

type CartInventoryReconcileSummary = {
  reducedLines: number;
  removedLines: number;
};

const FREE_DELIVERY_THRESHOLD_PAISE = 49_900;
const STANDARD_DELIVERY_PAISE = 4_900;
const EXPRESS_DELIVERY_PAISE = 14_900;
const SAME_DAY_DELIVERY_PAISE = 29_900;
const RAZORPAY_RESULT_TIMEOUT_MS = 5 * 60_000;
const CHECKOUT_STORAGE_KEY = "shresta.checkout.v1";
const CHECKOUT_SELECTION_STORAGE_KEY = "shresta.checkout.selection.v1";
const CHECKOUT_IDEMPOTENCY_STORAGE_KEY = "shresta.checkout.order-idempotency.v1";
const CHECKOUT_DRAFT_STORAGE_KEY = "shresta.checkout.order-draft.v1";
const CHECKOUT_DRAFT_IDEMPOTENCY_STORAGE_KEY = "shresta.checkout.order-draft-idempotency.v1";

type CheckoutJourneyStep = "details" | "delivery" | "review" | "processing" | "success" | "payment_failed";
type AddressType = "home" | "work" | "other";
type DeliveryMode = "standard" | "express" | "same_day";
type CheckoutDetailField = "email" | "phone" | "fullName" | "postalCode" | "addressLine1" | "addressLine2" | "city" | "state" | "landmark";

type CheckoutFormState = {
  acceptedTerms: boolean;
  addressLine1: string;
  addressLine2: string;
  addressType: AddressType;
  city: string;
  deliveryMode: DeliveryMode;
  email: string;
  fullName: string;
  landmark: string;
  phone: string;
  postalCode: string;
  state: string;
};

type CompletedOrder = {
  email: string;
  fulfillmentStatus: string;
  itemCount: number;
  orderNumber: string;
  orderStatus: string;
  paymentStatus: string;
  placedAt: string;
  statusEvents: CustomerOrderResponse["statusEvents"];
  totalLabel: string;
};

type StoredCheckoutDraft = {
  browserCartSignature: string;
  cartSignature: string;
  createdAt: string;
  expiresAt: string;
  orderId: string;
  orderNumber: string;
};

const DEFAULT_CHECKOUT_FORM: CheckoutFormState = {
  acceptedTerms: false,
  addressLine1: "",
  addressLine2: "",
  addressType: "home",
  city: "",
  deliveryMode: "standard",
  email: "",
  fullName: "",
  landmark: "",
  phone: "",
  postalCode: "",
  state: ""
};

const PINCODE_AUTOFILL: Record<string, { city: string; state: string }> = {
  "110001": { city: "New Delhi", state: "Delhi" },
  "400001": { city: "Mumbai", state: "Maharashtra" },
  "560001": { city: "Bengaluru", state: "Karnataka" },
  "560061": { city: "Bengaluru", state: "Karnataka" },
  "600001": { city: "Chennai", state: "Tamil Nadu" },
  "700001": { city: "Kolkata", state: "West Bengal" }
};

const CHECKOUT_DETAIL_FIELDS: CheckoutDetailField[] = ["email", "phone", "fullName", "postalCode", "addressLine1", "addressLine2", "city", "state", "landmark"];

const DELIVERY_OPTIONS: Array<{
  description: string;
  estimatedDays: string;
  icon: LucideIcon;
  id: DeliveryMode;
  name: string;
  pricePaise: number;
}> = [
  {
    description: "Scheduled quick-commerce slot with care-packed handoff for saree orders.",
    estimatedDays: "2-4 hr slot",
    icon: Truck,
    id: "standard",
    name: "Scheduled Quick Slot",
    pricePaise: STANDARD_DELIVERY_PAISE
  },
  {
    description: "Priority picking and packing for urgent celebration and wardrobe plans.",
    estimatedDays: "60-90 min",
    icon: Zap,
    id: "express",
    name: "Priority Express Slot",
    pricePaise: EXPRESS_DELIVERY_PAISE
  },
  {
    description: "Fastest local inventory handoff from the nearest SHRESTA-ready service zone.",
    estimatedDays: "30-60 min",
    icon: Clock,
    id: "same_day",
    name: "Rapid Store Handoff",
    pricePaise: SAME_DAY_DELIVERY_PAISE
  }
];

export function StorefrontCartExperience({ home, products }: CommercePageProps) {
  const router = useRouter();
  const cart = useBrowserCart();
  const [inventoryNotice, setInventoryNotice] = useState<string | null>(null);

  useEffect(() => {
    // Cart route has intermittent App Router transition aborts; fallback to document navigation.
    const handleCartLinkClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest("a");
      if (!(anchor instanceof HTMLAnchorElement)) {
        return;
      }

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
        return;
      }
      if (anchor.target && anchor.target !== "_self") {
        return;
      }

      const nextUrl = new URL(anchor.href, window.location.href);
      if (nextUrl.origin !== window.location.origin) {
        return;
      }

      if (`${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}` === `${window.location.pathname}${window.location.search}${window.location.hash}`) {
        return;
      }

      event.preventDefault();
      window.location.assign(nextUrl.href);
    };

    document.addEventListener("click", handleCartLinkClick, true);
    return () => document.removeEventListener("click", handleCartLinkClick, true);
  }, []);

  useReconcileCartInventory(cart.lines, cart.replaceLines, products, (summary) => {
    if (summary.removedLines > 0 && summary.reducedLines > 0) {
      setInventoryNotice("Some items were removed and some quantities were reduced because stock changed in another active checkout.");
      return;
    }
    if (summary.removedLines > 0) {
      setInventoryNotice("Some items were removed because they are currently reserved or out of stock in another active checkout.");
      return;
    }
    if (summary.reducedLines > 0) {
      setInventoryNotice("Some quantities were reduced because stock changed in another active checkout.");
    }
  });
  const wishlist = useBrowserWishlist();
  useReconcileWishlistInventory(wishlist.productIds, wishlist.replaceItems, products);
  const items = resolveCartItems(cart.lines, products);
  const [selectedCheckoutProductIds, setSelectedCheckoutProductIds] = useState<Set<string> | null>(null);
  const currentCartProductIds = new Set(items.map((entry) => entry.product.id));
  const effectiveSelectedCheckoutProductIds = selectedCheckoutProductIds === null
    ? currentCartProductIds
    : new Set(Array.from(selectedCheckoutProductIds).filter((id) => currentCartProductIds.has(id)));

  const selectedItems = items.filter((entry) => effectiveSelectedCheckoutProductIds.has(entry.product.id));
  const allItemsSelected = selectedItems.length === items.length && items.length > 0;
  const totals = calculateCartTotals(selectedItems);
  const { isLoading: profileLoading, session } = useCustomerSession();
  const [checkoutDraftError, setCheckoutDraftError] = useState<string | null>(null);
  const [isCreatingDraft, setIsCreatingDraft] = useState(false);
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);
  const cartSignature = cartSignatureFromItems(items);

  useEffect(() => {
    if (!cartSignature) {
      clearStoredCheckoutDraft();
      clearStoredCheckoutSelection();
      clearStoredDraftIdempotencyKey();
      return;
    }
    discardStoredCheckoutDraftForChangedCart(cartSignature);
  }, [cartSignature]);

  async function handleProceedToCheckout() {
    setCheckoutDraftError(null);

    if (profileLoading) {
      return;
    }

    if (!session) {
      setLoginPromptOpen(true);
      return;
    }

    if (selectedItems.length === 0) {
      setCheckoutDraftError("Select at least one item for checkout.");
      return;
    }

    setIsCreatingDraft(true);
    const result = await createCustomerOrderDraft({
      lines: checkoutLinesPayload(selectedItems)
    }, getOrCreateDraftIdempotencyKey(selectedItems));
    setIsCreatingDraft(false);

    if (result.ok) {
      writeStoredCheckoutDraft(result.draft, selectedItems);
      writeStoredCheckoutSelection(selectedItems.map((entry) => entry.product.id));
      router.push(`/checkout?orderId=${encodeURIComponent(result.draft.orderId)}`);
      return;
    }

    if (result.status === 401) {
      setLoginPromptOpen(true);
      return;
    }

    setCheckoutDraftError(result.message);
  }

  function handleClearCart() {
    clearStoredCheckoutDraft();
    clearStoredCheckoutSelection();
    clearStoredDraftIdempotencyKey();
    cart.clearCart();
  }

  function handleCartQuantityChange(productId: string, quantity: number) {
    clearStoredCheckoutDraft();
    clearStoredDraftIdempotencyKey();
    const item = items.find((entry) => entry.product.id === productId);
    const maxQuantity = item?.product.stockQuantity;
    if ((maxQuantity ?? 1) <= 0) {
      cart.removeItem(productId);
      return;
    }
    cart.updateQuantity(productId, quantity, maxQuantity);
  }

  function handleCartLineRemove(productId: string) {
    clearStoredCheckoutDraft();
    clearStoredDraftIdempotencyKey();
    cart.removeItem(productId);
  }

  return (
    <StorefrontPageChrome home={home}>
      <CommerceHero
        eyebrow="Shopping bag"
        metric={`${cart.itemCount} item${cart.itemCount === 1 ? "" : "s"}`}
        title="Review Your Cart"
      />

      <section className="bg-[var(--shresta-logo-bg)] px-4 py-10 sm:px-6 lg:py-14">
        {items.length === 0 ? (
          <EmptyCommerceState
            ctaHref="/products"
            ctaLabel="Start Shopping"
            description="Your cart is empty. Add SHRESTA sarees and they will appear here."
            icon="cart"
            title="Your cart is empty"
          />
        ) : (
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="rounded-2xl border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] shadow-[0_16px_42px_rgba(47,33,21,0.12)]">
              <div className="flex items-center justify-between border-b border-[var(--shresta-logo-border)] px-5 py-4">
                <div>
                  <h2 className="font-serif text-2xl font-light text-[var(--shresta-logo-text)]">Shopping Cart</h2>
                  <p className="mt-1 text-sm text-[var(--shresta-logo-muted)]">{cart.itemCount} SHRESTA-priced item{cart.itemCount === 1 ? "" : "s"}</p>
                </div>
                <button
                  className="inline-flex min-h-9 items-center gap-2 rounded-full border border-rose-500/30 px-3 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/10"
                  onClick={handleClearCart}
                  type="button"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear
                </button>
              </div>
              <div className="flex items-center justify-between gap-3 border-b border-[var(--shresta-logo-border)] px-5 py-3">
                <label className="flex items-center gap-2 text-sm font-medium text-[var(--shresta-logo-text)]">
                  <input
                    checked={allItemsSelected}
                    className="h-4 w-4 rounded border-[var(--shresta-logo-border)]"
                    onClick={() => {
                      if (allItemsSelected) {
                        setSelectedCheckoutProductIds(new Set());
                      } else {
                        setSelectedCheckoutProductIds(null);
                      }
                    }}
                    readOnly
                    type="checkbox"
                  />
                  Select all for checkout
                </label>
                <span className="text-xs font-semibold text-[var(--shresta-logo-muted)]">{selectedItems.length} selected</span>
              </div>
              <div className="divide-y divide-[var(--shresta-logo-border)] px-5">
                {items.map((item) => (
                  <CartLineRow
                    item={item}
                    key={item.product.id}
                    selected={effectiveSelectedCheckoutProductIds.has(item.product.id)}
                    onToggleSelect={() => {
                      setSelectedCheckoutProductIds((current) => {
                        const base = current ?? new Set(items.map((entry) => entry.product.id));
                        const next = new Set(base);
                        if (next.has(item.product.id)) {
                          next.delete(item.product.id);
                        } else {
                          next.add(item.product.id);
                        }
                        return next;
                      });
                    }}
                    onRemove={() => handleCartLineRemove(item.product.id)}
                    onUpdateQuantity={(quantity) => handleCartQuantityChange(item.product.id, quantity)}
                  />
                ))}
              </div>
            </div>

            <div>
              <CartSummaryPanel
                ctaLabel={cartProceedCtaLabel(profileLoading, isCreatingDraft)}
                disabled={profileLoading || isCreatingDraft}
                disabledReason={isCreatingDraft ? "Checkout order ID is being created for your cart. Please wait." : profileLoading ? "We are verifying your login before checkout. Please wait." : undefined}
                itemCount={selectedItems.reduce((total, entry) => total + entry.line.quantity, 0)}
                locked={!session}
                lockedMessage="Login is required before SHRESTA creates a 15-minute checkout order ID for this cart."
                onCtaClick={handleProceedToCheckout}
                totals={totals}
              />
              {checkoutDraftError ? (
                <p className="mt-3 rounded-xl border border-rose-400/35 bg-rose-950/30 px-4 py-3 text-sm leading-6 text-rose-700">
                  {checkoutDraftError}
                </p>
              ) : null}
              {inventoryNotice ? (
                <p className="mt-3 rounded-xl border border-amber-400/35 bg-amber-500/10 px-4 py-3 text-sm leading-6 text-amber-200">
                  {inventoryNotice}
                </p>
              ) : null}
            </div>
          </div>
        )}
      </section>
      {loginPromptOpen ? (
        <LoginRequiredDialog
          description="Login first, then SHRESTA will create a 15-minute checkout order ID for this exact cart. Your cart remains unchanged."
          loginHref="/login?next=/cart"
          onClose={() => setLoginPromptOpen(false)}
          title="Sign in to start checkout"
        />
      ) : null}
    </StorefrontPageChrome>
  );
}

export function StorefrontWishlistExperience({ home, products }: CommercePageProps) {
  const wishlist = useBrowserWishlist();
  const cart = useBrowserCart();
  useReconcileCartInventory(cart.lines, cart.replaceLines, products);
  useReconcileWishlistInventory(wishlist.productIds, wishlist.replaceItems, products);
  const productById = productMap(products);
  const savedProducts = wishlist.productIds
    .map((productId) => productById.get(productId))
    .filter((product): product is ProductCard => Boolean(product));

  async function handleShareWishlist() {
    if (typeof window === "undefined") {
      return;
    }

    const browserNavigator = window.navigator as Navigator & {
      clipboard?: Clipboard;
      share?: (data?: ShareData) => Promise<void>;
    };
    const wishlistUrl = `${window.location.origin}/wishlist?items=${encodeURIComponent(savedProducts.map((product) => product.slug).join(","))}`;

    try {
      if (browserNavigator.share) {
        await browserNavigator.share({
          title: "My SHRESTA Wishlist",
          text: "Take a look at my SHRESTA wishlist",
          url: wishlistUrl
        });
        return;
      }

      if (browserNavigator.clipboard) {
        await browserNavigator.clipboard.writeText(wishlistUrl);
      }
    } catch {
      // Ignore share cancellation.
    }
  }

  return (
    <StorefrontPageChrome home={home}>
      <CommerceHero
        eyebrow="Wishlist"
        metric={`${savedProducts.length} saved`}
        title="Saved For Later"
      />

      <section className="bg-[var(--shresta-logo-bg)] px-4 py-10 sm:px-6 lg:py-14">
        {savedProducts.length === 0 ? (
          <EmptyCommerceState
            ctaHref="/products"
            ctaLabel="Explore Products"
            description="Save products from listings or product pages and they will appear here for quick cart movement."
            icon="wishlist"
            title="Your wishlist is empty"
          />
        ) : (
          <div className="mx-auto max-w-7xl">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="font-serif text-3xl font-light text-[var(--shresta-logo-text)]">My Wishlist</h2>
                <p className="mt-1 text-sm text-[var(--shresta-logo-muted)]">{savedProducts.length} product{savedProducts.length === 1 ? "" : "s"} saved</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  className="inline-flex min-h-10 w-fit items-center gap-2 rounded-full border border-[var(--gold-500)] px-4 text-sm font-semibold text-[var(--gold-600)] transition hover:bg-[rgba(212,175,55,0.12)]"
                  onClick={handleShareWishlist}
                  type="button"
                >
                  <ArrowRight className="h-4 w-4" />
                  Share Wishlist
                </button>
                <button
                  className="inline-flex min-h-10 w-fit items-center gap-2 rounded-full border border-rose-500/30 px-4 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/10"
                  onClick={wishlist.clearWishlist}
                  type="button"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear All
                </button>
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {savedProducts.map((product) => (
                <WishlistProductCard
                  cartQuantity={cart.lines.find((line) => line.productId === product.id)?.quantity ?? 0}
                  key={product.id}
                  onAddToCart={() => cart.addItem(product.id, 1, product.stockQuantity)}
                  onDecreaseCartQuantity={() => {
                    const quantity = cart.lines.find((line) => line.productId === product.id)?.quantity ?? 0;
                    if (quantity <= 1) {
                      cart.removeItem(product.id);
                      return;
                    }
                    cart.updateQuantity(product.id, quantity - 1, product.stockQuantity);
                  }}
                  onIncreaseCartQuantity={() => {
                    const quantity = cart.lines.find((line) => line.productId === product.id)?.quantity ?? 0;
                    cart.updateQuantity(product.id, quantity + 1, product.stockQuantity);
                  }}
                  onRemove={() => wishlist.removeItem(product.id)}
                  product={product}
                />
              ))}
            </div>
          </div>
        )}
      </section>
    </StorefrontPageChrome>
  );
}

export function StorefrontCheckoutExperience({ home, products }: CommercePageProps) {
  const router = useRouter();
  const cart = useBrowserCart();
  const [inventoryNotice, setInventoryNotice] = useState<string | null>(null);
  useReconcileCartInventory(cart.lines, cart.replaceLines, products, (summary) => {
    if (summary.removedLines > 0 && summary.reducedLines > 0) {
      setInventoryNotice("Your cart was updated because some stock was reserved in other active checkouts. Please review before payment.");
      return;
    }
    if (summary.removedLines > 0) {
      setInventoryNotice("One or more items became unavailable and were removed. Please review before payment.");
      return;
    }
    if (summary.reducedLines > 0) {
      setInventoryNotice("Some quantities were reduced due to parallel checkout reservations. Please review before payment.");
    }
  });
  const wishlist = useBrowserWishlist();
  useReconcileWishlistInventory(wishlist.productIds, wishlist.replaceItems, products);
  const items = resolveCartItems(cart.lines, products);
  const selectedCheckoutProductIds = readStoredCheckoutSelection();
  const checkoutItems = selectedCheckoutProductIds.length > 0
    ? items.filter((item) => selectedCheckoutProductIds.includes(item.product.id))
    : items;
  const totals = calculateCartTotals(checkoutItems);
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);
  const checkoutDraft = readStoredCheckoutDraft(checkoutItems);
  const [checkoutStep, setCheckoutStep] = useState<CheckoutJourneyStep>(() => readStoredCheckoutState().step);
  const [checkoutForm, setCheckoutForm] = useState<CheckoutFormState>(() => readStoredCheckoutState().form);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutFailureNeedsFreshDraft, setCheckoutFailureNeedsFreshDraft] = useState(false);
  const [checkoutStatusHint, setCheckoutStatusHint] = useState<string | null>(null);
  const [completedOrder, setCompletedOrder] = useState<CompletedOrder | null>(null);
  const { isLoading: profileLoading, session } = useCustomerSession();
  const deliveryPaise = calculateDeliveryPaise(checkoutForm.deliveryMode, totals.subtotalPaise);
  const checkoutTotals = { ...totals, deliveryPaise, totalPaise: totals.subtotalPaise + deliveryPaise };
  const isReviewStep = checkoutStep === "review";
  const isFinalLoginLocked = isReviewStep && (profileLoading || !session);

  useEffect(() => {
    if (checkoutStep === "processing" || checkoutStep === "success") {
      return;
    }

    window.localStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify({ form: checkoutForm, step: checkoutStep }));
  }, [checkoutForm, checkoutStep]);

  function updateCheckoutForm(patch: Partial<CheckoutFormState>) {
    setCheckoutForm((current) => ({ ...current, ...patch }));
    setCheckoutError(null);
  }

  function goToCheckoutStep(step: CheckoutJourneyStep) {
    setCheckoutError(null);
    setCheckoutStep(step);
  }

  async function handleCheckoutCta() {
    setCheckoutError(null);

    if (checkoutStep === "details") {
      const error = validateCheckoutDetails(checkoutForm);
      if (error) {
        setCheckoutError(error);
        return;
      }
      setCheckoutStep("delivery");
      return;
    }

    if (checkoutStep === "delivery") {
      setCheckoutStep("review");
      return;
    }

    if (checkoutStep === "review") {
      if (!checkoutForm.acceptedTerms) {
        setCheckoutError("Review the final total and accept the order terms before confirming payment.");
        return;
      }

      if (profileLoading) {
        setCheckoutError("We are checking your login session. Try again in a moment.");
        return;
      }

      if (!session) {
        setLoginPromptOpen(true);
        return;
      }

      await confirmOrder();
    }
  }

  async function confirmOrder() {
    const activeDraft = checkoutDraft;
    if (!activeDraft) {
      setCheckoutError("Checkout order ID is missing, expired, or no longer matches this cart. Return to cart and click Proceed To Checkout again for a fresh 15-minute order ID.");
      setCheckoutStep("review");
      return;
    }

    setCheckoutStep("processing");
    setCheckoutFailureNeedsFreshDraft(false);
    setCheckoutStatusHint("PENDING");

    const paymentProof = await launchRazorpayCheckout(activeDraft.orderId, activeDraft.orderNumber);
    if (!paymentProof.ok) {
      if (paymentProof.kind === "failed") {
        const statusResult = await markDraftPaymentFailed(activeDraft.orderId, {
          eventType: "payment.failed",
          failureReason: paymentProof.message,
          razorpayOrderId: paymentProof.razorpayOrderId,
          razorpayPaymentId: paymentProof.razorpayPaymentId
        });
        if (statusResult.ok) {
          setCheckoutStatusHint(statusResult.status.paymentStatus);
          setCheckoutFailureNeedsFreshDraft(true);
          clearStoredDraftIdempotencyKey();
          clearStoredCheckoutDraft();
          setCheckoutError(`Payment failed. Backend status: ${statusResult.status.paymentStatus}. Click Try Payment Again to continue with a new checkout order ID.`);
        } else {
          setCheckoutStatusHint("FAILED");
          setCheckoutFailureNeedsFreshDraft(true);
          clearStoredDraftIdempotencyKey();
          clearStoredCheckoutDraft();
          setCheckoutError(`Payment failed. Backend status update could not be confirmed: ${statusResult.message}`);
        }
        setCheckoutStep("payment_failed");
        return;
      }

      if (paymentProof.kind === "interrupted") {
        setCheckoutStatusHint("PAYMENT_INCOMPLETE");
        setCheckoutFailureNeedsFreshDraft(false);
        setCheckoutError("Payment was interrupted by close/back. Please complete the payment to continue.");
        setCheckoutStep("payment_failed");
        return;
      }

      setCheckoutStatusHint("PENDING");
      setCheckoutFailureNeedsFreshDraft(false);
      setCheckoutError(paymentProof.message);
      setCheckoutStep("payment_failed");
      return;
    }

    const result = await placeCustomerOrder({
      acceptedTerms: checkoutForm.acceptedTerms,
      contact: {
        email: checkoutForm.email.trim().toLowerCase(),
        phone: checkoutForm.phone.trim()
      },
      deliveryMode: checkoutForm.deliveryMode.toUpperCase() as "STANDARD" | "EXPRESS" | "SAME_DAY",
      draftOrderId: activeDraft.orderId,
      lines: checkoutLinesPayload(checkoutItems),
      razorpayPayment: {
        orderId: paymentProof.razorpayOrderId,
        paymentId: paymentProof.razorpayPaymentId,
        signature: paymentProof.razorpaySignature
      },
      shippingAddress: {
        addressLine1: checkoutForm.addressLine1.trim(),
        addressLine2: checkoutForm.addressLine2.trim(),
        addressType: checkoutForm.addressType.toUpperCase() as "HOME" | "WORK" | "OTHER",
        city: checkoutForm.city.trim(),
        country: "India",
        fullName: checkoutForm.fullName.trim(),
        landmark: checkoutForm.landmark.trim(),
        phone: checkoutForm.phone.trim(),
        postalCode: checkoutForm.postalCode.trim(),
        state: checkoutForm.state.trim()
      }
    }, getOrCreateOrderIdempotencyKey(checkoutItems));

    if (result.ok) {
      setCheckoutStatusHint(result.order.paymentStatus);
      completeCheckoutSuccess(result.order);
      return;
    }

    if (result.status === 401) {
      setCheckoutStep("review");
      setLoginPromptOpen(true);
      return;
    }

    setCheckoutError(result.message);
    setCheckoutStatusHint("PENDING");
    setCheckoutStep("payment_failed");
  }

  async function handleCheckoutPaymentRetry() {
    setCheckoutError(null);

    if (!checkoutFailureNeedsFreshDraft) {
      await confirmOrder();
      return;
    }

    if (!session) {
      setLoginPromptOpen(true);
      setCheckoutStep("review");
      return;
    }

    setCheckoutStep("processing");
    setCheckoutStatusHint("PENDING");

    const result = await createCustomerOrderDraft({
      lines: checkoutLinesPayload(checkoutItems)
    }, getOrCreateDraftIdempotencyKey(checkoutItems));

    if (!result.ok) {
      if (result.status === 401) {
        setLoginPromptOpen(true);
      }
      setCheckoutError(result.message);
      setCheckoutStep("payment_failed");
      return;
    }

    writeStoredCheckoutDraft(result.draft, checkoutItems);
    setCheckoutFailureNeedsFreshDraft(false);
    router.replace(`/checkout?orderId=${encodeURIComponent(result.draft.orderId)}`);
    setCheckoutStep("review");
  }

  function completeCheckoutSuccess(order: CustomerOrderResponse) {
    setCompletedOrder({
      email: order.customerEmail,
      fulfillmentStatus: order.fulfillmentStatus,
      itemCount: cart.itemCount,
      orderNumber: order.orderNumber,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      placedAt: order.placedAt,
      statusEvents: order.statusEvents,
      totalLabel: formatPaise(asPriceInPaise(order.totalPaise))
    });
    window.localStorage.removeItem(CHECKOUT_STORAGE_KEY);
    window.localStorage.removeItem(CHECKOUT_IDEMPOTENCY_STORAGE_KEY);
    clearStoredCheckoutDraft();
    clearStoredCheckoutSelection();
    clearStoredDraftIdempotencyKey();
    cart.clearCart();
    setCheckoutStep("success");
  }

  async function launchRazorpayCheckout(
    draftOrderId: string,
    receipt: string
  ): Promise<RazorpayCheckoutLaunchResult> {
    const createOrderResult = await createRazorpayOrder({ draftOrderId });

    if (!createOrderResult.ok) {
      return { kind: "error", ok: false, message: createOrderResult.message };
    }

    if (createOrderResult.order.simulated === true) {
      return {
        ok: true,
        razorpayOrderId: createOrderResult.order.orderId,
        razorpayPaymentId: "pay_test_" + crypto.randomUUID(),
        // The backend skips signature verification for test customers, but the placement DTO enforces @NotBlank on signature.
        razorpaySignature: "sig_test_" + crypto.randomUUID()
      };
    }

    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim();
    if (!keyId) {
      return { kind: "error", ok: false, message: "Razorpay checkout is not configured for this frontend environment." };
    }

    const scriptLoaded = await ensureRazorpayCheckoutScriptLoaded();
    if (!scriptLoaded || typeof window === "undefined" || !window.Razorpay) {
      return { kind: "error", ok: false, message: "Could not load Razorpay checkout SDK. Please try again." };
    }
    const RazorpayCheckout = window.Razorpay;

    return new Promise((resolve) => {
      let settled = false;
      const timeoutId = window.setTimeout(() => {
        settle({ kind: "error", message: "Payment confirmation timed out. Please try payment again.", ok: false });
      }, RAZORPAY_RESULT_TIMEOUT_MS);

      const settle = (value: RazorpayCheckoutLaunchResult) => {
        if (settled) {
          return;
        }
        settled = true;
        window.clearTimeout(timeoutId);
        resolve(value);
      };

      const razorpay = new RazorpayCheckout({
        amount: createOrderResult.order.amount,
        currency: createOrderResult.order.currency,
        description: `Order ${receipt}`,
        handler: async (payload) => {
          const verification = await verifyRazorpayPayment({
            razorpayOrderId: payload.razorpay_order_id,
            razorpayPaymentId: payload.razorpay_payment_id,
            razorpaySignature: payload.razorpay_signature
          });

          if (!verification.ok) {
            settle({ kind: "error", message: verification.message, ok: false });
            return;
          }

          settle({
            ok: true,
            razorpayOrderId: payload.razorpay_order_id,
            razorpayPaymentId: payload.razorpay_payment_id,
            razorpaySignature: payload.razorpay_signature
          });
        },
        key: keyId,
        modal: {
          ondismiss: () => {
            settle({ kind: "interrupted", message: "Razorpay checkout was closed before payment confirmation.", ok: false });
          }
        },
        name: "SHRESTA EXCLUSIVE",
        notes: {
          orderNumber: receipt
        },
        order_id: createOrderResult.order.orderId,
        prefill: {
          contact: checkoutForm.phone.trim(),
          email: checkoutForm.email.trim().toLowerCase(),
          name: checkoutForm.fullName.trim()
        },
        theme: {
          color: "#d4af37"
        }
      });

      razorpay.on("payment.failed", (payload) => {
        const details = payload.error?.description
          ?? payload.error?.reason
          ?? payload.error?.step
          ?? payload.error?.source
          ?? null;
        settle({
          kind: "failed",
          ok: false,
          razorpayOrderId: payload.error?.metadata?.order_id,
          razorpayPaymentId: payload.error?.metadata?.payment_id,
          message: details
            ? `Razorpay payment failed: ${details}.`
            : "Razorpay payment failed. Please try again."
        });
      });

      try {
        razorpay.open();
      } catch {
        settle({ kind: "error", message: "Could not open Razorpay checkout modal. Please try again.", ok: false });
      }
    });
  }

  function handleCheckoutQuantityChange(productId: string, quantity: number) {
    clearStoredCheckoutDraft();
    clearStoredDraftIdempotencyKey();
    const item = items.find((entry) => entry.product.id === productId);
    const maxQuantity = item?.product.stockQuantity;
    if ((maxQuantity ?? 1) <= 0) {
      cart.removeItem(productId);
      return;
    }
    cart.updateQuantity(productId, quantity, maxQuantity);
  }

  function handleCheckoutLineRemove(productId: string) {
    clearStoredCheckoutDraft();
    clearStoredDraftIdempotencyKey();
    cart.removeItem(productId);
  }

  return (
    <StorefrontPageChrome home={home}>
      <CommerceHero
        eyebrow="Checkout"
        metric={session ? "Profile verified" : "Login before payment"}
        title="Review & Secure Checkout"
      />

      <section className="bg-[var(--shresta-logo-bg)] px-4 py-10 sm:px-6 lg:py-14">
        {checkoutStep === "processing" ? (
          <CheckoutProcessingState statusHint={checkoutStatusHint} />
        ) : checkoutStep === "success" && completedOrder ? (
          <CheckoutSuccessState order={completedOrder} />
        ) : checkoutStep === "payment_failed" ? (
          <CheckoutPaymentFailedState
            ctaLabel={checkoutFailureNeedsFreshDraft ? "Try Payment Again" : "Complete Payment"}
            message={checkoutError ?? "Payment was not confirmed."}
            statusHint={checkoutStatusHint}
            onRetry={handleCheckoutPaymentRetry}
          />
        ) : checkoutItems.length === 0 ? (
          <EmptyCommerceState
            ctaHref="/cart"
            ctaLabel="View Cart"
            description="Add products before continuing into checkout review."
            icon="cart"
            title="No checkout items"
          />
        ) : (
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="space-y-5">
              <CheckoutStepper currentStep={checkoutStep} />
              <CheckoutPanel
                description="Fill delivery details, choose fulfillment, and review your order. Login is required only at the final confirm-and-pay step."
                icon={checkoutPanelIcon(checkoutStep)}
                title={checkoutPanelTitle(checkoutStep)}
              >
                {checkoutStep === "details" ? (
                  <CheckoutDetailsForm form={checkoutForm} onChange={updateCheckoutForm} />
                ) : null}
                {checkoutStep === "delivery" ? (
                  <CheckoutDeliveryStep form={checkoutForm} onBack={() => goToCheckoutStep("details")} onChange={updateCheckoutForm} subtotalPaise={totals.subtotalPaise} />
                ) : null}
                {checkoutStep === "review" ? (
                  <CheckoutReviewStep
                    draft={checkoutDraft}
                    form={checkoutForm}
                    items={checkoutItems}
                    onBack={() => goToCheckoutStep("delivery")}
                    onChange={updateCheckoutForm}
                    onEdit={goToCheckoutStep}
                    sessionEmail={session?.identityEmail ?? null}
                    totals={checkoutTotals}
                  />
                ) : null}
                {checkoutError ? (
                  <div className="mt-5 rounded-lg border border-rose-400/35 bg-rose-100 px-3 py-2 text-sm leading-6 text-rose-700">
                    {checkoutError}
                  </div>
                ) : null}
                {inventoryNotice ? (
                  <div className="mt-5 rounded-lg border border-amber-400/35 bg-amber-500/10 px-3 py-2 text-sm leading-6 text-amber-200">
                    {inventoryNotice}
                  </div>
                ) : null}
              </CheckoutPanel>
              <CheckoutPanel
                description="Review your selected products, quantities, and delivery details before placing the order."
                icon={Package}
                title="Order Items"
              >
                <div className="divide-y divide-[var(--shresta-logo-border)]">
                  {checkoutItems.map((item) => (
                    <CartLineRow
                      compact
                      item={item}
                      key={item.product.id}
                      onRemove={() => handleCheckoutLineRemove(item.product.id)}
                      onUpdateQuantity={(quantity) => handleCheckoutQuantityChange(item.product.id, quantity)}
                    />
                  ))}
                </div>
              </CheckoutPanel>
            </div>

            <CartSummaryPanel
              ctaLabel={checkoutCtaLabel(checkoutStep, Boolean(session), profileLoading)}
              disabled={profileLoading && checkoutStep === "review"}
              disabledReason={profileLoading && checkoutStep === "review" ? "We are validating your login before final confirmation. Please wait." : undefined}
              itemCount={checkoutItems.reduce((total, item) => total + item.line.quantity, 0)}
              locked={isFinalLoginLocked}
              onCtaClick={handleCheckoutCta}
              totals={checkoutTotals}
            />
          </div>
        )}
      </section>
      {loginPromptOpen ? <LoginRequiredDialog onClose={() => setLoginPromptOpen(false)} /> : null}
    </StorefrontPageChrome>
  );
}

function CommerceHero({
  description,
  eyebrow,
  metric,
  title
}: {
  description?: string;
  eyebrow: string;
  metric: string;
  title: string;
}) {
  return (
    <section className="border-b border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] px-4 py-10 sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold-400)]">{eyebrow}</p>
          <h1 className="mt-3 font-serif text-4xl font-light text-[var(--shresta-logo-text)] md:text-5xl">{title}</h1>
          {description ? <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--shresta-logo-muted)]">{description}</p> : null}
        </div>
        <div className="w-fit rounded-full border border-[var(--gold-500)] bg-[rgba(212,175,55,0.12)] px-5 py-2 text-sm font-semibold text-[var(--gold-600)]">
          {metric}
        </div>
      </div>
    </section>
  );
}

function CartLineRow({
  compact = false,
  item,
  selected,
  onToggleSelect,
  onRemove,
  onUpdateQuantity
}: {
  compact?: boolean;
  item: CartProductLine;
  selected?: boolean;
  onToggleSelect?: () => void;
  onRemove: () => void;
  onUpdateQuantity: (quantity: number) => void;
}) {
  const { line, product } = item;
  const unitPrice = formatPaise(asPriceInPaise(product.pricePaise));
  const linePrice = formatPaise(asPriceInPaise(product.pricePaise * line.quantity));
  const hasStockLimit = product.stockQuantity > 0;
  const isAtStockLimit = hasStockLimit && line.quantity >= product.stockQuantity;

  return (
    <article className={compact ? "flex gap-4 py-4" : "flex flex-col gap-4 py-5 sm:flex-row"}>
      {onToggleSelect ? (
        <label className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center">
          <input
            checked={Boolean(selected)}
            className="h-4 w-4 rounded border-[var(--shresta-logo-border)]"
            onClick={onToggleSelect}
            readOnly
            type="checkbox"
          />
        </label>
      ) : null}
      <Link className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)]" href={`/products/${product.slug}`} prefetch={false}>
        <ResponsiveMedia className="h-full w-full object-cover transition duration-300 hover:scale-105" media={product.image} sizes="96px" />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link className="line-clamp-2 font-medium text-[var(--shresta-logo-text)] transition hover:text-[var(--gold-400)]" href={`/products/${product.slug}`} prefetch={false}>
              {product.name}
            </Link>
            <p className="mt-1 text-xs text-[var(--shresta-logo-muted)]">{product.sku} - {enumDisplayLabel(product.productType)}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {product.badges.slice(0, 2).map((badge) => (
                <span className="rounded-full bg-[rgba(212,175,55,0.12)] px-2.5 py-1 text-xs font-semibold text-[var(--gold-600)]" key={badge}>
                  {enumDisplayLabel(badge)}
                </span>
              ))}
            </div>
          </div>
          <button
            aria-label={`Remove ${product.name} from cart`}
            className="rounded-full p-2 text-[var(--shresta-logo-muted)] transition hover:bg-rose-500/10 hover:text-rose-300"
            onClick={onRemove}
            type="button"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <QuantityStepper
            disableDecrease={line.quantity <= 1}
            disableDecreaseReason="Quantity cannot go below 1."
            onDecrease={() => onUpdateQuantity(Math.max(1, line.quantity - 1))}
            onIncrease={() => onUpdateQuantity(line.quantity + 1)}
            quantity={line.quantity}
            disableIncrease={isAtStockLimit}
            disableIncreaseReason={isAtStockLimit ? `Maximum available quantity (${product.stockQuantity}) is already in your cart.` : undefined}
          />
          <div className="text-right">
            <p className="font-semibold text-[var(--shresta-logo-text)]">{linePrice}</p>
            {line.quantity > 1 ? <p className="text-xs text-[var(--shresta-logo-muted)]">{unitPrice} each</p> : null}
            {isAtStockLimit ? <p className="text-xs font-medium text-amber-600">Stock limit reached</p> : null}
          </div>
        </div>
      </div>
    </article>
  );
}

function QuantityStepper({
  disableDecrease = false,
  disableDecreaseReason,
  disableIncrease = false,
  disableIncreaseReason,
  onDecrease,
  onIncrease,
  quantity
}: {
  disableDecrease?: boolean;
  disableDecreaseReason?: string;
  disableIncrease?: boolean;
  disableIncreaseReason?: string;
  onDecrease: () => void;
  onIncrease: () => void;
  quantity: number;
}) {
  const disabledReason = disableIncrease
    ? disableIncreaseReason
    : disableDecrease
      ? disableDecreaseReason
      : undefined;

  return (
    <div className="inline-flex flex-col items-start">
      <div className="inline-flex overflow-hidden rounded-lg border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)]">
        <button aria-label="Decrease quantity" className="flex h-9 w-9 items-center justify-center text-[var(--shresta-logo-muted)] transition hover:bg-[var(--shresta-logo-surface)]" disabled={disableDecrease} onClick={onDecrease} title={disableDecrease ? disableDecreaseReason : undefined} type="button">
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="flex h-9 w-11 items-center justify-center border-x border-[var(--shresta-logo-border)] text-sm font-semibold text-[var(--shresta-logo-text)]">{quantity}</span>
        <button aria-label="Increase quantity" className="flex h-9 w-9 items-center justify-center text-[var(--shresta-logo-muted)] transition hover:bg-[var(--shresta-logo-surface)]" disabled={disableIncrease} onClick={onIncrease} title={disableIncrease ? disableIncreaseReason : undefined} type="button">
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
      {disabledReason ? (
        <p className="mt-1 max-w-[22rem] text-xs font-medium text-[var(--shresta-logo-muted)]">{disabledReason}</p>
      ) : null}
    </div>
  );
}

function CartSummaryPanel({
  ctaHref,
  ctaLabel,
  disabled = false,
  disabledReason,
  itemCount,
  locked = false,
  lockedMessage = "Login happens here, just before final order confirmation and payment.",
  onCtaClick,
  totals
}: {
  ctaHref?: string;
  ctaLabel: string;
  disabled?: boolean;
  disabledReason?: string;
  itemCount: number;
  locked?: boolean;
  lockedMessage?: string;
  onCtaClick?: () => void;
  totals: ReturnType<typeof calculateCartTotals>;
}) {
  const freeDeliveryUnlocked = totals.subtotalPaise >= FREE_DELIVERY_THRESHOLD_PAISE;

  return (
    <aside className="h-fit rounded-2xl border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.26)] lg:sticky lg:top-24">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[rgba(212,175,55,0.12)] text-[var(--gold-600)]">
          {locked ? <Lock className="h-5 w-5" /> : <ShoppingBag className="h-5 w-5" />}
        </div>
        <div>
          <h2 className="font-serif text-2xl font-light text-[var(--shresta-logo-text)]">Order Summary</h2>
          <p className="text-sm text-[var(--shresta-logo-muted)]">{itemCount} item{itemCount === 1 ? "" : "s"}</p>
        </div>
      </div>

      <div className="mt-6 space-y-3 text-sm">
        <SummaryRow label="Estimated subtotal" value={formatPaise(asPriceInPaise(totals.subtotalPaise))} />
        <SummaryRow label="Delivery" value={totals.deliveryPaise === 0 ? "FREE" : formatPaise(asPriceInPaise(totals.deliveryPaise))} valueClassName={totals.deliveryPaise === 0 ? "text-emerald-700" : undefined} />
        <SummaryRow label="Taxes" value="Included" />
        <div className="border-t border-[var(--shresta-logo-border)] pt-3">
          <SummaryRow strong label="Estimated total" value={formatPaise(asPriceInPaise(totals.totalPaise))} />
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] p-4">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[var(--shresta-logo-muted)]">
          <Truck className={freeDeliveryUnlocked ? "h-4 w-4 text-emerald-700" : "h-4 w-4 text-[var(--gold-400)]"} />
          {freeDeliveryUnlocked ? "Free delivery unlocked" : `${formatPaise(asPriceInPaise(totals.freeDeliveryRemainingPaise))} more for free delivery`}
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--shresta-logo-surface)]">
          <div className={freeDeliveryUnlocked ? "h-full rounded-full bg-emerald-400" : "h-full rounded-full bg-[var(--gold-500)]"} style={{ width: `${totals.freeDeliveryProgress}%` }} />
        </div>
      </div>

      {onCtaClick ? (
        <button
          className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(90deg,var(--gold-500),var(--gold-600))] px-5 text-sm font-extrabold text-[var(--wine-950)] shadow-[0_16px_38px_rgba(212,175,55,0.24)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
          disabled={disabled}
          onClick={onCtaClick}
          title={disabled ? disabledReason : undefined}
          type="button"
        >
          {ctaLabel}
          <ArrowRight className="h-4 w-4" />
        </button>
      ) : ctaHref ? (
        <Link className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(90deg,var(--gold-500),var(--gold-600))] px-5 text-sm font-extrabold text-[var(--wine-950)] shadow-[0_16px_38px_rgba(212,175,55,0.24)] transition hover:-translate-y-0.5" href={ctaHref} prefetch={false}>
          {ctaLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>
      ) : null}
      {locked ? (
        <p className="mt-3 text-center text-xs leading-5 text-[var(--shresta-logo-muted)]">
          {lockedMessage}
        </p>
      ) : null}
      {disabled && disabledReason ? (
        <p className="mt-2 text-center text-xs font-medium text-[var(--shresta-logo-muted)]">{disabledReason}</p>
      ) : null}
    </aside>
  );
}

function LoginRequiredDialog({
  description = "Your cart will stay as it is. Continue browsing now, or login and return to checkout to confirm and pay.",
  loginHref = "/login?next=/checkout",
  onClose,
  title = "Sign in to place your order"
}: {
  description?: string;
  loginHref?: string;
  onClose: () => void;
  title?: string;
}) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <section aria-modal="true" className="w-full max-w-md rounded-2xl border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] p-6 text-center shadow-[0_28px_90px_rgba(0,0,0,0.48)]" role="dialog">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[var(--gold-500)] bg-[rgba(212,175,55,0.12)] text-[var(--gold-600)]">
          <Lock className="h-7 w-7" />
        </div>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold-400)]">Login Required</p>
        <h2 className="mt-2 font-serif text-3xl font-light text-[var(--shresta-logo-text)]">{title}</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--shresta-logo-muted)]">
          {description}
        </p>
        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--shresta-logo-border)] px-5 text-sm font-bold text-[var(--shresta-logo-text)] transition hover:border-[var(--gold-500)] hover:text-[var(--gold-600)]"
            href="/products"
            onClick={onClose}
            prefetch={false}
          >
            Continue Shopping
          </Link>
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--gold-500)] px-5 text-sm font-extrabold text-[var(--wine-950)] transition hover:bg-[var(--gold-600)]"
            href={loginHref}
            prefetch={false}
          >
            Login
          </Link>
        </div>
        <button className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--shresta-logo-muted)] hover:text-[var(--shresta-logo-text)]" onClick={onClose} type="button">
          Close
        </button>
      </section>
    </div>
  );
}

function SummaryRow({
  label,
  strong = false,
  value,
  valueClassName
}: {
  label: string;
  strong?: boolean;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className={strong ? "font-semibold text-[var(--shresta-logo-text)]" : "text-[var(--shresta-logo-muted)]"}>{label}</span>
      <span className={valueClassName ?? (strong ? "text-lg font-bold text-[var(--shresta-logo-text)]" : "font-semibold text-[var(--shresta-logo-text)]")}>{value}</span>
    </div>
  );
}

function WishlistProductCard({
  cartQuantity,
  onAddToCart,
  onDecreaseCartQuantity,
  onIncreaseCartQuantity,
  onRemove,
  product
}: {
  cartQuantity: number;
  onAddToCart: () => void;
  onDecreaseCartQuantity: () => void;
  onIncreaseCartQuantity: () => void;
  onRemove: () => void;
  product: ProductCard;
}) {
  const isOutOfStock = product.stockQuantity <= 0;
  const isAtStockLimit = product.stockQuantity > 0 && cartQuantity >= product.stockQuantity;
  const [addedPulse, setAddedPulse] = useState(false);

  return (
    <article className="group rounded-xl border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.2)] transition hover:-translate-y-1 hover:border-[rgba(212,175,55,0.36)]">
      <div className="relative aspect-square overflow-hidden rounded-lg border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)]">
        <Link href={`/products/${product.slug}`} prefetch={false}>
          <ResponsiveMedia className="h-full w-full object-cover transition duration-500 group-hover:scale-105" media={product.image} sizes="(max-width: 640px) 92vw, 25vw" />
        </Link>
        <button
          aria-label={`Remove ${product.name} from wishlist`}
          className="absolute right-2 top-2 rounded-full bg-[var(--shresta-logo-surface)] p-2 text-rose-300 opacity-100 shadow-lg backdrop-blur transition hover:bg-rose-500/20 sm:opacity-0 sm:group-hover:opacity-100"
          onClick={onRemove}
          type="button"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-4">
        <Link href={`/products/${product.slug}`} prefetch={false}>
          <h3 className="line-clamp-2 min-h-10 text-sm font-medium leading-5 text-[var(--shresta-logo-text)] transition hover:text-[var(--gold-400)]">{product.name}</h3>
        </Link>
        <p className="mt-1 text-xs text-[var(--shresta-logo-muted)]">{product.sku} - {enumDisplayLabel(product.productType)}</p>
        <p className="mt-3 text-lg font-semibold text-[var(--shresta-logo-text)]">{formatPaise(asPriceInPaise(product.pricePaise))}</p>
        {isOutOfStock ? <p className="mt-1 text-xs font-semibold text-rose-700">Out of Stock</p> : null}
        {isOutOfStock ? (
          <button
            className="mt-4 inline-flex min-h-11 w-full cursor-not-allowed items-center justify-center gap-2 rounded-full bg-[var(--gold-500)] px-4 text-sm font-bold text-[var(--wine-950)] opacity-55"
            disabled
            title="This product is currently out of stock."
            type="button"
          >
            <ShoppingBag className="h-4 w-4" />
            Out of Stock
          </button>
        ) : cartQuantity <= 0 ? (
          <button
            className={`mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full px-4 text-sm font-bold transition ${addedPulse ? "border border-emerald-400 bg-emerald-500/20 text-emerald-200" : "bg-[var(--gold-500)] text-[var(--wine-950)] hover:bg-[var(--gold-600)]"}`}
            onClick={() => {
              onAddToCart();
              setAddedPulse(true);
              window.setTimeout(() => setAddedPulse(false), 900);
            }}
            type="button"
          >
            <ShoppingBag className="h-4 w-4" />
            {addedPulse ? "Added" : "Add to Cart"}
          </button>
        ) : (
          <div className="mt-4 flex min-h-11 w-full items-center justify-between rounded-full border border-[var(--gold-500)] bg-[rgba(212,175,55,0.15)] px-2">
            <button aria-label="Decrease cart quantity" className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--gold-600)] hover:bg-[rgba(212,175,55,0.24)]" onClick={onDecreaseCartQuantity} type="button">
              <Minus className="h-4 w-4" />
            </button>
            <span className="text-sm font-bold text-[var(--shresta-logo-text)]">{cartQuantity}</span>
            <button aria-label="Increase cart quantity" className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--gold-600)] hover:bg-[rgba(212,175,55,0.24)] disabled:opacity-40" disabled={isAtStockLimit} onClick={onIncreaseCartQuantity} title={isAtStockLimit ? `Maximum available quantity (${product.stockQuantity}) is already in your cart.` : undefined} type="button">
              <Plus className="h-4 w-4" />
            </button>
          </div>
        )}
        {isAtStockLimit ? (
          <p className="mt-2 text-xs font-medium text-amber-600">Maximum available quantity ({product.stockQuantity}) is already in your cart.</p>
        ) : null}
      </div>
    </article>
  );
}

function CheckoutStepper({ currentStep }: { currentStep: CheckoutJourneyStep }) {
  const stepOrder: CheckoutJourneyStep[] = ["details", "delivery", "review"];
  const currentIndex = Math.max(0, stepOrder.indexOf(currentStep));
  const steps = [
    { key: "details", label: "Details" },
    { key: "delivery", label: "Delivery" },
    { key: "review", label: "Confirm" }
  ] as const;

  return (
    <div className="rounded-2xl border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] p-5">
      <div className="grid gap-3 sm:grid-cols-3">
        {steps.map((step, index) => (
          <div className="flex items-center gap-3" key={step.label}>
            <div className={index < currentIndex ? "flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-[var(--wine-950)]" : index === currentIndex ? "flex h-9 w-9 items-center justify-center rounded-full bg-[var(--gold-500)] text-[var(--wine-950)]" : "flex h-9 w-9 items-center justify-center rounded-full border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] text-[var(--shresta-logo-muted)]"}>
              {index < currentIndex ? <Check className="h-4 w-4" /> : renderCheckoutStepIcon(step.key)}
            </div>
            <div>
              <p className={index > currentIndex ? "text-sm font-semibold text-[var(--shresta-logo-muted)]" : "text-sm font-semibold text-[var(--shresta-logo-text)]"}>{step.label}</p>
              <p className="text-[0.65rem] uppercase tracking-[0.12em] text-[var(--shresta-logo-muted)]">{index < currentIndex ? "complete" : index === currentIndex ? "active" : "locked"}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function renderCheckoutStepIcon(step: CheckoutJourneyStep) {
  switch (step) {
    case "details":
      return <ShieldCheck className="h-4 w-4" />;
    case "delivery":
      return <Truck className="h-4 w-4" />;
    case "review":
      return <CheckCircle2 className="h-4 w-4" />;
    default:
      return <ShoppingBag className="h-4 w-4" />;
  }
}

function CheckoutPanel({
  children,
  description,
  icon: Icon,
  title
}: {
  children: ReactNode;
  description: string;
  icon: LucideIcon;
  title: string;
}) {
  return (
    <section className="rounded-2xl border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.22)]">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgba(212,175,55,0.12)] text-[var(--gold-600)]">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-serif text-2xl font-light text-[var(--shresta-logo-text)]">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--shresta-logo-muted)]">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function CheckoutField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--shresta-logo-muted)]">{label}</p>
      <p className="mt-2 text-sm font-semibold text-[var(--shresta-logo-text)]">{value}</p>
    </div>
  );
}

function EmptyCommerceState({
  ctaHref,
  ctaLabel,
  description,
  icon,
  title
}: {
  ctaHref: string;
  ctaLabel: string;
  description: string;
  icon: "cart" | "wishlist";
  title: string;
}) {
  const Icon = icon === "cart" ? ShoppingBag : Heart;

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] px-6 py-12 text-center shadow-[0_22px_70px_rgba(0,0,0,0.26)]">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-[var(--gold-500)] bg-[rgba(212,175,55,0.12)] text-[var(--gold-600)]">
        <Icon className="h-9 w-9" />
      </div>
      <h2 className="mt-6 font-serif text-3xl font-light text-[var(--shresta-logo-text)]">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-[var(--shresta-logo-muted)]">{description}</p>
      <Link className="mt-7 inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--gold-500)] px-6 text-sm font-bold text-[var(--wine-950)] transition hover:bg-[var(--gold-600)]" href={ctaHref} prefetch={false}>
        {ctaLabel}
      </Link>
    </div>
  );
}

function CheckoutDetailsForm({ form, onChange }: { form: CheckoutFormState; onChange: (patch: Partial<CheckoutFormState>) => void }) {
  const [touchedFields, setTouchedFields] = useState<Partial<Record<CheckoutDetailField, boolean>>>({});
  const [focusedField, setFocusedField] = useState<CheckoutDetailField | null>(null);
  const pincodeMatch = PINCODE_AUTOFILL[form.postalCode];

  useEffect(() => {
    if (pincodeMatch && (form.city !== pincodeMatch.city || form.state !== pincodeMatch.state)) {
      onChange({ city: pincodeMatch.city, state: pincodeMatch.state });
    }
  }, [form.city, form.state, onChange, pincodeMatch]);

  function markTouched(field: CheckoutDetailField) {
    setTouchedFields((current) => (current[field] ? current : { ...current, [field]: true }));
  }

  function handleFieldFocus(field: CheckoutDetailField) {
    if (focusedField && focusedField !== field) {
      markTouched(focusedField);
    }
    setFocusedField(field);
  }

  function handleFieldBlur(field: CheckoutDetailField) {
    markTouched(field);
    setFocusedField((current) => (current === field ? null : current));
  }

  function fieldError(field: CheckoutDetailField) {
    return touchedFields[field] ? validateCheckoutDetailField(field, form) : null;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <CheckoutInput autoComplete="email" error={fieldError("email")} inputMode="email" label="Email" name="checkout-email" onBlur={() => handleFieldBlur("email")} onChange={(value) => onChange({ email: value.trimStart() })} onFocus={() => handleFieldFocus("email")} pattern={INPUT_PATTERNS.email} title={INPUT_PATTERN_TITLES.email} type="email" value={form.email} />
      <CheckoutPhoneInput error={fieldError("phone")} onBlur={() => handleFieldBlur("phone")} onChange={(value) => onChange({ phone: value.replace(/\D/g, "").slice(0, 10) })} onFocus={() => handleFieldFocus("phone")} value={form.phone} />
      <CheckoutInput autoComplete="name" error={fieldError("fullName")} label="Full name" name="checkout-name" onBlur={() => handleFieldBlur("fullName")} onChange={(value) => onChange({ fullName: value })} onFocus={() => handleFieldFocus("fullName")} pattern={INPUT_PATTERNS.personName} title={INPUT_PATTERN_TITLES.personName} value={form.fullName} />
      <CheckoutInput autoComplete="postal-code" error={fieldError("postalCode")} inputMode="numeric" label="PIN code" maxLength={6} name="checkout-pincode" onBlur={() => handleFieldBlur("postalCode")} onChange={(value) => onChange({ postalCode: value.replace(/\D/g, "").slice(0, 6) })} onFocus={() => handleFieldFocus("postalCode")} pattern={INPUT_PATTERNS.indianPinCode} title={INPUT_PATTERN_TITLES.indianPinCode} value={form.postalCode} />
      <CheckoutInput autoComplete="address-line1" className="md:col-span-2" error={fieldError("addressLine1")} label="Address line 1" name="checkout-address-1" onBlur={() => handleFieldBlur("addressLine1")} onChange={(value) => onChange({ addressLine1: value })} onFocus={() => handleFieldFocus("addressLine1")} pattern={INPUT_PATTERNS.addressLine} title={INPUT_PATTERN_TITLES.addressLine} value={form.addressLine1} />
      <CheckoutInput autoComplete="address-line2" className="md:col-span-2" error={fieldError("addressLine2")} label="Address line 2" name="checkout-address-2" onBlur={() => handleFieldBlur("addressLine2")} onChange={(value) => onChange({ addressLine2: value })} onFocus={() => handleFieldFocus("addressLine2")} pattern={INPUT_PATTERNS.optionalAddressLine} required={false} title={INPUT_PATTERN_TITLES.optionalAddressLine} value={form.addressLine2} />
      <CheckoutInput autoComplete="address-level2" error={fieldError("city")} label="City" name="checkout-city" onBlur={() => handleFieldBlur("city")} onChange={(value) => onChange({ city: value })} onFocus={() => handleFieldFocus("city")} pattern={INPUT_PATTERNS.cityOrState} readOnly={Boolean(pincodeMatch)} title={INPUT_PATTERN_TITLES.cityOrState} value={form.city} />
      <CheckoutInput autoComplete="address-level1" error={fieldError("state")} label="State" name="checkout-state" onBlur={() => handleFieldBlur("state")} onChange={(value) => onChange({ state: value })} onFocus={() => handleFieldFocus("state")} pattern={INPUT_PATTERNS.cityOrState} readOnly={Boolean(pincodeMatch)} title={INPUT_PATTERN_TITLES.cityOrState} value={form.state} />
      <CheckoutInput autoComplete="off" className="md:col-span-2" error={fieldError("landmark")} label="Landmark (optional)" name="checkout-landmark" onBlur={() => handleFieldBlur("landmark")} onChange={(value) => onChange({ landmark: value })} onFocus={() => handleFieldFocus("landmark")} pattern={INPUT_PATTERNS.optionalAddressLine} required={false} title={INPUT_PATTERN_TITLES.optionalAddressLine} value={form.landmark} />
      {pincodeMatch ? (
        <p className="md:col-span-2 rounded-lg border border-emerald-500/55 bg-emerald-100 px-3 py-2 text-sm font-bold text-emerald-950">
          City and state filled from PIN code: {pincodeMatch.city}, {pincodeMatch.state}.
        </p>
      ) : null}
      <div className="md:col-span-2">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--shresta-logo-muted)]">Address type</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {(["home", "work", "other"] as AddressType[]).map((type) => {
            const selected = form.addressType === type;
            const Icon = addressTypeIcon(type);
            return (
              <button
                className={selected ? "flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--gold-500)] bg-[rgba(212,175,55,0.16)] text-sm font-bold text-[var(--gold-600)]" : "flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] text-sm font-semibold text-[var(--shresta-logo-muted)] hover:border-[rgba(212,175,55,0.45)] hover:text-[var(--shresta-logo-text)]"}
                key={type}
                onClick={() => onChange({ addressType: type })}
                type="button"
              >
                <Icon className="h-4 w-4" />
                {enumDisplayLabel(type)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CheckoutDeliveryStep({
  form,
  onBack,
  onChange,
  subtotalPaise
}: {
  form: CheckoutFormState;
  onBack: () => void;
  onChange: (patch: Partial<CheckoutFormState>) => void;
  subtotalPaise: number;
}) {
  return (
    <div className="space-y-4">
      {DELIVERY_OPTIONS.map((option) => {
        const Icon = option.icon;
        const selected = form.deliveryMode === option.id;
        const pricePaise = option.id === "standard" && subtotalPaise >= FREE_DELIVERY_THRESHOLD_PAISE ? 0 : option.pricePaise;
        return (
          <button
            className={selected ? "flex w-full items-start gap-4 rounded-xl border border-[var(--gold-500)] bg-[rgba(212,175,55,0.14)] p-4 text-left" : "flex w-full items-start gap-4 rounded-xl border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] p-4 text-left transition hover:border-[rgba(212,175,55,0.36)]"}
            key={option.id}
            onClick={() => onChange({ deliveryMode: option.id })}
            type="button"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgba(212,175,55,0.12)] text-[var(--gold-600)]">
              <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-start justify-between gap-4">
                <span className="font-semibold text-[var(--shresta-logo-text)]">{option.name}</span>
                <span className="font-semibold text-[var(--gold-600)]">{pricePaise === 0 ? "FREE" : formatPaise(asPriceInPaise(pricePaise))}</span>
              </span>
              <span className="mt-1 block text-sm leading-6 text-[var(--shresta-logo-muted)]">{option.description}</span>
              <span className="mt-1 block text-xs font-bold uppercase tracking-[0.12em] text-[var(--shresta-logo-muted)]">{option.estimatedDays}</span>
            </span>
          </button>
        );
      })}
      <CheckoutBackButton onBack={onBack} />
    </div>
  );
}

function CheckoutReviewStep({
  draft,
  form,
  items,
  onBack,
  onChange,
  onEdit,
  sessionEmail,
  totals
}: {
  draft: StoredCheckoutDraft | null;
  form: CheckoutFormState;
  items: CartProductLine[];
  onBack: () => void;
  onChange: (patch: Partial<CheckoutFormState>) => void;
  onEdit: (step: CheckoutJourneyStep) => void;
  sessionEmail: string | null;
  totals: ReturnType<typeof calculateCartTotals>;
}) {
  return (
    <div className="space-y-4">
      <ReviewBlock icon={MapPin} onEdit={() => onEdit("details")} title="Delivery address">
        <p className="font-semibold text-[var(--shresta-logo-text)]">{form.fullName}</p>
        <p>{form.addressLine1}{form.addressLine2 ? `, ${form.addressLine2}` : ""}</p>
        <p>{form.city}, {form.state} {form.postalCode}</p>
        <p>+91 {form.phone} - {form.email}</p>
      </ReviewBlock>
      <ReviewBlock icon={Truck} onEdit={() => onEdit("delivery")} title="Delivery mode">
        <p className="font-semibold text-[var(--shresta-logo-text)]">{deliveryLabel(form.deliveryMode)}</p>
        <p>{totals.deliveryPaise === 0 ? "Free delivery applied" : `${formatPaise(asPriceInPaise(totals.deliveryPaise))} delivery charge`}</p>
      </ReviewBlock>
      <ReviewBlock icon={Lock} title="Razorpay checkout">
        <p className="font-semibold text-[var(--shresta-logo-text)]">All supported Razorpay methods are enabled at payment.</p>
        <p>{sessionEmail ? `Logged in as ${sessionEmail}` : "Login required before final confirmation"}</p>
      </ReviewBlock>
      <ReviewBlock icon={Lock} title="Checkout order ID">
        {draft ? (
          <>
            <p className="font-semibold text-[var(--shresta-logo-text)]">{draft.orderNumber}</p>
            <p>Valid until {formatDraftExpiry(draft.expiresAt)}. Cart changes require a fresh order ID.</p>
          </>
        ) : (
          <>
            <p className="font-semibold text-[var(--shresta-logo-text)]">Not created for this cart</p>
            <p>Return to cart and click Proceed To Checkout to create a 15-minute checkout order ID.</p>
          </>
        )}
      </ReviewBlock>
      <div className="rounded-xl border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] p-4">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--shresta-logo-muted)]">Final order</p>
        <div className="mt-3 space-y-2 text-sm">
          <SummaryRow label={`${items.length} product line${items.length === 1 ? "" : "s"}`} value={formatPaise(asPriceInPaise(totals.subtotalPaise))} />
          <SummaryRow label="Delivery" value={totals.deliveryPaise === 0 ? "FREE" : formatPaise(asPriceInPaise(totals.deliveryPaise))} />
          <SummaryRow strong label="Total" value={formatPaise(asPriceInPaise(totals.totalPaise))} />
        </div>
        <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm leading-6 text-[var(--shresta-logo-muted)]">
          <input
            checked={form.acceptedTerms}
            className="mt-1 h-4 w-4 accent-[var(--gold-500)]"
            onChange={(event) => onChange({ acceptedTerms: event.target.checked })}
            type="checkbox"
          />
          <span>I confirm the delivery details and product list for this SHRESTA order.</span>
        </label>
      </div>
      <CheckoutBackButton onBack={onBack} />
    </div>
  );
}

function ReviewBlock({ children, icon: Icon, onEdit, title }: { children: ReactNode; icon: LucideIcon; onEdit?: () => void; title: string }) {
  return (
    <section className="rounded-xl border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] p-4 text-sm leading-6 text-[var(--shresta-logo-muted)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-[var(--gold-600)]" />
          <p className="font-semibold text-[var(--shresta-logo-text)]">{title}</p>
        </div>
        {onEdit ? (
          <button className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold-600)] hover:text-[var(--gold-500)]" onClick={onEdit} type="button">
            <Pencil className="h-3 w-3" />
            Edit
          </button>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function CheckoutProcessingState({ statusHint }: { statusHint?: string | null }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center rounded-2xl border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] px-6 py-12 text-center">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-[var(--shresta-logo-border)] border-t-[var(--gold-500)]" />
      <h2 className="mt-6 font-serif text-3xl font-light text-[var(--shresta-logo-text)]">Waiting for payment confirmation</h2>
      <p className="mt-3 text-sm leading-6 text-[var(--shresta-logo-muted)]">Do not close this page while we verify Razorpay payment and finalize your order.</p>
      {statusHint ? (
        <p className="mt-3 rounded-full border border-[var(--shresta-logo-border)] px-3 py-1 text-xs font-semibold tracking-[0.08em] text-[var(--shresta-logo-muted)]">
          Backend status: {statusHint}
        </p>
      ) : null}
    </div>
  );
}

function CheckoutSuccessState({ order }: { order: CompletedOrder }) {
  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-[rgba(34,197,94,0.32)] bg-[var(--shresta-logo-surface)] p-6 text-center shadow-[0_22px_70px_rgba(0,0,0,0.28)]">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700">
        <CheckCircle2 className="h-8 w-8" />
      </div>
      <h2 className="mt-5 font-serif text-3xl font-light text-[var(--shresta-logo-text)]">Order placed</h2>
      <p className="mt-2 text-sm text-[var(--shresta-logo-muted)]">Order {order.orderNumber} is saved for {order.email}.</p>
      <div className="mt-5 grid gap-3 text-left sm:grid-cols-3">
        <CheckoutField label="Order" value={order.orderStatus} />
        <CheckoutField label="Payment" value={order.paymentStatus} />
        <CheckoutField label="Fulfillment" value={order.fulfillmentStatus} />
      </div>
      <div className="mt-5 rounded-xl border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] p-4 text-left">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--shresta-logo-muted)]">Status history</p>
        <div className="mt-3 space-y-2">
          {order.statusEvents.map((event) => (
            <div className="flex items-center justify-between gap-3 text-sm" key={`${event.eventType}-${event.toStatus}-${event.createdAt}`}>
              <span className="text-[var(--shresta-logo-muted)]">{enumDisplayLabel(event.eventType)}</span>
              <span className="font-semibold text-[var(--shresta-logo-text)]">{event.toStatus}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-5 text-lg font-bold text-[var(--shresta-logo-text)]">{order.totalLabel}</p>
      <Link className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--gold-500)] px-6 text-sm font-bold text-[var(--wine-950)]" href="/products" prefetch={false}>
        Continue Shopping
      </Link>
    </div>
  );
}

function CheckoutPaymentFailedState({
  ctaLabel,
  message,
  onRetry,
  statusHint
}: {
  ctaLabel: string;
  message: string;
  onRetry: () => void;
  statusHint?: string | null;
}) {
  const isInterrupted = statusHint === "PAYMENT_INCOMPLETE";
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-rose-400/30 bg-[var(--shresta-logo-surface)] p-6 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/15 text-rose-700">
        <AlertCircle className="h-8 w-8" />
      </div>
      <h2 className="mt-5 font-serif text-3xl font-light text-[var(--shresta-logo-text)]">{isInterrupted ? "Payment incomplete" : "Payment failed"}</h2>
      <p className="mt-3 text-sm leading-6 text-[var(--shresta-logo-muted)]">{message}</p>
      {!isInterrupted && statusHint ? (
        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--shresta-logo-muted)]">Backend status: {statusHint}</p>
      ) : null}
      <button className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[var(--gold-500)] px-6 text-sm font-bold text-[var(--gold-600)]" onClick={onRetry} type="button">
        <RefreshCw className="h-4 w-4" />
        {ctaLabel}
      </button>
    </div>
  );
}

function CheckoutInput({
  autoComplete,
  className = "",
  error,
  inputMode,
  label,
  maxLength,
  name,
  onBlur,
  onChange,
  onFocus,
  pattern,
  readOnly = false,
  required = true,
  title,
  type = "text",
  value
}: {
  autoComplete?: string;
  className?: string;
  error?: string | null;
  inputMode?: "none" | "text" | "tel" | "url" | "email" | "numeric" | "decimal" | "search";
  label: string;
  maxLength?: number;
  name: string;
  onBlur?: () => void;
  onChange: (value: string) => void;
  onFocus?: () => void;
  pattern?: string;
  readOnly?: boolean;
  required?: boolean;
  title?: string;
  type?: string;
  value: string;
}) {
  const errorId = error ? `${name}-error` : undefined;

  return (
    <label className={`grid gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--shresta-logo-muted)] ${className}`}>
      {label}
      <span className="checkout-input-shell">
        <input
          aria-describedby={errorId}
          aria-invalid={Boolean(error)}
          autoComplete={autoComplete}
          className={`checkout-input ${readOnly ? "checkout-input-readonly" : ""} ${error ? "checkout-input-error" : ""}`}
          inputMode={inputMode}
          maxLength={maxLength}
          name={name}
          onBlur={onBlur}
          onChange={(event) => onChange(event.target.value)}
          onFocus={onFocus}
          pattern={pattern}
          readOnly={readOnly}
          required={required}
          title={title}
          type={type}
          value={value}
        />
      </span>
      {error ? <span className="checkout-field-error" id={errorId}>{error}</span> : null}
    </label>
  );
}

function CheckoutPhoneInput({
  error,
  onBlur,
  onChange,
  onFocus,
  value
}: {
  error?: string | null;
  onBlur?: () => void;
  onChange: (value: string) => void;
  onFocus?: () => void;
  value: string;
}) {
  const errorId = error ? "checkout-phone-error" : undefined;

  return (
    <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--shresta-logo-muted)]">
      Mobile number
      <span className={`checkout-phone-control ${error ? "checkout-phone-control-error" : ""}`}>
        <span aria-hidden="true" className="checkout-phone-country">
          <Smartphone className="h-4 w-4" />
          <span>IN</span>
          <strong>+91</strong>
        </span>
        <span aria-hidden="true" className="checkout-phone-divider" />
        <input
          aria-describedby={errorId}
          aria-label="10 digit mobile number"
          aria-invalid={Boolean(error)}
          autoComplete="tel-national"
          className="checkout-phone-input"
          inputMode="numeric"
          maxLength={10}
          name="checkout-phone"
          onBlur={onBlur}
          onChange={(event) => onChange(event.target.value)}
          onFocus={onFocus}
          pattern={INPUT_PATTERNS.indianMobile}
          placeholder="98765 43210"
          required
          title={INPUT_PATTERN_TITLES.indianMobile}
          type="text"
          value={value}
        />
      </span>
      {error ? <span className="checkout-field-error" id={errorId}>{error}</span> : null}
    </label>
  );
}

function CheckoutBackButton({ onBack }: { onBack: () => void }) {
  return (
    <button className="inline-flex min-h-10 items-center justify-center rounded-full border border-[var(--shresta-logo-border)] px-5 text-sm font-bold text-[var(--shresta-logo-muted)] hover:border-[var(--gold-500)] hover:text-[var(--gold-600)]" onClick={onBack} type="button">
      Back
    </button>
  );
}

function addressTypeIcon(type: AddressType): LucideIcon {
  if (type === "work") {
    return Building2;
  }
  if (type === "other") {
    return MapPin;
  }
  return Home;
}

function checkoutPanelIcon(step: CheckoutJourneyStep): LucideIcon {
  switch (step) {
    case "details":
      return ShieldCheck;
    case "delivery":
      return Truck;
    case "review":
      return CheckCircle2;
    default:
      return ShoppingBag;
  }
}

function checkoutPanelTitle(step: CheckoutJourneyStep): string {
  switch (step) {
    case "details":
      return "Customer & Delivery";
    case "delivery":
      return "Delivery Mode";
    case "review":
      return "Review Order";
    case "payment_failed":
      return "Payment Failed";
    default:
      return "Checkout";
  }
}

function checkoutCtaLabel(step: CheckoutJourneyStep, isLoggedIn: boolean, isLoading: boolean): string {
  if (step === "details") {
    return "Continue to Delivery";
  }
  if (step === "delivery") {
    return "Review Order";
  }
  if (isLoading) {
    return "Checking Login";
  }
  return isLoggedIn ? "Confirm & Pay" : "Login to Confirm & Pay";
}

function validateCheckoutDetails(form: CheckoutFormState): string | null {
  for (const field of CHECKOUT_DETAIL_FIELDS) {
    const error = validateCheckoutDetailField(field, form);
    if (error) {
      return error;
    }
  }
  return null;
}

function validateCheckoutDetailField(field: CheckoutDetailField, form: CheckoutFormState): string | null {
  switch (field) {
    case "email":
      return new RegExp(INPUT_PATTERNS.email).test(form.email.trim()) ? null : "Enter a valid email address.";
    case "phone":
      return new RegExp(INPUT_PATTERNS.indianMobile).test(form.phone.trim()) ? null : "Enter a valid 10 digit Indian mobile number.";
    case "fullName":
      return new RegExp(INPUT_PATTERNS.personName).test(form.fullName.trim()) ? null : "Enter the customer's full name using letters and spaces.";
    case "postalCode":
      return new RegExp(INPUT_PATTERNS.indianPinCode).test(form.postalCode.trim()) ? null : "Enter a valid 6 digit PIN code.";
    case "addressLine1":
      return new RegExp(INPUT_PATTERNS.addressLine).test(form.addressLine1.trim()) ? null : "Enter a complete house, street, or apartment address.";
    case "addressLine2":
      return form.addressLine2.trim() && !new RegExp(INPUT_PATTERNS.optionalAddressLine).test(form.addressLine2.trim()) ? "Address line 2 has unsupported characters." : null;
    case "city":
      return new RegExp(INPUT_PATTERNS.cityOrState).test(form.city.trim()) ? null : "Enter a valid city name.";
    case "state":
      return new RegExp(INPUT_PATTERNS.cityOrState).test(form.state.trim()) ? null : "Enter a valid state name.";
    case "landmark":
      return form.landmark.trim() && !new RegExp(INPUT_PATTERNS.optionalAddressLine).test(form.landmark.trim()) ? "Landmark has unsupported characters." : null;
    default:
      return null;
  }
}

function calculateDeliveryPaise(deliveryMode: DeliveryMode, subtotalPaise: number): number {
  if (deliveryMode === "standard") {
    return subtotalPaise >= FREE_DELIVERY_THRESHOLD_PAISE ? 0 : STANDARD_DELIVERY_PAISE;
  }
  if (deliveryMode === "express") {
    return EXPRESS_DELIVERY_PAISE;
  }
  return SAME_DAY_DELIVERY_PAISE;
}

function deliveryLabel(deliveryMode: DeliveryMode): string {
  return DELIVERY_OPTIONS.find((option) => option.id === deliveryMode)?.name ?? enumDisplayLabel(deliveryMode);
}

function checkoutLinesPayload(items: CartProductLine[]) {
  return items.map((item) => ({ productId: item.product.id, quantity: item.line.quantity }));
}

function cartSignatureFromItems(items: CartProductLine[]): string {
  return checkoutLinesPayload(items)
    .map((line) => `${line.productId}:${line.quantity}`)
    .sort()
    .join("|");
}

function cartProceedCtaLabel(isLoadingProfile: boolean, isCreatingDraft: boolean): string {
  if (isCreatingDraft) {
    return "Creating Order ID";
  }
  if (isLoadingProfile) {
    return "Checking Login";
  }
  return "Proceed To Checkout";
}

function writeStoredCheckoutDraft(draft: CustomerOrderDraftResponse, items: CartProductLine[]) {
  if (typeof window === "undefined") {
    return;
  }

  const storedDraft: StoredCheckoutDraft = {
    browserCartSignature: cartSignatureFromItems(items),
    cartSignature: draft.cartSignature,
    createdAt: draft.createdAt,
    expiresAt: draft.expiresAt,
    orderId: draft.orderId,
    orderNumber: draft.orderNumber
  };
  window.localStorage.setItem(CHECKOUT_DRAFT_STORAGE_KEY, JSON.stringify(storedDraft));
}

function writeStoredCheckoutSelection(productIds: string[]) {
  if (typeof window === "undefined") {
    return;
  }

  const uniqueIds = Array.from(new Set(productIds.filter((id) => typeof id === "string" && id.trim().length > 0)));
  window.localStorage.setItem(CHECKOUT_SELECTION_STORAGE_KEY, JSON.stringify(uniqueIds));
}

function readStoredCheckoutSelection(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(CHECKOUT_SELECTION_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      clearStoredCheckoutSelection();
      return [];
    }
    return Array.from(new Set(parsed.filter((id): id is string => typeof id === "string" && id.trim().length > 0)));
  } catch {
    clearStoredCheckoutSelection();
    return [];
  }
}

function clearStoredCheckoutSelection() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(CHECKOUT_SELECTION_STORAGE_KEY);
  }
}

function readStoredCheckoutDraft(items: CartProductLine[]): StoredCheckoutDraft | null {
  return readStoredCheckoutDraftForSignature(cartSignatureFromItems(items));
}

function readStoredCheckoutDraftForSignature(browserCartSignature: string): StoredCheckoutDraft | null {
  const draft = readRawStoredCheckoutDraft();
  if (!draft) {
    return null;
  }
  if (!browserCartSignature || draft.browserCartSignature !== browserCartSignature) {
    return null;
  }
  if (Date.parse(draft.expiresAt) <= Date.now()) {
    clearStoredCheckoutDraft();
    return null;
  }
  return draft;
}

function discardStoredCheckoutDraftForChangedCart(browserCartSignature: string) {
  const draft = readRawStoredCheckoutDraft();
  if (draft && draft.browserCartSignature !== browserCartSignature) {
    clearStoredCheckoutDraft();
  }
}

function readRawStoredCheckoutDraft(): StoredCheckoutDraft | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(CHECKOUT_DRAFT_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<StoredCheckoutDraft>;
    if (!parsed.orderId || !parsed.orderNumber || !parsed.expiresAt || !parsed.browserCartSignature || !parsed.cartSignature) {
      clearStoredCheckoutDraft();
      return null;
    }
    return {
      browserCartSignature: parsed.browserCartSignature,
      cartSignature: parsed.cartSignature,
      createdAt: parsed.createdAt ?? "",
      expiresAt: parsed.expiresAt,
      orderId: parsed.orderId,
      orderNumber: parsed.orderNumber
    };
  } catch {
    clearStoredCheckoutDraft();
    return null;
  }
}

function clearStoredCheckoutDraft() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(CHECKOUT_DRAFT_STORAGE_KEY);
  }
}

function clearStoredDraftIdempotencyKey() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(CHECKOUT_DRAFT_IDEMPOTENCY_STORAGE_KEY);
  }
}

function getOrCreateDraftIdempotencyKey(items: CartProductLine[]): string {
  return getOrCreateCartScopedIdempotencyKey(CHECKOUT_DRAFT_IDEMPOTENCY_STORAGE_KEY, "checkout-draft", cartSignatureFromItems(items), 60_000);
}

function getOrCreateOrderIdempotencyKey(items: CartProductLine[]): string {
  return getOrCreateCartScopedIdempotencyKey(CHECKOUT_IDEMPOTENCY_STORAGE_KEY, "checkout", cartSignatureFromItems(items));
}

function getOrCreateCartScopedIdempotencyKey(storageKey: string, prefix: string, signature: string, maxAgeMs?: number): string {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw) as { createdAt?: number; key?: string; signature?: string };
      const reusableAge = !maxAgeMs || (typeof parsed.createdAt === "number" && Date.now() - parsed.createdAt < maxAgeMs);
      if (parsed.key && parsed.signature === signature && reusableAge) {
        return parsed.key;
      }
    }
  } catch {
    window.localStorage.removeItem(storageKey);
  }
  const key = `${prefix}-${Date.now()}-${crypto.randomUUID()}`;
  window.localStorage.setItem(storageKey, JSON.stringify({ createdAt: Date.now(), key, signature }));
  return key;
}

function formatDraftExpiry(expiresAt: string): string {
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) {
    return "the 15-minute checkout window ends";
  }
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function readStoredCheckoutState(): { form: CheckoutFormState; step: CheckoutJourneyStep } {
  if (typeof window === "undefined") {
    return { form: DEFAULT_CHECKOUT_FORM, step: "details" };
  }
  try {
    const raw = window.localStorage.getItem(CHECKOUT_STORAGE_KEY);
    if (!raw) {
      return { form: DEFAULT_CHECKOUT_FORM, step: "details" };
    }
    const parsed = JSON.parse(raw) as Partial<{ form: CheckoutFormState; step: CheckoutJourneyStep }>;
    return {
      form: { ...DEFAULT_CHECKOUT_FORM, ...parsed.form },
      step: parsed.step && ["details", "delivery", "review"].includes(parsed.step) ? parsed.step : "details"
    };
  } catch {
    window.localStorage.removeItem(CHECKOUT_STORAGE_KEY);
    return { form: DEFAULT_CHECKOUT_FORM, step: "details" };
  }
}

function resolveCartItems(lines: BrowserCartLine[], products: ProductCard[]): CartProductLine[] {
  const productsById = productMap(products);
  return lines
    .map((line) => {
      const product = productsById.get(line.productId);
      return product ? { line, product } : null;
    })
    .filter((item): item is CartProductLine => Boolean(item));
}

function useReconcileCartInventory(
  lines: BrowserCartLine[],
  replaceLines: (nextLines: BrowserCartLine[]) => void,
  products: ProductCard[],
  onReconciled?: (summary: CartInventoryReconcileSummary) => void
) {
  useEffect(() => {
    const reconciled = reconcileCartLinesWithInventory(lines, products);
    if (!reconciled) {
      return;
    }
    if (onReconciled) {
      onReconciled(reconciled.summary);
    }
    replaceLines(reconciled.lines);
  }, [lines, onReconciled, replaceLines, products]);
}

function useReconcileWishlistInventory(
  productIds: string[],
  replaceItems: (nextProductIds: string[]) => void,
  products: ProductCard[]
) {
  useEffect(() => {
    const reconciled = reconcileWishlistWithInventory(productIds, products);
    if (!reconciled) {
      return;
    }
    replaceItems(reconciled);
  }, [productIds, replaceItems, products]);
}

function reconcileCartLinesWithInventory(
  lines: BrowserCartLine[],
  products: ProductCard[]
): { lines: BrowserCartLine[]; summary: CartInventoryReconcileSummary } | null {
  const productsById = productMap(products);
  let changed = false;
  let removedLines = 0;
  let reducedLines = 0;
  const next: BrowserCartLine[] = [];

  for (const line of lines) {
    const product = productsById.get(line.productId);
    if (!product || product.stockQuantity <= 0) {
      changed = true;
      removedLines += 1;
      continue;
    }

    const clampedQuantity = Math.max(1, Math.min(product.stockQuantity, Math.floor(line.quantity)));
    if (clampedQuantity !== line.quantity) {
      changed = true;
      reducedLines += 1;
    }
    next.push({ productId: line.productId, quantity: clampedQuantity });
  }

  if (!changed && next.length === lines.length) {
    return null;
  }
  return {
    lines: next,
    summary: {
      reducedLines,
      removedLines
    }
  };
}

function reconcileWishlistWithInventory(productIds: string[], products: ProductCard[]): string[] | null {
  const productsById = productMap(products);
  const next = productIds.filter((productId) => {
    const product = productsById.get(productId);
    return Boolean(product && product.stockQuantity > 0);
  });

  if (next.length !== productIds.length) {
    return next;
  }

  for (let i = 0; i < next.length; i += 1) {
    if (next[i] !== productIds[i]) {
      return next;
    }
  }
  return null;
}

function productMap(products: ProductCard[]): Map<string, ProductCard> {
  return new Map(products.map((product) => [product.id, product]));
}

function calculateCartTotals(items: CartProductLine[]) {
  const subtotalPaise = items.reduce((total, item) => total + item.product.pricePaise * item.line.quantity, 0);
  const deliveryPaise = subtotalPaise >= FREE_DELIVERY_THRESHOLD_PAISE ? 0 : STANDARD_DELIVERY_PAISE;
  const totalPaise = subtotalPaise + deliveryPaise;
  const freeDeliveryRemainingPaise = Math.max(0, FREE_DELIVERY_THRESHOLD_PAISE - subtotalPaise);
  const freeDeliveryProgress = Math.min(100, Math.round((subtotalPaise / FREE_DELIVERY_THRESHOLD_PAISE) * 100));

  return {
    deliveryPaise,
    freeDeliveryProgress,
    freeDeliveryRemainingPaise,
    subtotalPaise,
    totalPaise
  };
}

