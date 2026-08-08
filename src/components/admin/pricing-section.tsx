"use client";

import { useState } from "react";

type Mode = "by-price" | "by-discount";

interface Props {
  defaultPricePaise: number;
  defaultCompareAtPricePaise: number;
}

export function PricingSection({ defaultPricePaise, defaultCompareAtPricePaise }: Props) {
  const initSelling = defaultPricePaise > 0 ? (defaultPricePaise / 100).toFixed(2) : "";
  const initActual = defaultCompareAtPricePaise > defaultPricePaise ? (defaultCompareAtPricePaise / 100).toFixed(2) : "";
  const initDiscount =
    defaultCompareAtPricePaise > defaultPricePaise && defaultCompareAtPricePaise > 0
      ? Math.round(((defaultCompareAtPricePaise - defaultPricePaise) / defaultCompareAtPricePaise) * 100).toString()
      : "";

  const [mode, setMode] = useState<Mode>("by-price");
  const [actualStr, setActualStr] = useState(initActual);
  const [sellingStr, setSellingStr] = useState(initSelling);
  const [discountStr, setDiscountStr] = useState(initDiscount);

  const actual = parseFloat(actualStr) || 0;
  const selling = parseFloat(sellingStr) || 0;
  const discount = parseFloat(discountStr) || 0;

  // Compute derived values
  const derivedSelling = mode === "by-discount" && actual > 0 && discount > 0
    ? actual * (1 - discount / 100)
    : selling;

  // Always compute the displayed discount from the final prices
  const finalSelling = mode === "by-discount" ? derivedSelling : selling;
  const finalActual = actual;
  const hasDiscount = finalActual > 0 && finalSelling > 0 && finalActual > finalSelling;
  const displayedDiscount = hasDiscount
    ? Math.round(((finalActual - finalSelling) / finalActual) * 100)
    : 0;

  // Hidden form field values (what gets submitted)
  const hiddenPriceRupees = mode === "by-discount"
    ? (derivedSelling > 0 ? derivedSelling.toFixed(2) : "")
    : sellingStr;
  const hiddenCompareAtRupees = actualStr;

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="flex flex-wrap items-center gap-4">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--shresta-logo-muted)]">Pricing mode:</span>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--shresta-logo-muted)]">
          <input
            checked={mode === "by-price"}
            className="accent-[var(--gold-500)]"
            name="_pricingMode"
            onChange={() => setMode("by-price")}
            type="radio"
            value="by-price"
          />
          Enter selling price
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--shresta-logo-muted)]">
          <input
            checked={mode === "by-discount"}
            className="accent-[var(--gold-500)]"
            name="_pricingMode"
            onChange={() => setMode("by-discount")}
            type="radio"
            value="by-discount"
          />
          Enter discount %
        </label>
      </div>

      {/* Hidden inputs — these are the real form fields that get submitted */}
      <input name="priceRupees" type="hidden" value={hiddenPriceRupees} />
      <input name="compareAtPriceRupees" type="hidden" value={hiddenCompareAtRupees} />

      <div className="grid gap-3 lg:grid-cols-4">
        {/* Actual / MRP price — always visible */}
        <div className="admin-label">
          <span className="mb-1 block text-sm font-medium text-[var(--shresta-logo-muted)]">
            Actual Price / MRP (₹)
          </span>
          <input
            className="admin-input"
            min="0"
            onChange={(e) => setActualStr(e.target.value)}
            placeholder="0.00"
            step="0.01"
            type="number"
            value={actualStr}
          />
          <span className="mt-1 block text-xs text-[var(--shresta-logo-muted)]">
            The original / crossed-out price shown to customers
          </span>
        </div>

        {mode === "by-price" ? (
          /* ── Mode 1: enter selling price, see discount % ── */
          <div className="admin-label">
            <span className="mb-1 block text-sm font-medium text-[var(--shresta-logo-muted)]">
              Selling Price (₹)
            </span>
            <input
              className="admin-input"
              min="0"
              onChange={(e) => setSellingStr(e.target.value)}
              placeholder="0.00"
              required
              step="0.01"
              type="number"
              value={sellingStr}
            />
            <span className="mt-1 block text-xs text-[var(--shresta-logo-muted)]">
              What the customer pays
            </span>
          </div>
        ) : (
          /* ── Mode 2: enter discount %, see computed selling price ── */
          <div className="admin-label">
            <span className="mb-1 block text-sm font-medium text-[var(--shresta-logo-muted)]">
              Discount (%)
            </span>
            <input
              className="admin-input"
              max="99"
              min="0"
              onChange={(e) => setDiscountStr(e.target.value)}
              placeholder="e.g. 20"
              step="1"
              type="number"
              value={discountStr}
            />
            <span className="mt-1 block text-xs text-[var(--shresta-logo-muted)]">
              Selling price = Actual × (1 − discount%)
            </span>
          </div>
        )}

        {/* Result / preview */}
        <div className="flex flex-col justify-center gap-1 rounded-lg border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] p-3 lg:col-span-2">
          {hasDiscount ? (
            <>
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="font-serif text-2xl font-light text-[var(--shresta-logo-text)]">
                  ₹{finalSelling.toFixed(2)}
                </span>
                <span className="rounded-full bg-rose-900/40 px-2 py-0.5 text-xs font-bold text-rose-300">
                  {displayedDiscount}% off
                </span>
              </div>
              <p className="text-xs text-[var(--shresta-logo-muted)]">
                MRP ₹{finalActual.toFixed(2)} → save ₹{(finalActual - finalSelling).toFixed(2)}
              </p>
              {mode === "by-discount" && (
                <p className="mt-1 text-xs text-[var(--gold-400)]">
                  Computed selling price: <strong>₹{derivedSelling.toFixed(2)}</strong>
                </p>
              )}
              {mode === "by-price" && (
                <p className="mt-1 text-xs text-[var(--gold-400)]">
                  Discount: <strong>{displayedDiscount}%</strong>
                </p>
              )}
            </>
          ) : finalSelling > 0 ? (
            <>
              <span className="font-serif text-2xl font-light text-[var(--shresta-logo-text)]">₹{finalSelling.toFixed(2)}</span>
              <p className="text-xs text-[var(--shresta-logo-muted)]">No discount — set Actual Price above Selling Price to show a discount badge.</p>
            </>
          ) : (
            <p className="text-sm text-[var(--shresta-logo-muted)]">Enter prices above to see preview.</p>
          )}
        </div>
      </div>
    </div>
  );
}
