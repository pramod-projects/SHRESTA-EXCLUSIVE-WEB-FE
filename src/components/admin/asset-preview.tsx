"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";

type AssetPreviewProps = {
  alt: string;
  avifSrcSet?: string;
  webpSrcSet?: string;
  fallbackSrcSet?: string;
  src: string;
  lqipDataUrl?: string | null;
};

export function AssetPreview({ alt, avifSrcSet, webpSrcSet, fallbackSrcSet, src, lqipDataUrl }: AssetPreviewProps) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="space-y-2">
      <picture>
        {avifSrcSet ? <source srcSet={avifSrcSet} type="image/avif" /> : null}
        {webpSrcSet ? <source srcSet={webpSrcSet} type="image/webp" /> : null}
        <img
          alt={alt}
          className={failed ? "aspect-square w-full rounded-lg border border-red-400/40 object-cover opacity-40" : "aspect-square w-full rounded-lg object-cover"}
          loading="lazy"
          onError={() => setFailed(true)}
          src={src}
          srcSet={fallbackSrcSet || undefined}
          style={{
            backgroundImage: lqipDataUrl ? `url(${lqipDataUrl})` : undefined,
            backgroundPosition: "center",
            backgroundSize: "cover"
          }}
        />
      </picture>
      {failed ? (
        <div className="rounded-lg border border-red-400/35 bg-red-950/30 p-2 text-xs leading-5 text-red-100">
          <span className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
            Image failed to load. Replace this asset or upload a valid optimized source.
          </span>
        </div>
      ) : null}
    </div>
  );
}
