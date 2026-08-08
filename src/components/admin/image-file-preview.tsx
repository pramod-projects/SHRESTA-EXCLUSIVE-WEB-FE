"use client";

import { useRef, useState } from "react";
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  type Crop,
  type PixelCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

type Props = {
  currentSrc?: string | null;
  currentAlt?: string | null;
  name: string;
  accept?: string;
  required?: boolean;
  label?: string;
  className?: string;
  /**
   * Target aspect ratio for the crop modal (width / height).
   * Pass `1` for square (default for product images).
   * If omitted, no crop step is shown.
   */
  aspectRatio?: number;
};

export function ImageFilePreview({
  currentSrc,
  currentAlt,
  name,
  accept = "image/*",
  required,
  label,
  className,
  aspectRatio,
}: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  // Raw data-URL loaded into the crop modal
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const originalFileRef = useRef<File | null>(null);

  // ─── File picker handler ────────────────────────────────────────────────────
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    originalFileRef.current = file;

    if (aspectRatio != null) {
      // Show the crop modal instead of committing directly
      const reader = new FileReader();
      reader.onload = () => setCropSrc(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      // No crop — commit immediately
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(file));
    }
  }

  // ─── Initial crop centred to the target ratio ───────────────────────────────
  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    if (aspectRatio == null) return;
    const { width, height } = e.currentTarget;
    const initial = centerCrop(
      makeAspectCrop({ unit: "%", width: 90 }, aspectRatio, width, height),
      width,
      height,
    );
    setCrop(initial);
  }

  // ─── Confirm crop: canvas → Blob → replace file input ──────────────────────
  function confirmCrop() {
    const px = completedCrop;
    const img = imgRef.current;
    if (!px || !img) return;

    // Scale crop coordinates back to the original image dimensions
    const scaleX = img.naturalWidth / img.width;
    const scaleY = img.naturalHeight / img.height;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(px.width * scaleX);
    canvas.height = Math.round(px.height * scaleY);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Draw only the selected region at native resolution — no scale-down
    ctx.drawImage(
      img,
      px.x * scaleX,
      px.y * scaleY,
      px.width * scaleX,
      px.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height,
    );

    // Preserve original format: PNG stays lossless; everything else → JPEG 95 %
    const mimeType =
      originalFileRef.current?.type === "image/png" ? "image/png" : "image/jpeg";
    const quality = mimeType === "image/jpeg" ? 0.95 : undefined;
    const ext = mimeType === "image/png" ? "png" : "jpg";
    const base = originalFileRef.current?.name.replace(/\.[^.]+$/, "") ?? "image";

    canvas.toBlob(
      (blob) => {
        if (!blob || !fileInputRef.current) return;

        // Inject the cropped file into the hidden <input type="file">
        const croppedFile = new File([blob], `${base}-cropped.${ext}`, {
          type: mimeType,
        });
        const dt = new DataTransfer();
        dt.items.add(croppedFile);
        fileInputRef.current.files = dt.files;

        // Update the thumbnail
        if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(URL.createObjectURL(blob));

        // Close modal
        setCropSrc(null);
        setCrop(undefined);
        setCompletedCrop(undefined);
      },
      mimeType,
      quality,
    );
  }

  // ─── Cancel crop ────────────────────────────────────────────────────────────
  function cancelCrop() {
    if (fileInputRef.current) fileInputRef.current.value = "";
    originalFileRef.current = null;
    setCropSrc(null);
    setCrop(undefined);
    setCompletedCrop(undefined);
  }

  const displaySrc = previewUrl ?? currentSrc ?? null;
  const ratioLabel =
    aspectRatio === 1
      ? "square (1 : 1)"
      : aspectRatio != null
        ? `${aspectRatio.toFixed(2)} : 1`
        : "";

  return (
    <>
      {/* ── Thumbnail + file input ─────────────────────────────────────────── */}
      <div className={`space-y-2${className ? ` ${className}` : ""}`}>
        {displaySrc ? (
          <img
            alt={currentAlt ?? "Preview"}
            className="aspect-square w-full rounded-lg object-cover"
            src={displaySrc}
          />
        ) : (
          <div className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-[var(--shresta-logo-border)] text-xs text-[var(--shresta-logo-muted)]">
            Empty
          </div>
        )}
        <label className="admin-label">
          <span className="text-xs">{label ?? (currentSrc ? "Replace image" : "Upload image")}</span>
          <input
            ref={fileInputRef}
            accept={accept}
            className="admin-input"
            name={name}
            onChange={handleChange}
            required={required}
            type="file"
          />
        </label>
      </div>

      {/* ── Crop modal ────────────────────────────────────────────────────────── */}
      {cropSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-bg)] shadow-2xl">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-[var(--shresta-logo-border)] px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-[var(--shresta-logo-text)]">Crop Image</p>
                <p className="mt-1 text-xs text-[var(--shresta-logo-muted)]">
                  Drag the handles to frame a <span className="text-[var(--gold-400)]">{ratioLabel}</span> crop.
                  The crop is applied at full native resolution — no quality loss.
                </p>
              </div>
              <button
                type="button"
                aria-label="Cancel crop"
                className="ml-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--shresta-logo-muted)] transition hover:bg-[var(--shresta-logo-surface)] hover:text-[var(--shresta-logo-text)]"
                onClick={cancelCrop}
              >
                ✕
              </button>
            </div>

            {/* Crop area */}
            <div className="overflow-auto p-4">
              <ReactCrop
                aspect={aspectRatio}
                crop={crop}
                minHeight={40}
                minWidth={40}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={imgRef}
                  alt="Image to crop"
                  onLoad={onImageLoad}
                  src={cropSrc}
                  style={{ maxHeight: "58vh", width: "auto" }}
                />
              </ReactCrop>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-[var(--shresta-logo-border)] px-5 py-4">
              <p className="text-xs text-[var(--shresta-logo-muted)]">
                {completedCrop?.width && completedCrop?.height
                  ? `Crop: ${Math.round(completedCrop.width)} × ${Math.round(completedCrop.height)} px (display) — output at native scale`
                  : "Drag to select crop region"}
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  className="admin-button secondary"
                  onClick={cancelCrop}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="admin-button"
                  disabled={!completedCrop?.width || !completedCrop?.height}
                  onClick={confirmCrop}
                >
                  Apply Crop
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
