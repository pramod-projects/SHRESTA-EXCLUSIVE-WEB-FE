"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

const WISHLIST_STORAGE_KEY = "shresta.wishlist.v1";
const WISHLIST_UPDATED_EVENT = "shresta-wishlist-updated";
const EMPTY_WISHLIST: string[] = [];

let wishlistSnapshot: string[] = EMPTY_WISHLIST;

export function normalizeWishlistIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const ids = new Set<string>();
  for (const item of value) {
    if (typeof item === "string" && item.trim()) {
      ids.add(item.trim());
    }
  }

  return Array.from(ids);
}

export function useBrowserWishlist() {
  const productIds = useSyncExternalStore(subscribeToWishlist, getWishlistSnapshot, getServerWishlistSnapshot);

  const persist = useCallback((updater: (current: string[]) => string[]) => {
    const next = normalizeWishlistIds(updater(getWishlistSnapshot()));
    wishlistSnapshot = next;
    writeStoredWishlist(next);
    window.dispatchEvent(new Event(WISHLIST_UPDATED_EVENT));
  }, []);

  const toggleItem = useCallback((productId: string) => {
    persist((current) => current.includes(productId)
      ? current.filter((id) => id !== productId)
      : [...current, productId]);
  }, [persist]);

  const removeItem = useCallback((productId: string) => {
    persist((current) => current.filter((id) => id !== productId));
  }, [persist]);

  const clearWishlist = useCallback(() => {
    wishlistSnapshot = EMPTY_WISHLIST;
    writeStoredWishlist(EMPTY_WISHLIST);
    window.dispatchEvent(new Event(WISHLIST_UPDATED_EVENT));
  }, []);

  const replaceItems = useCallback((productIds: string[]) => {
    wishlistSnapshot = normalizeWishlistIds(productIds);
    writeStoredWishlist(wishlistSnapshot);
    window.dispatchEvent(new Event(WISHLIST_UPDATED_EVENT));
  }, []);

  const productIdSet = useMemo(() => new Set(productIds), [productIds]);

  return {
    clearWishlist,
    itemCount: productIds.length,
    productIds,
    productIdSet,
    replaceItems,
    removeItem,
    toggleItem
  };
}

function subscribeToWishlist(callback: () => void): () => void {
  const refresh = () => {
    wishlistSnapshot = readStoredWishlist();
    callback();
  };
  window.addEventListener("storage", refresh);
  window.addEventListener(WISHLIST_UPDATED_EVENT, refresh);

  return () => {
    window.removeEventListener("storage", refresh);
    window.removeEventListener(WISHLIST_UPDATED_EVENT, refresh);
  };
}

function getWishlistSnapshot(): string[] {
  if (typeof window === "undefined") {
    return EMPTY_WISHLIST;
  }

  const next = readStoredWishlist();
  if (!wishlistIdsEqual(wishlistSnapshot, next)) {
    wishlistSnapshot = next;
  }
  return wishlistSnapshot;
}

function getServerWishlistSnapshot(): string[] {
  return EMPTY_WISHLIST;
}

function readStoredWishlist(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    return normalizeWishlistIds(JSON.parse(window.localStorage.getItem(WISHLIST_STORAGE_KEY) ?? "[]"));
  } catch {
    return [];
  }
}

function writeStoredWishlist(productIds: string[]) {
  window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(normalizeWishlistIds(productIds)));
}

function wishlistIdsEqual(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}
