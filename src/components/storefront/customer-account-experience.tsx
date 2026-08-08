"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Headset, Heart, LogOut, Mail, PackageCheck, ShieldCheck, ShoppingBag, type LucideIcon } from "lucide-react";
import { useCustomerSession } from "@/features/auth/use-customer-session";
import { cancelCustomerOrder, fetchCustomerOrder, fetchCustomerOrders, type CustomerOrderResponse, type CustomerOrderSummary } from "@/features/orders/customer-orders";
import type { StorefrontHome } from "@/features/storefront/storefront-home";
import { StorefrontPageChrome } from "@/components/storefront/storefront-home-experience";
import { asPriceInPaise, formatPaise } from "@/lib/currency";

export function CustomerAccountExperience({ home }: { home: StorefrontHome }) {
  const { isLoading, session, signOut } = useCustomerSession();
  const activeCustomerId = session?.customerId ?? null;
  const [activeAccountView, setActiveAccountView] = useState<"PROFILE" | "ORDERS">("PROFILE");
  const [ordersState, setOrdersState] = useState<{
    customerId: string | null;
    error: string | null;
    orders: CustomerOrderSummary[];
  }>({ customerId: null, error: null, orders: [] });
  const [orderDetailsState, setOrderDetailsState] = useState<{
    customerId: string | null;
    detailsByOrderNumber: Record<string, CustomerOrderResponse>;
    errorByOrderNumber: Record<string, string>;
    loadingOrderNumber: string | null;
  }>({ customerId: null, detailsByOrderNumber: {}, errorByOrderNumber: {}, loadingOrderNumber: null });
  const [expandedOrdersState, setExpandedOrdersState] = useState<{
    customerId: string | null;
    orderNumbers: string[];
  }>({ customerId: null, orderNumbers: [] });
  const [cancelingOrderNumber, setCancelingOrderNumber] = useState<string | null>(null);
  const visibleOrders = session && ordersState.customerId === session.customerId ? ordersState.orders : [];
  const visibleOrdersError = session && ordersState.customerId === session.customerId ? ordersState.error : null;
  const visibleOrdersLoading = Boolean(session && ordersState.customerId !== session.customerId);
  const expandedOrderNumbers = session && expandedOrdersState.customerId === session.customerId ? expandedOrdersState.orderNumbers : [];
  const visibleOrderDetailsByOrderNumber = session && orderDetailsState.customerId === session.customerId ? orderDetailsState.detailsByOrderNumber : {};
  const visibleOrderDetailErrorByOrderNumber = session && orderDetailsState.customerId === session.customerId ? orderDetailsState.errorByOrderNumber : {};
  const visibleOrderDetailLoadingOrderNumber = session && orderDetailsState.customerId === session.customerId ? orderDetailsState.loadingOrderNumber : null;

  useEffect(() => {
    let active = true;
    if (!activeCustomerId) {
      return;
    }

    fetchCustomerOrders().then((result) => {
      if (!active) {
        return;
      }
      if (result.ok) {
        setOrdersState({ customerId: activeCustomerId, error: null, orders: result.orders });
      } else {
        setOrdersState({ customerId: activeCustomerId, error: result.message, orders: [] });
      }
    });

    return () => {
      active = false;
    };
  }, [activeCustomerId]);

  async function handleToggleOrderView(orderNumber: string) {
    if (!session) {
      return;
    }

    const isExpanded = expandedOrderNumbers.includes(orderNumber);
    if (isExpanded) {
      setExpandedOrdersState((current) => ({
        customerId: session.customerId,
        orderNumbers: (current.customerId === session.customerId ? current.orderNumbers : []).filter((value) => value !== orderNumber)
      }));
      return;
    }

    setExpandedOrdersState((current) => {
      const existing = current.customerId === session.customerId ? current.orderNumbers : [];
      return {
        customerId: session.customerId,
        orderNumbers: existing.includes(orderNumber) ? existing : [...existing, orderNumber]
      };
    });

    if (visibleOrderDetailsByOrderNumber[orderNumber]) {
      return;
    }

    setOrderDetailsState((current) => ({
      customerId: session.customerId,
      detailsByOrderNumber: current.customerId === session.customerId ? current.detailsByOrderNumber : {},
      errorByOrderNumber: {
        ...(current.customerId === session.customerId ? current.errorByOrderNumber : {}),
        [orderNumber]: ""
      },
      loadingOrderNumber: orderNumber
    }));

    const detailResult = await fetchCustomerOrder(orderNumber);
    if (detailResult.ok) {
      setOrderDetailsState((current) => ({
        customerId: session.customerId,
        detailsByOrderNumber: {
          ...(current.customerId === session.customerId ? current.detailsByOrderNumber : {}),
          [orderNumber]: detailResult.order
        },
        errorByOrderNumber: {
          ...(current.customerId === session.customerId ? current.errorByOrderNumber : {}),
          [orderNumber]: ""
        },
        loadingOrderNumber: current.customerId === session.customerId && current.loadingOrderNumber === orderNumber ? null : current.loadingOrderNumber
      }));
      return;
    }

    setOrderDetailsState((current) => ({
      customerId: session.customerId,
      detailsByOrderNumber: current.customerId === session.customerId ? current.detailsByOrderNumber : {},
      errorByOrderNumber: {
        ...(current.customerId === session.customerId ? current.errorByOrderNumber : {}),
        [orderNumber]: detailResult.message
      },
      loadingOrderNumber: current.customerId === session.customerId && current.loadingOrderNumber === orderNumber ? null : current.loadingOrderNumber
    }));
  }

  async function handleCancelOrder(orderNumber: string) {
    if (!session) {
      return;
    }
    setCancelingOrderNumber(orderNumber);
    const result = await cancelCustomerOrder(orderNumber, crypto.randomUUID(), "Cancelled by customer from profile orders page.");
    setCancelingOrderNumber(null);

    if (!result.ok) {
      setOrdersState({ customerId: session.customerId, error: result.message, orders: visibleOrders });
      return;
    }

    const refreshed = await fetchCustomerOrders();
    if (refreshed.ok) {
      setOrdersState({ customerId: session.customerId, error: null, orders: refreshed.orders });
    } else {
      setOrdersState({ customerId: session.customerId, error: refreshed.message, orders: visibleOrders });
    }
  }

  return (
    <StorefrontPageChrome home={home}>
      <section className="bg-[linear-gradient(135deg,var(--shresta-logo-bg),var(--shresta-logo-surface)_48%,var(--shresta-logo-bg))] px-4 py-12 sm:px-6 lg:py-16">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold-400)]">Customer Account</p>
          <h1 className="mt-3 font-serif text-5xl font-light text-[var(--shresta-logo-text)]">Profile Center</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--shresta-logo-muted)]">
            Your profile keeps checkout verification, saved carts, wishlist movement, and support context in one place.
          </p>
        </div>
      </section>

      <section className="bg-[var(--shresta-logo-bg)] px-4 py-10 sm:px-6 lg:py-14">
        <div className="mx-auto max-w-7xl">
          {isLoading ? (
            <div className="rounded-2xl border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] p-8 text-center text-sm font-semibold text-[var(--shresta-logo-muted)] shadow-[0_16px_42px_rgba(47,33,21,0.12)]">
              Loading your secure profile...
            </div>
          ) : session ? (
            <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
              <aside className="h-fit rounded-2xl border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] p-6 shadow-[0_16px_42px_rgba(47,33,21,0.12)]">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--gold-300),var(--gold-600))] text-2xl font-black text-[var(--wine-950)]">
                    {session.displayName.slice(0, 1)}
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate font-serif text-2xl font-light text-[var(--shresta-logo-text)]">{session.displayName}</h2>
                    <p className="mt-1 flex items-center gap-2 text-sm text-[var(--shresta-logo-muted)]">
                      <Mail className="h-4 w-4 text-[var(--gold-600)]" />
                      {session.identityEmail}
                    </p>
                  </div>
                </div>
                <div className="mt-5 rounded-xl border border-[rgba(212,175,55,0.24)] bg-[rgba(212,175,55,0.08)] p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold text-[var(--gold-600)]">
                    <ShieldCheck className="h-4 w-4" />
                    Verified customer session
                  </p>
                  <p className="mt-2 text-xs leading-5 text-[var(--shresta-logo-muted)]">
                    Active until {new Date(session.expiresAt).toLocaleString()}.
                  </p>
                </div>
                <button
                  className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-rose-500/35 px-4 text-sm font-bold text-rose-700 transition hover:bg-rose-500/10"
                  onClick={signOut}
                  type="button"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
                <Link
                  className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-full border border-[var(--shresta-logo-border)] px-4 text-sm font-bold text-[var(--shresta-logo-muted)] transition hover:border-[var(--gold-500)] hover:text-[var(--gold-600)]"
                  href="/login?next=/account"
                >
                  Switch account
                </Link>
              </aside>

              <div className="space-y-5">
                <div className="rounded-2xl border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] p-3 shadow-[0_10px_30px_rgba(47,33,21,0.12)]">
                  <p className="px-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--shresta-logo-muted)]">Profile options</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <button
                      className={`min-h-11 rounded-full border px-4 text-sm font-semibold transition ${activeAccountView === "PROFILE" ? "border-[var(--gold-500)] bg-[rgba(212,175,55,0.16)] text-[var(--gold-700)]" : "border-[var(--shresta-logo-border)] text-[var(--shresta-logo-muted)] hover:border-[var(--gold-500)] hover:text-[var(--gold-600)]"}`}
                      onClick={() => setActiveAccountView("PROFILE")}
                      type="button"
                    >
                      View Profile
                    </button>
                    <button
                      className={`min-h-11 rounded-full border px-4 text-sm font-semibold transition ${activeAccountView === "ORDERS" ? "border-[var(--gold-500)] bg-[rgba(212,175,55,0.16)] text-[var(--gold-700)]" : "border-[var(--shresta-logo-border)] text-[var(--shresta-logo-muted)] hover:border-[var(--gold-500)] hover:text-[var(--gold-600)]"}`}
                      onClick={() => setActiveAccountView("ORDERS")}
                      type="button"
                    >
                      View Orders
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <AccountMetric label="Account" value="Verified" />
                  <AccountMetric label="Orders" value={visibleOrdersLoading ? "..." : visibleOrders.length.toString()} />
                  <AccountMetric label="Contact" value={session.identityEmail} />
                </div>

                {activeAccountView === "ORDERS" ? (
                  <OrdersPanel
                    cancelingOrderNumber={cancelingOrderNumber}
                    detailByOrderNumber={visibleOrderDetailsByOrderNumber}
                    detailErrorByOrderNumber={visibleOrderDetailErrorByOrderNumber}
                    detailLoadingOrderNumber={visibleOrderDetailLoadingOrderNumber}
                    error={visibleOrdersError}
                    expandedOrderNumbers={expandedOrderNumbers}
                    loading={visibleOrdersLoading}
                    onCancelOrder={handleCancelOrder}
                    onToggleOrderView={handleToggleOrderView}
                    orders={visibleOrders}
                  />
                ) : (
                  <div className="space-y-4">
                    <ProfileOverviewPanel
                      loadingOrders={visibleOrdersLoading}
                      orders={visibleOrders}
                      session={session}
                    />
                    <div className="grid gap-4 md:grid-cols-2">
                      <AccountActionCard
                        body="Review checkout when you are ready. Your browser cart is preserved after login."
                        href="/checkout"
                        icon={ShoppingBag}
                        label="Go to checkout"
                        title="Checkout"
                      />
                      <AccountActionCard
                        body="Move saved SHRESTA products into the cart whenever you are ready to compare or buy."
                        href="/wishlist"
                        icon={Heart}
                        label="View wishlist"
                        title="Wishlist"
                      />
                      <AccountActionCard
                        body="Get help with order status, payment pending state, delivery, and packaging questions."
                        href="/support/orders"
                        icon={PackageCheck}
                        label="Order support"
                        title="Order support"
                      />
                      <AccountActionCard
                        body="Chat with SHRESTA support using your verified profile for smoother order help."
                        href="/support"
                        icon={Headset}
                        label="Get support"
                        title="Support"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] p-8 text-center shadow-[0_22px_70px_rgba(0,0,0,0.26)]">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[var(--gold-500)] bg-[rgba(212,175,55,0.12)] text-[var(--gold-600)]">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <h2 className="mt-5 font-serif text-3xl font-light text-[var(--shresta-logo-text)]">Sign in to view your profile</h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[var(--shresta-logo-muted)]">
                You can browse without logging in. Profile, checkout confirmation, and account-specific support unlock after OTP verification.
              </p>
              <Link className="admin-button mt-7 inline-flex" href="/login?next=/account">
                Login to account
              </Link>
            </div>
          )}
        </div>
      </section>
    </StorefrontPageChrome>
  );
}

function AccountMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--shresta-logo-muted)]">{label}</p>
      <p className="mt-2 truncate text-sm font-semibold text-[var(--shresta-logo-text)]">{value}</p>
    </div>
  );
}

function ProfileOverviewPanel({
  loadingOrders,
  orders,
  session
}: {
  loadingOrders: boolean;
  orders: CustomerOrderSummary[];
  session: {
    customerId: string;
    displayName: string;
    expiresAt: string;
    identityEmail: string;
    status: string;
  };
}) {
  const recentOrders = orders.slice(0, 3);
  return (
    <section className="rounded-2xl border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.22)]">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold-400)]">Profile details</p>
      <h2 className="mt-1 font-serif text-3xl font-light text-[var(--shresta-logo-text)]">Your Account Snapshot</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--shresta-logo-muted)]">
        This section shows your account status and latest order movement connected to your verified SHRESTA login.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <ProfileInfoRow label="Customer name" value={session.displayName} />
        <ProfileInfoRow label="Registered email" value={session.identityEmail} />
        <ProfileInfoRow label="Account status" value={humanizeStatus(session.status)} />
        <ProfileInfoRow label="Session valid till" value={new Date(session.expiresAt).toLocaleString()} />
        <ProfileInfoRow label="Order history" value="All orders shown here belong to your signed-in account." />
        <ProfileInfoRow label="Support" value="Use this page for order tracking and faster support assistance." />
      </div>

      <div className="mt-4 rounded-xl border border-[rgba(212,175,55,0.24)] bg-[rgba(212,175,55,0.08)] p-4">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold-600)]">What you can do here</p>
        <p className="mt-2 text-sm text-[var(--shresta-logo-text)]">Use View Orders to track timeline-level status updates, payment state, and fulfillment movement for every order.</p>
      </div>

      <div className="mt-4 rounded-xl border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-bg)] p-4">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold-400)]">Recent orders at a glance</p>
        {loadingOrders ? (
          <p className="mt-2 text-sm font-semibold text-[var(--shresta-logo-muted)]">Loading your recent orders...</p>
        ) : recentOrders.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--shresta-logo-muted)]">No order has been placed yet from this account.</p>
        ) : (
          <div className="mt-2 space-y-2">
            {recentOrders.map((order) => (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] px-3 py-2" key={order.orderNumber}>
                <p className="text-xs font-semibold text-[var(--shresta-logo-text)]">{order.orderNumber}</p>
                <p className="text-xs text-[var(--shresta-logo-muted)]">{order.orderStatus} • {order.paymentStatus} • {order.fulfillmentStatus}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function ProfileInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-bg)] p-3">
      <p className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-[var(--shresta-logo-muted)]">{label}</p>
      <p className="mt-1 break-all text-sm font-semibold text-[var(--shresta-logo-text)]">{value}</p>
    </div>
  );
}

function humanizeStatus(status: string): string {
  const normalized = status.trim().toUpperCase();
  if (normalized === "ACTIVE") {
    return "Active";
  }
  return normalized.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function OrdersPanel({
  cancelingOrderNumber,
  detailByOrderNumber,
  detailErrorByOrderNumber,
  detailLoadingOrderNumber,
  error,
  expandedOrderNumbers,
  loading,
  onCancelOrder,
  onToggleOrderView,
  orders
}: {
  cancelingOrderNumber: string | null;
  detailByOrderNumber: Record<string, CustomerOrderResponse>;
  detailErrorByOrderNumber: Record<string, string>;
  detailLoadingOrderNumber: string | null;
  error: string | null;
  expandedOrderNumbers: string[];
  loading: boolean;
  onCancelOrder: (orderNumber: string) => void;
  onToggleOrderView: (orderNumber: string) => void;
  orders: CustomerOrderSummary[];
}) {
  return (
    <section className="rounded-2xl border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.22)]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold-400)]">Placed orders</p>
          <h2 className="mt-1 font-serif text-3xl font-light text-[var(--shresta-logo-text)]">Order History</h2>
        </div>
        <Link className="text-sm font-bold text-[var(--gold-600)] hover:text-[var(--gold-500)]" href="/products">
          Continue shopping
        </Link>
      </div>

      {loading ? (
        <p className="mt-5 rounded-xl border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] p-4 text-sm font-semibold text-[var(--shresta-logo-muted)]">
          Loading your order history...
        </p>
      ) : error ? (
        <p className="mt-5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm font-semibold text-rose-700">{error}</p>
      ) : orders.length === 0 ? (
        <div className="mt-5 rounded-xl border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] p-5">
          <p className="font-semibold text-[var(--shresta-logo-text)]">No orders placed yet</p>
          <p className="mt-1 text-sm leading-6 text-[var(--shresta-logo-muted)]">Your completed SHRESTA orders will appear here with payment and fulfillment status.</p>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {orders.map((order) => (
            <article className="rounded-xl border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] p-4" key={order.orderNumber}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--gold-400)]">{order.orderNumber}</p>
                  <p className="mt-2 text-sm text-[var(--shresta-logo-muted)]">
                    {order.itemCount} item{order.itemCount === 1 ? "" : "s"} • {new Date(order.placedAt).toLocaleString()}
                  </p>
                </div>
                <p className="text-lg font-bold text-[var(--shresta-logo-text)]">{formatPaise(asPriceInPaise(order.totalPaise))}</p>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <OrderStatusPill label="Order" value={order.orderStatus} />
                <OrderStatusPill label="Payment" value={order.paymentStatus} />
                <OrderStatusPill label="Fulfillment" value={order.fulfillmentStatus} />
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  className="inline-flex min-h-10 items-center justify-center rounded-full border border-[var(--shresta-logo-border)] px-4 text-sm font-semibold text-[var(--shresta-logo-text)] transition hover:border-[var(--gold-500)] hover:text-[var(--gold-600)]"
                  onClick={() => onToggleOrderView(order.orderNumber)}
                  type="button"
                >
                  {expandedOrderNumbers.includes(order.orderNumber) ? "Hide order" : "View order"}
                </button>
                {isCustomerCancellable(order) ? (
                  <button
                    className="inline-flex min-h-10 items-center justify-center rounded-full border border-rose-500/40 px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={cancelingOrderNumber === order.orderNumber}
                    onClick={() => onCancelOrder(order.orderNumber)}
                    type="button"
                  >
                    {cancelingOrderNumber === order.orderNumber ? "Cancelling..." : "Cancel order"}
                  </button>
                ) : null}
              </div>

              {expandedOrderNumbers.includes(order.orderNumber) ? (
                <OrderDetailPanel
                  detail={detailByOrderNumber[order.orderNumber]}
                  error={detailErrorByOrderNumber[order.orderNumber]}
                  isLoading={detailLoadingOrderNumber === order.orderNumber}
                />
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function OrderDetailPanel({ detail, error, isLoading }: { detail?: CustomerOrderResponse; error?: string; isLoading: boolean }) {
  if (isLoading) {
    return <p className="mt-4 rounded-xl border border-[var(--shresta-logo-border)] bg-[rgba(212,175,55,0.08)] p-3 text-sm font-semibold text-[var(--shresta-logo-muted)]">Loading detailed order status...</p>;
  }

  if (error) {
    return <p className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm font-semibold text-rose-700">{error}</p>;
  }

  if (!detail) {
    return null;
  }

  const progress = buildOrderProgress(detail);

  return (
    <div className="mt-4 min-w-0 overflow-hidden rounded-xl border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-bg)] p-4">
      <div className="grid gap-2 sm:grid-cols-3">
        <OrderStatusPill label="Delivery" value={detail.deliveryMode} />
        <OrderStatusPill label="Payment method" value={detail.paymentMethod} />
        <OrderStatusPill label="Placed" value={new Date(detail.placedAt).toLocaleString()} />
      </div>

      <div className="mt-4 min-w-0 rounded-xl border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] p-4">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--gold-400)]">Order progress</p>
        <p className="mt-1 text-sm text-[var(--shresta-logo-muted)]">Current stage: <span className="font-semibold text-[var(--shresta-logo-text)]">{progress.currentLabel}</span></p>
        {progress.currentCode === "CANCELLED" ? (
          <p className="mt-2 inline-flex items-center rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-rose-700">
            Cancelled order
          </p>
        ) : null}
        <OrderProgressBar
          activeIndex={progress.activeIndex}
          stages={progress.stages.map((stage) => stage.label)}
          terminalLabel={progress.currentCode === "CANCELLED" ? CANCELLED_STAGE.label : undefined}
        />

        <div className="mt-4 rounded-lg border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-bg)] p-3">
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-[var(--shresta-logo-muted)]">What this stage means</p>
          <p className="mt-1 text-sm text-[var(--shresta-logo-text)]">{progress.currentMeaning}</p>
        </div>
      </div>
    </div>
  );
}

function OrderProgressBar({ activeIndex, stages, terminalLabel }: { activeIndex: number | null; stages: string[]; terminalLabel?: string }) {
  const totalStages = stages.length + (terminalLabel ? 1 : 0);
  const shouldWrap = totalStages <= 5;
  const terminalActive = Boolean(terminalLabel) && activeIndex === null;
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    if (shouldWrap) {
      return;
    }

    const node = scrollContainerRef.current;
    if (!node) {
      return;
    }
    let animationFrameId: number | null = null;

    const updateScrollState = () => {
      const maxScrollLeft = node.scrollWidth - node.clientWidth;
      setCanScrollLeft(node.scrollLeft > 2);
      setCanScrollRight(maxScrollLeft - node.scrollLeft > 2);
    };

    animationFrameId = window.requestAnimationFrame(updateScrollState);
    node.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    return () => {
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }
      node.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [shouldWrap, totalStages]);

  return (
    <div className="mt-4 min-w-0 max-w-full">
      {!shouldWrap ? (
        <div className="mb-2 flex justify-end gap-2">
          <button
            className="inline-flex items-center gap-1 rounded-full border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-bg)] px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-[var(--shresta-logo-muted)] transition hover:border-[var(--gold-500)] hover:text-[var(--gold-600)] disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:border-[var(--shresta-logo-border)] disabled:hover:text-[var(--shresta-logo-muted)]"
            disabled={!canScrollLeft}
            onClick={() => scrollContainerRef.current?.scrollBy({ left: -220, behavior: "smooth" })}
            type="button"
          >
            <ArrowLeft className="h-3.5 w-3.5 motion-safe:animate-pulse" />
            Move left
          </button>
          <button
            className="inline-flex items-center gap-1 rounded-full border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-bg)] px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-[var(--shresta-logo-muted)] transition hover:border-[var(--gold-500)] hover:text-[var(--gold-600)] disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:border-[var(--shresta-logo-border)] disabled:hover:text-[var(--shresta-logo-muted)]"
            disabled={!canScrollRight}
            onClick={() => scrollContainerRef.current?.scrollBy({ left: 220, behavior: "smooth" })}
            type="button"
          >
            Move right
            <ArrowRight className="h-3.5 w-3.5 motion-safe:animate-pulse" />
          </button>
        </div>
      ) : null}
      <div className={`pb-1 ${shouldWrap ? "overflow-x-hidden" : "overflow-x-auto"}`} ref={scrollContainerRef} style={{ WebkitOverflowScrolling: "touch" }}>
      <div
        className={shouldWrap ? "flex flex-wrap gap-2 pr-2" : "pr-2"}
        style={{
          alignItems: "center",
          display: "flex",
          flexDirection: "row",
          flexWrap: shouldWrap ? "wrap" : "nowrap",
          gap: "0.5rem",
          width: shouldWrap ? "100%" : "max-content"
        }}
      >
        {stages.map((stage, index) => {
          const isActive = activeIndex !== null && index === activeIndex;
          const isComplete = activeIndex !== null ? index < activeIndex : false;
          const isMuted = terminalActive;
          return (
            <div className={`flex items-center ${shouldWrap ? "min-w-0 grow basis-[118px]" : "shrink-0"}`} key={stage}>
              <div className={`w-full rounded-lg border px-3 py-2 text-center ${shouldWrap ? "min-w-0" : "min-w-[108px] sm:min-w-[122px]"} ${isMuted ? "border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-bg)] opacity-70" : isActive ? "border-[var(--gold-500)] bg-[rgba(212,175,55,0.14)]" : isComplete ? "border-[rgba(212,175,55,0.32)] bg-[rgba(212,175,55,0.08)]" : "border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-bg)]"}`}>
                <p className={`text-[0.68rem] font-bold uppercase tracking-[0.1em] ${isMuted ? "text-[var(--shresta-logo-muted)]" : isActive || isComplete ? "text-[var(--gold-700)]" : "text-[var(--shresta-logo-muted)]"}`}>{stage}</p>
              </div>
              {!shouldWrap && index < stages.length - 1 ? (
                <span
                  aria-hidden="true"
                  className={`mx-2 h-[2px] w-5 rounded-full ${terminalActive ? "bg-[var(--shresta-logo-border)]" : isComplete ? "bg-[var(--gold-500)]" : "bg-[var(--shresta-logo-border)]"}`}
                />
              ) : null}
            </div>
          );
        })}
        {terminalLabel ? (
          <div className={`flex items-center ${shouldWrap ? "min-w-0 grow basis-[118px]" : "shrink-0"}`}>
            {!shouldWrap ? <span aria-hidden="true" className="mx-2 h-[2px] w-5 rounded-full bg-rose-400" /> : null}
            <div className={`w-full rounded-lg border border-rose-500/45 bg-rose-500/10 px-3 py-2 text-center ${shouldWrap ? "min-w-0" : "min-w-[108px] sm:min-w-[122px]"}`}>
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.1em] text-rose-700">{terminalLabel}</p>
            </div>
          </div>
        ) : null}
      </div>
      </div>
    </div>
  );
}

type CustomerMainStageCode = "PAYMENT" | "ORDER_PLACED" | "PACKED" | "ON_THE_WAY" | "DELIVERED" | "CANCELLED";

type CustomerMainStage = {
  code: Exclude<CustomerMainStageCode, "CANCELLED">;
  label: string;
  meaning: string;
};

const CUSTOMER_MAIN_STAGES: CustomerMainStage[] = [
  {
    code: "PAYMENT",
    label: "Payment",
    meaning: "We are confirming your payment."
  },
  {
    code: "ORDER_PLACED",
    label: "Order placed",
    meaning: "Payment is confirmed and your order is now in our processing queue."
  },
  {
    code: "PACKED",
    label: "Packed",
    meaning: "Your items are being packed and prepared for dispatch."
  },
  {
    code: "ON_THE_WAY",
    label: "On the way",
    meaning: "Your shipment is in transit to your delivery address."
  },
  {
    code: "DELIVERED",
    label: "Delivered",
    meaning: "Your order has been delivered."
  }
];

const CANCELLED_STAGE = {
  label: "Cancelled",
  meaning: "This order was cancelled and will not move to delivery stages."
};

const STAGE_BY_CODE: Record<Exclude<CustomerMainStageCode, "CANCELLED">, CustomerMainStage> = {
  PAYMENT: CUSTOMER_MAIN_STAGES[0] as CustomerMainStage,
  ORDER_PLACED: CUSTOMER_MAIN_STAGES[1] as CustomerMainStage,
  PACKED: CUSTOMER_MAIN_STAGES[2] as CustomerMainStage,
  ON_THE_WAY: CUSTOMER_MAIN_STAGES[3] as CustomerMainStage,
  DELIVERED: CUSTOMER_MAIN_STAGES[4] as CustomerMainStage
};

function buildOrderProgress(detail: CustomerOrderResponse): {
  activeIndex: number | null;
  completedThroughIndex: number;
  currentCode: CustomerMainStageCode;
  currentLabel: string;
  currentMeaning: string;
  stages: CustomerMainStage[];
} {
  const stageFromBackend = resolveBackendTrackingStage(detail.customerStageCode);
  if (stageFromBackend) {
    const activeIndex = Math.max(0, Math.min(detail.customerStageIndex, CUSTOMER_MAIN_STAGES.length - 1));
    if (stageFromBackend === "CANCELLED") {
      return {
        activeIndex: null,
        completedThroughIndex: activeIndex,
        currentCode: "CANCELLED",
        currentLabel: CANCELLED_STAGE.label,
        currentMeaning: CANCELLED_STAGE.meaning,
        stages: CUSTOMER_MAIN_STAGES
      };
    }

    const fallbackStage = CUSTOMER_MAIN_STAGES[activeIndex] ?? STAGE_BY_CODE.PAYMENT;
    const current = CUSTOMER_MAIN_STAGES.find((stage) => stage.code === stageFromBackend) || fallbackStage;
    const highlightedIndex = Math.max(0, CUSTOMER_MAIN_STAGES.findIndex((stage) => stage.code === current.code));
    return {
      activeIndex: Math.max(activeIndex, highlightedIndex),
      completedThroughIndex: Math.max(activeIndex, highlightedIndex),
      currentCode: current.code,
      currentLabel: detail.customerStageLabel || current.label,
      currentMeaning: detail.customerStageMeaning || current.meaning,
      stages: CUSTOMER_MAIN_STAGES
    };
  }

  const orderStatus = detail.orderStatus.trim().toUpperCase();
  const paymentStatus = detail.paymentStatus.trim().toUpperCase();
  const fulfillmentStatus = detail.fulfillmentStatus.trim().toUpperCase();

  if (orderStatus === "CANCELLED" || fulfillmentStatus === "CANCELLED") {
    const cancellationReachedIndex = fulfillmentStatus === "SHIPPED" || orderStatus === "OUT_FOR_DELIVERY" || orderStatus === "READY_FOR_PICKUP"
      ? 3
      : fulfillmentStatus === "PACKING" || fulfillmentStatus === "ALLOCATED" || orderStatus === "PACKING" || orderStatus === "CONFIRMED"
        ? 2
        : paymentStatus === "CAPTURED" || orderStatus === "PLACED"
          ? 1
          : 0;
    return {
      activeIndex: null,
      completedThroughIndex: cancellationReachedIndex,
      currentCode: "CANCELLED",
      currentLabel: CANCELLED_STAGE.label,
      currentMeaning: CANCELLED_STAGE.meaning,
      stages: CUSTOMER_MAIN_STAGES
    };
  }

  if (fulfillmentStatus === "DELIVERED") {
    return { activeIndex: 4, completedThroughIndex: 4, currentCode: "DELIVERED", currentLabel: "Delivered", currentMeaning: STAGE_BY_CODE.DELIVERED.meaning, stages: CUSTOMER_MAIN_STAGES };
  }
  if (fulfillmentStatus === "SHIPPED" || fulfillmentStatus === "READY" || orderStatus === "OUT_FOR_DELIVERY" || orderStatus === "READY_FOR_PICKUP") {
    return { activeIndex: 3, completedThroughIndex: 3, currentCode: "ON_THE_WAY", currentLabel: "On the way", currentMeaning: STAGE_BY_CODE.ON_THE_WAY.meaning, stages: CUSTOMER_MAIN_STAGES };
  }
  if (fulfillmentStatus === "PACKING" || fulfillmentStatus === "ALLOCATED" || orderStatus === "PACKING" || orderStatus === "CONFIRMED") {
    return { activeIndex: 2, completedThroughIndex: 2, currentCode: "PACKED", currentLabel: "Packed", currentMeaning: STAGE_BY_CODE.PACKED.meaning, stages: CUSTOMER_MAIN_STAGES };
  }

  if (paymentStatus === "CAPTURED" || orderStatus === "PLACED") {
    return { activeIndex: 1, completedThroughIndex: 1, currentCode: "ORDER_PLACED", currentLabel: "Order placed", currentMeaning: STAGE_BY_CODE.ORDER_PLACED.meaning, stages: CUSTOMER_MAIN_STAGES };
  }
  if (paymentStatus === "AUTHORIZED" || paymentStatus === "PENDING" || orderStatus === "PAYMENT_PENDING") {
    return { activeIndex: 0, completedThroughIndex: 0, currentCode: "PAYMENT", currentLabel: "Payment", currentMeaning: STAGE_BY_CODE.PAYMENT.meaning, stages: CUSTOMER_MAIN_STAGES };
  }

  return { activeIndex: 0, completedThroughIndex: 0, currentCode: "PAYMENT", currentLabel: "Payment", currentMeaning: STAGE_BY_CODE.PAYMENT.meaning, stages: CUSTOMER_MAIN_STAGES };
}

function resolveBackendTrackingStage(code: string | undefined): CustomerMainStageCode | null {
  const normalized = (code ?? "").trim().toUpperCase();
  if (
    normalized === "PAYMENT"
    || normalized === "ORDER_PLACED"
    || normalized === "PACKED"
    || normalized === "ON_THE_WAY"
    || normalized === "DELIVERED"
    || normalized === "CANCELLED"
  ) {
    return normalized;
  }
  return null;
}

function isCustomerCancellable(order: CustomerOrderSummary): boolean {
  if (order.orderStatus === "CANCELLED" || order.orderStatus === "DELIVERED") {
    return false;
  }
  if (order.fulfillmentStatus === "CANCELLED" || order.fulfillmentStatus === "DELIVERED") {
    return false;
  }
  return true;
}

function OrderStatusPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[rgba(212,175,55,0.18)] bg-[rgba(212,175,55,0.08)] px-3 py-2">
      <p className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-[var(--shresta-logo-muted)]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--gold-600)]">{value}</p>
    </div>
  );
}

function AccountActionCard({
  body,
  href,
  icon: Icon,
  label,
  title
}: {
  body: string;
  href: string;
  icon: LucideIcon;
  label: string;
  title: string;
}) {
  return (
    <article className="rounded-2xl border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.22)]">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[rgba(212,175,55,0.12)] text-[var(--gold-600)]">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 font-serif text-2xl font-light text-[var(--shresta-logo-text)]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--shresta-logo-muted)]">{body}</p>
      <Link className="mt-5 inline-flex text-sm font-bold text-[var(--gold-600)] hover:text-[var(--gold-500)]" href={href}>
        {label}
      </Link>
    </article>
  );
}
