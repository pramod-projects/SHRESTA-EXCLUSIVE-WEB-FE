"use client";

import Image from "next/image";
import { useState } from "react";
import type { MediaAsset } from "@/features/storefront/storefront-home";

type ResponsiveMediaProps = {
  media: MediaAsset | null | undefined;
  className?: string;
  eager?: boolean;
  sizes: string;
};

export function ResponsiveMedia({ media, className, eager = false, sizes }: ResponsiveMediaProps) {
  const mediaKey = media ? `${media.assetKey}:${media.version}` : "none";
  const [failedKey, setFailedKey] = useState<string | null>(null);

  if (!media || failedKey === mediaKey) {
    return (
      <div
        aria-label="SHRESTA media pending"
        className={`${className ?? ""} flex items-center justify-center bg-[var(--shresta-logo-surface)] text-[var(--gold-600)]`}
        role="img"
      >
        <span className="rounded-full border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em]">
          SHRESTA
        </span>
      </div>
    );
  }

  return (
    <Image
      alt={media.altText}
      className={className}
      height={media.height}
      onError={() => setFailedKey(mediaKey)}
      priority={eager}
      sizes={sizes}
      src={media.url}
      unoptimized
      width={media.width}
    />
  );
}

export function prefetchMedia(media: MediaAsset | null | undefined) {
  if (!media) return null;
  return <link as="image" href={media.url} rel="prefetch" />;
}
