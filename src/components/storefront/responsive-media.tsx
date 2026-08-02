"use client";

import { useState } from "react";
import type { MediaAsset, MediaVariant } from "@/features/storefront/storefront-home";

type ResponsiveMediaProps = {
  media: MediaAsset | null | undefined;
  className?: string;
  eager?: boolean;
  sizes: string;
};

export function ResponsiveMedia({ media, className, eager = false, sizes }: ResponsiveMediaProps) {
  const mediaKey = media ? `${media.assetKey}:${media.version}` : "none";
  const [fallbackState, setFallbackState] = useState({
    failed: false,
    mediaKey,
    useAssetFallback: false
  });
  const currentFallbackState = fallbackState.mediaKey === mediaKey
    ? fallbackState
    : { failed: false, mediaKey, useAssetFallback: false };

  if (!media || currentFallbackState.failed) {
    return (
      <div
        aria-label="SHRESTA media pending"
        className={`${className ?? ""} flex items-center justify-center bg-[var(--wine-800)] text-[var(--gold-300)]`}
        role="img"
      >
        <span className="rounded-full border border-[rgba(212,175,55,0.32)] bg-[rgba(26,9,12,0.45)] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em]">
          SHRESTA
        </span>
      </div>
    );
  }

  const variants = usableVariants(media);
  const avifSrcSet = srcSet(variants.filter((variant) => variant.format === "avif"));
  const webpSrcSet = srcSet(variants.filter((variant) => variant.format === "webp"));
  const fallbackSrcSet = srcSet(variants.filter((variant) => ["jpg", "jpeg", "png"].includes(variant.format)));
  const fallback = bestFallback(media, variants);
  const imageSrc = currentFallbackState.useAssetFallback ? media.url : fallback.url;

  return (
    <picture className={pictureClassName(className)}>
      {avifSrcSet ? <source sizes={sizes} srcSet={avifSrcSet} type="image/avif" /> : null}
      {webpSrcSet ? <source sizes={sizes} srcSet={webpSrcSet} type="image/webp" /> : null}
      <img
        alt={media.altText}
        className={className}
        decoding={eager ? "sync" : "async"}
        fetchPriority={eager ? "high" : "auto"}
        height={fallback.height || media.height}
        loading={eager ? "eager" : "lazy"}
        onError={() => {
          if (!currentFallbackState.useAssetFallback && media.url && media.url !== fallback.url) {
            setFallbackState({ failed: false, mediaKey, useAssetFallback: true });
          } else {
            setFallbackState({ failed: true, mediaKey, useAssetFallback: currentFallbackState.useAssetFallback });
          }
        }}
        sizes={sizes}
        src={imageSrc}
        srcSet={currentFallbackState.useAssetFallback ? undefined : fallbackSrcSet || undefined}
        style={{
          backgroundImage: media.lqipDataUrl ? `url(${media.lqipDataUrl})` : undefined,
          backgroundPosition: "center",
          backgroundSize: "cover"
        }}
        width={fallback.width || media.width}
      />
    </picture>
  );
}

export function prefetchMedia(media: MediaAsset | null | undefined) {
  if (!media) {
    return null;
  }

  const variants = usableVariants(media);
  const preferred = variants.find((variant) => variant.variantKey === "medium") ?? variants[0];
  const href = preferred?.url ?? media.url;
  return <link as="image" href={href} rel="prefetch" />;
}

function srcSet(variants: MediaVariant[]): string {
  return variants
    .filter((variant) => variant.url && variant.width > 0)
    .map((variant) => `${variant.url} ${variant.width}w`)
    .join(", ");
}

function usableVariants(media: MediaAsset): MediaVariant[] {
  if (media.deliveryMode === "backend-static-dev") {
    const originalVariants = media.variants.filter((variant) => variant.variantKey === "original");
    return originalVariants.length > 0 ? originalVariants : media.variants;
  }
  return media.variants;
}

function bestFallback(media: MediaAsset, variants: MediaVariant[]): MediaVariant {
  return variants.find((variant) => variant.variantKey === "large" && ["jpg", "jpeg", "png"].includes(variant.format))
    ?? variants.find((variant) => ["jpg", "jpeg", "png"].includes(variant.format))
    ?? {
      variantKey: "original",
      format: "original",
      width: media.width,
      height: media.height,
      byteSize: 0,
      url: media.url
    };
}

function pictureClassName(className: string | undefined): string | undefined {
  if (!className) {
    return undefined;
  }

  if (className.includes("h-full")) {
    return "block h-full w-full";
  }

  if (className.includes("aspect-")) {
    return "block w-full";
  }

  return undefined;
}
