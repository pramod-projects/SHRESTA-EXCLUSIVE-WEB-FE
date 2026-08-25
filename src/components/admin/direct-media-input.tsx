"use client";

import { useState } from "react";
import type { AssetResponse, MediaUploadAuthorizationRequest } from "@/features/admin/admin-api";
import { prepareCanonicalImage } from "@/features/admin/canonical-image";
import { uploadCanonicalMedia } from "@/features/admin/media-upload";

type Props = {
  fieldName: string;
  productId?: string;
  mediaType: MediaUploadAuthorizationRequest["mediaType"];
  label: string;
  accept: string;
  required?: boolean;
  captureMediaId?: boolean;
};

const MAX_WIDTH = Number(process.env.NEXT_PUBLIC_MEDIA_CANONICAL_MAX_WIDTH ?? "4000");
const MAX_HEIGHT = Number(process.env.NEXT_PUBLIC_MEDIA_CANONICAL_MAX_HEIGHT ?? "5333");
const MAX_FILE_SIZE = Number(process.env.NEXT_PUBLIC_MEDIA_CANONICAL_MAX_FILE_SIZE ?? "15000000");

export function DirectMediaInput({ fieldName, productId, mediaType, label, accept, required, captureMediaId = false }: Props) {
  const [asset, setAsset] = useState<AssetResponse | null>(null);
  const [mediaId, setMediaId] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const source = event.target.files?.[0];
    if (!source) return;
    setAsset(null);
    setMediaId("");
    setError(null);
    setProgress(0);
    try {
      let file = source;
      let widthPx: number | undefined;
      let heightPx: number | undefined;
      let durationSeconds: number | undefined;
      if (mediaType.endsWith("IMAGE")) {
        const prepared = await prepareCanonicalImage(source, {
          maxWidth: MAX_WIDTH,
          maxHeight: MAX_HEIGHT,
          maxFileSize: MAX_FILE_SIZE,
        });
        file = prepared.file;
        widthPx = prepared.width;
        heightPx = prepared.height;
      } else {
        durationSeconds = await readVideoDuration(source);
        if (durationSeconds > 30) throw new Error("Video duration must be 30 seconds or less");
      }
      const completed = await uploadCanonicalMedia(file, {
        productId,
        mediaType,
        widthPx,
        heightPx,
        durationSeconds,
        altText: source.name,
      }, setProgress);
      setAsset(completed.asset);
      setMediaId(completed.mediaId);
    } catch (uploadError) {
      setProgress(null);
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed");
      event.target.value = "";
    }
  }

  return (
    <label className="admin-label">
      {label}
      <input accept={accept} className="admin-input" disabled={progress !== null && progress < 100} onChange={handleChange} type="file" />
      <input name={`${fieldName}AssetKey`} type="hidden" value={asset?.assetKey ?? ""} />
      {captureMediaId ? <input name={`${fieldName}MediaId`} type="hidden" value={mediaId} /> : null}
      <input name={`${fieldName}AssetUrl`} type="hidden" value={asset?.assetUrl ?? ""} />
      <input name={`${fieldName}AltText`} type="hidden" value={asset?.altText ?? ""} />
      <input name={`${fieldName}WidthPx`} type="hidden" value={asset?.widthPx ?? ""} />
      <input name={`${fieldName}HeightPx`} type="hidden" value={asset?.heightPx ?? ""} />
      <input name={`${fieldName}DeliveryMode`} type="hidden" value={asset?.deliveryMode ?? ""} />
      <input
        aria-label={`${label} upload status`}
        className="sr-only"
        name={`${fieldName}Ready`}
        readOnly
        required={required}
        tabIndex={-1}
        value={asset ? "ready" : ""}
      />
      {progress !== null && !asset ? <span className="text-xs text-[var(--gold-400)]">Uploading {progress}%</span> : null}
      {asset ? <span className="text-xs text-emerald-400">Upload verified and ready</span> : null}
      {error ? <span className="text-xs text-rose-400">{error}</span> : null}
    </label>
  );
}

function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Math.ceil(video.duration));
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read video metadata"));
    };
    video.src = url;
  });
}
