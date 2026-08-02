"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

export type BrowserCartLine = {
  productId: string;
  quantity: number;
};

const CART_STORAGE_KEY = "shresta.cart.v1";
const CART_UPDATED_EVENT = "shresta-cart-updated";
const MAX_LINE_QUANTITY = 99;
const EMPTY_CART: BrowserCartLine[] = [];

let cartSnapshot: BrowserCartLine[] = EMPTY_CART;

export function normalizeCartLines(value: unknown): BrowserCartLine[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const merged = new Map<string, number>();
  for (const line of value) {
    if (!line || typeof line !== "object") {
      continue;
    }
    const candidate = line as Partial<BrowserCartLine>;
    const productId = typeof candidate.productId === "string" ? candidate.productId.trim() : "";
    const quantity = Number(candidate.quantity);
    if (!productId || !Number.isFinite(quantity) || quantity <= 0) {
      continue;
    }
    const normalizedQuantity = Math.min(MAX_LINE_QUANTITY, Math.max(1, Math.floor(quantity)));
    merged.set(productId, Math.min(MAX_LINE_QUANTITY, (merged.get(productId) ?? 0) + normalizedQuantity));
  }

  return Array.from(merged, ([productId, quantity]) => ({ productId, quantity }));
}

export function useBrowserCart() {
  const lines = useSyncExternalStore(subscribeToCart, getCartSnapshot, getServerCartSnapshot);

  const persist = useCallback((updater: (current: BrowserCartLine[]) => BrowserCartLine[]) => {
    const next = normalizeCartLines(updater(getCartSnapshot()));
    cartSnapshot = next;
    writeStoredCart(next);
    window.dispatchEvent(new Event(CART_UPDATED_EVENT));
  }, []);

  const addItem = useCallback((productId: string, quantity = 1) => {
    persist((current) => {
      const next = [...current];
      const existing = next.find((line) => line.productId === productId);
      if (existing) {
        existing.quantity = Math.min(MAX_LINE_QUANTITY, existing.quantity + quantity);
      } else {
        next.push({ productId, quantity });
      }
      return next;
    });
  }, [persist]);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    persist((current) => current.map((line) => (
      line.productId === productId ? { ...line, quantity } : line
    )));
  }, [persist]);

  const removeItem = useCallback((productId: string) => {
    persist((current) => current.filter((line) => line.productId !== productId));
  }, [persist]);

  const clearCart = useCallback(() => {
    cartSnapshot = EMPTY_CART;
    writeStoredCart(EMPTY_CART);
    window.dispatchEvent(new Event(CART_UPDATED_EVENT));
  }, []);

  const itemCount = useMemo(() => lines.reduce((total, line) => total + line.quantity, 0), [lines]);

  return {
    addItem,
    clearCart,
    itemCount,
    lines,
    removeItem,
    updateQuantity
  };
}

function subscribeToCart(callback: () => void): () => void {
  const refresh = () => {
    cartSnapshot = readStoredCart();
    callback();
  };
  window.addEventListener("storage", refresh);
  window.addEventListener(CART_UPDATED_EVENT, refresh);

  return () => {
    window.removeEventListener("storage", refresh);
    window.removeEventListener(CART_UPDATED_EVENT, refresh);
  };
}

function getCartSnapshot(): BrowserCartLine[] {
  if (typeof window === "undefined") {
    return EMPTY_CART;
  }

  const next = readStoredCart();
  if (!cartLinesEqual(cartSnapshot, next)) {
    cartSnapshot = next;
  }
  return cartSnapshot;
}

function getServerCartSnapshot(): BrowserCartLine[] {
  return EMPTY_CART;
}

function readStoredCart(): BrowserCartLine[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    return normalizeCartLines(JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) ?? "[]"));
  } catch {
    return [];
  }
}

function writeStoredCart(lines: BrowserCartLine[]) {
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(normalizeCartLines(lines)));
}

function cartLinesEqual(left: BrowserCartLine[], right: BrowserCartLine[]): boolean {
  return left.length === right.length
    && left.every((line, index) => line.productId === right[index]?.productId && line.quantity === right[index]?.quantity);
}
