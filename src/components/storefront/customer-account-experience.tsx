"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Headset, Heart, LogOut, Mail, PackageCheck, ShieldCheck, ShoppingBag, type LucideIcon } from "lucide-react";
import { useCustomerSession } from "@/features/auth/use-customer-session";
import { fetchCustomerOrders, type CustomerOrderSummary } from "@/features/orders/customer-orders";
import type { StorefrontHome } from "@/features/storefront/storefront-home";
import { StorefrontPageChrome } from "@/components/storefront/storefront-home-experience";
import { asPriceInPaise, formatPaise } from "@/lib/currency";

export function CustomerAccountExperience({ home }: { home: StorefrontHome }) {
  const { isLoading, session, signOut } = useCustomerSession();
  const activeCustomerId = session?.customerId ?? null;
  const [ordersState, setOrdersState] = useState<{
    customerId: string | null;
    error: string | null;
    orders: CustomerOrderSummary[];
  }>({ customerId: null, error: null, orders: [] });
  const visibleOrders = session && ordersState.customerId === session.customerId ? ordersState.orders : [];
  const visibleOrdersError = session && ordersState.customerId === session.customerId ? ordersState.error : null;
  const visibleOrdersLoading = Boolean(session && ordersState.customerId !== session.customerId);

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

  return (
    <StorefrontPageChrome home={home}>
      <section className="bg-[linear-gradient(135deg,var(--wine-950),var(--wine-900)_48%,var(--wine-950))] px-4 py-12 sm:px-6 lg:py-16">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold-400)]">Customer Account</p>
          <h1 className="mt-3 font-serif text-5xl font-light text-white">Profile Center</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--shresta-text-secondary)]">
            Your profile keeps checkout verification, saved carts, wishlist movement, and support context in one place.
          </p>
        </div>
      </section>

      <section className="bg-[var(--wine-950)] px-4 py-10 sm:px-6 lg:py-14">
        <div className="mx-auto max-w-7xl">
          {isLoading ? (
            <div className="rounded-2xl border border-[var(--wine-800)] bg-[rgba(43,15,20,0.8)] p-8 text-center text-sm font-semibold text-[var(--shresta-text-secondary)] shadow-[0_22px_70px_rgba(0,0,0,0.26)]">
              Loading your secure profile...
            </div>
          ) : session ? (
            <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
              <aside className="h-fit rounded-2xl border border-[var(--wine-800)] bg-[rgba(43,15,20,0.84)] p-6 shadow-[0_22px_70px_rgba(0,0,0,0.26)]">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--gold-300),var(--gold-600))] text-2xl font-black text-[var(--wine-950)]">
                    {session.displayName.slice(0, 1)}
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate font-serif text-2xl font-light text-white">{session.displayName}</h2>
                    <p className="mt-1 flex items-center gap-2 text-sm text-[var(--shresta-text-muted)]">
                      <Mail className="h-4 w-4 text-[var(--gold-300)]" />
                      {session.identityEmail}
                    </p>
                  </div>
                </div>
                <div className="mt-5 rounded-xl border border-[rgba(212,175,55,0.24)] bg-[rgba(212,175,55,0.08)] p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold text-[var(--gold-300)]">
                    <ShieldCheck className="h-4 w-4" />
                    Verified customer session
                  </p>
                  <p className="mt-2 text-xs leading-5 text-[var(--shresta-text-muted)]">
                    Active until {new Date(session.expiresAt).toLocaleString()}.
                  </p>
                </div>
                <button
                  className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-rose-500/35 px-4 text-sm font-bold text-rose-200 transition hover:bg-rose-500/10"
                  onClick={signOut}
                  type="button"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
                <Link
                  className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-full border border-[var(--wine-700)] px-4 text-sm font-bold text-[var(--shresta-text-secondary)] transition hover:border-[var(--gold-500)] hover:text-[var(--gold-300)]"
                  href="/login?next=/account"
                >
                  Switch account
                </Link>
              </aside>

              <div className="space-y-5">
                <div className="grid gap-4 md:grid-cols-3">
                  <AccountMetric label="Customer ID" value={shortCustomerId(session.customerId)} />
                  <AccountMetric label="Orders" value={visibleOrdersLoading ? "..." : visibleOrders.length.toString()} />
                  <AccountMetric label="Identity" value="Email / mobile mapped" />
                </div>

                <OrdersPanel error={visibleOrdersError} loading={visibleOrdersLoading} orders={visibleOrders} />

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
            </div>
          ) : (
            <div className="rounded-2xl border border-[var(--wine-800)] bg-[rgba(43,15,20,0.8)] p-8 text-center shadow-[0_22px_70px_rgba(0,0,0,0.26)]">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[var(--gold-500)] bg-[rgba(212,175,55,0.12)] text-[var(--gold-300)]">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <h2 className="mt-5 font-serif text-3xl font-light text-white">Sign in to view your profile</h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[var(--shresta-text-secondary)]">
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
    <div className="rounded-2xl border border-[var(--wine-800)] bg-[rgba(43,15,20,0.74)] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--shresta-text-muted)]">{label}</p>
      <p className="mt-2 truncate text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function OrdersPanel({ error, loading, orders }: { error: string | null; loading: boolean; orders: CustomerOrderSummary[] }) {
  return (
    <section className="rounded-2xl border border-[var(--wine-800)] bg-[rgba(43,15,20,0.82)] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.22)]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold-400)]">Placed orders</p>
          <h2 className="mt-1 font-serif text-3xl font-light text-white">Order History</h2>
        </div>
        <Link className="text-sm font-bold text-[var(--gold-300)] hover:text-[var(--gold-400)]" href="/products">
          Continue shopping
        </Link>
      </div>

      {loading ? (
        <p className="mt-5 rounded-xl border border-[var(--wine-800)] bg-[rgba(26,9,12,0.42)] p-4 text-sm font-semibold text-[var(--shresta-text-secondary)]">
          Loading orders linked to your customer ID...
        </p>
      ) : error ? (
        <p className="mt-5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm font-semibold text-rose-100">{error}</p>
      ) : orders.length === 0 ? (
        <div className="mt-5 rounded-xl border border-[var(--wine-800)] bg-[rgba(26,9,12,0.42)] p-5">
          <p className="font-semibold text-white">No orders placed yet</p>
          <p className="mt-1 text-sm leading-6 text-[var(--shresta-text-muted)]">Your completed SHRESTA orders will appear here with payment and fulfillment status.</p>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {orders.map((order) => (
            <article className="rounded-xl border border-[var(--wine-800)] bg-[rgba(26,9,12,0.48)] p-4" key={order.orderNumber}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--gold-400)]">{order.orderNumber}</p>
                  <p className="mt-2 text-sm text-[var(--shresta-text-secondary)]">
                    {order.itemCount} item{order.itemCount === 1 ? "" : "s"} • {new Date(order.placedAt).toLocaleString()}
                  </p>
                </div>
                <p className="text-lg font-bold text-white">{formatPaise(asPriceInPaise(order.totalPaise))}</p>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <OrderStatusPill label="Order" value={order.orderStatus} />
                <OrderStatusPill label="Payment" value={order.paymentStatus} />
                <OrderStatusPill label="Fulfillment" value={order.fulfillmentStatus} />
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function OrderStatusPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[rgba(212,175,55,0.18)] bg-[rgba(212,175,55,0.08)] px-3 py-2">
      <p className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-[var(--shresta-text-muted)]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--gold-300)]">{value}</p>
    </div>
  );
}

function shortCustomerId(customerId: string): string {
  return customerId.length > 12 ? `${customerId.slice(0, 8)}...${customerId.slice(-4)}` : customerId;
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
    <article className="rounded-2xl border border-[var(--wine-800)] bg-[rgba(43,15,20,0.74)] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.22)]">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[rgba(212,175,55,0.12)] text-[var(--gold-300)]">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 font-serif text-2xl font-light text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--shresta-text-muted)]">{body}</p>
      <Link className="mt-5 inline-flex text-sm font-bold text-[var(--gold-300)] hover:text-[var(--gold-400)]" href={href}>
        {label}
      </Link>
    </article>
  );
}
