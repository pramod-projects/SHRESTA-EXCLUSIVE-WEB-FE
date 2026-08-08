"use client";

import {
  BadgeCheck,
  Crown,
  Droplets,
  Flame,
  ShieldCheck,
  Shirt,
  Sparkles,
  Star
} from "lucide-react";
import { enumDisplayLabel } from "@/lib/admin-enums";

type ProductImageBadgeSize = "compact" | "regular" | "large";

type ProductImageBadgeProps = {
  badge: string;
  size?: ProductImageBadgeSize;
};

export function ProductImageBadge({ badge, size = "regular" }: ProductImageBadgeProps) {
  const label = enumDisplayLabel(badge);

  return (
    <span
      aria-label={label}
      className={`group/product-badge relative inline-flex ${badgeSizeClassName[size]} items-center justify-center rounded-full border border-[rgba(255,255,255,0.18)] bg-[linear-gradient(135deg,var(--gold-300),var(--gold-600))] text-[var(--wine-950)] shadow-[0_10px_28px_rgba(0,0,0,0.28)]`}
      role="img"
    >
      {renderProductBadgeIcon(badge, size)}
      <span className={`pointer-events-none absolute left-0 top-[calc(100%+0.32rem)] z-40 ${badgeTooltipWidthClassName[size]} max-h-[2.7rem] overflow-hidden rounded-full border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-bg)] ${badgeTooltipClassName[size]} text-center font-bold uppercase leading-4 tracking-[0.09em] text-[var(--gold-600)] opacity-0 shadow-2xl transition duration-150 [overflow-wrap:anywhere] group-hover/product-badge:opacity-100`}>
        {label}
      </span>
    </span>
  );
}

export function ProductImageBadgeRow({
  badges,
  floating = true,
  limit = 2,
  size = "regular"
}: {
  badges: string[];
  floating?: boolean;
  limit?: number;
  size?: ProductImageBadgeSize;
}) {
  return (
    <div className={floating ? badgeFloatingRowClassName[size] : badgeInlineRowClassName[size]}>
      {badges.slice(0, limit).map((badge) => (
        <ProductImageBadge badge={badge} key={badge} size={size} />
      ))}
    </div>
  );
}

export function renderProductBadgeIcon(badge: string, size: ProductImageBadgeSize = "regular") {
  const value = badge.toUpperCase();
  if (value.includes("BESTSELLER") || value.includes("POPULAR")) {
    return <Flame className={badgeIconClassName[size]} strokeWidth={2.4} />;
  }
  if (value.includes("AD") || value.includes("CERTIFIED")) {
    return <BadgeCheck className={badgeIconClassName[size]} strokeWidth={2.4} />;
  }
  if (value.includes("ANTI_TARNISH") || value.includes("TARNISH")) {
    return <ShieldCheck className={badgeIconClassName[size]} strokeWidth={2.4} />;
  }
  if (value.includes("WATER")) {
    return <Droplets className={badgeIconClassName[size]} strokeWidth={2.4} />;
  }
  if (value.includes("WEDDING")) {
    return <Crown className={badgeIconClassName[size]} strokeWidth={2.4} />;
  }
  if (value.includes("SILK") || value.includes("SAREE")) {
    return <Shirt className={badgeIconClassName[size]} strokeWidth={2.4} />;
  }
  if (value.includes("NEW")) {
    return <Sparkles className={badgeIconClassName[size]} strokeWidth={2.4} />;
  }

  return <Star className={badgeIconClassName[size]} strokeWidth={2.4} />;
}

const badgeSizeClassName: Record<ProductImageBadgeSize, string> = {
  compact: "h-7 w-7",
  regular: "h-9 w-9",
  large: "h-10 w-10"
};

const badgeIconClassName: Record<ProductImageBadgeSize, string> = {
  compact: "h-3.5 w-3.5",
  regular: "h-[18px] w-[18px]",
  large: "h-5 w-5"
};

const badgeTooltipClassName: Record<ProductImageBadgeSize, string> = {
  compact: "px-2.5 py-1 text-[10px]",
  regular: "px-3 py-1.5 text-[11px]",
  large: "px-3.5 py-1.5 text-xs"
};

const badgeTooltipWidthClassName: Record<ProductImageBadgeSize, string> = {
  compact: "w-max max-w-[7.75rem]",
  regular: "w-max max-w-[10.5rem]",
  large: "w-max max-w-[12rem]"
};

const badgeFloatingRowClassName: Record<ProductImageBadgeSize, string> = {
  compact: "absolute left-2 top-2 z-30 flex flex-wrap gap-1.5",
  regular: "absolute left-3 top-3 z-30 flex flex-wrap gap-2",
  large: "absolute left-4 top-4 z-30 flex flex-wrap gap-2.5"
};

const badgeInlineRowClassName: Record<ProductImageBadgeSize, string> = {
  compact: "flex flex-wrap gap-1.5",
  regular: "flex flex-wrap gap-2",
  large: "flex flex-wrap gap-2.5"
};
