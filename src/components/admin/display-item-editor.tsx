"use client";

import { useRef, useState } from "react";
import { assignAssetToDisplayItemAction } from "@/app/admin/actions";
import type { AssetResponse } from "@/features/admin/admin-api";
import type { MediaAsset } from "@/features/storefront/storefront-home";

interface Props {
  itemKey: string;
  title: string;
  sectionLabel: string;
  currentImage: MediaAsset | null;
  availableAssets: AssetResponse[];
  idempotencyKey: string;
}

export function DisplayItemEditor({ itemKey, title, sectionLabel, currentImage, availableAssets, idempotencyKey }: Props) {
  const [mode, setMode] = useState<"grid" | "upload">("grid");
  const [selected, setSelected] = useState<AssetResponse | null>(null);
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const thumbnail = (asset: AssetResponse) =>
    asset.variants.find((v) => v.variantKey === "thumbnail")?.url ?? asset.assetUrl;

  return (
    <div className="rounded-lg border border-[var(--wine-800)] bg-[rgba(26,9,12,0.3)] p-4">
      {/* Item header */}
      <div className="flex items-start gap-3">
        {currentImage ? (
          <img
            alt={currentImage.altText}
            className="h-16 w-16 shrink-0 rounded-lg border border-[var(--wine-700)] object-cover"
            src={currentImage.url}
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-[var(--wine-700)] text-[10px] text-[var(--shresta-text-muted)]">
            No image
          </div>
        )}
        <div className="min-w-0 flex-1">
          <span className="rounded-full bg-[rgba(212,175,55,0.1)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--gold-400)]">
            {sectionLabel}
          </span>
          <p className="mt-1 truncate font-serif text-lg font-light text-white">{title}</p>
          {currentImage && (
            <p className="mt-0.5 truncate text-[10px] text-[var(--shresta-text-muted)]">{currentImage.assetKey}</p>
          )}
        </div>
        <button
          className="admin-button secondary shrink-0 text-xs"
          onClick={() => setOpen((v) => !v)}
          type="button"
        >
          {open ? "Cancel" : "Change Image"}
        </button>
      </div>

      {/* Change image panel */}
      {open && (
        <div className="mt-4 space-y-4">
          {/* Mode tabs */}
          <div className="flex gap-3 border-b border-[var(--wine-800)] pb-2">
            <button
              className={`text-sm font-medium ${mode === "grid" ? "text-[var(--gold-400)]" : "text-[var(--shresta-text-muted)] hover:text-white"}`}
              onClick={() => setMode("grid")}
              type="button"
            >
              Choose from library
            </button>
            <button
              className={`text-sm font-medium ${mode === "upload" ? "text-[var(--gold-400)]" : "text-[var(--shresta-text-muted)] hover:text-white"}`}
              onClick={() => setMode("upload")}
              type="button"
            >
              Upload new file
            </button>
          </div>

          <form action={assignAssetToDisplayItemAction} ref={formRef}>
            <input name="idempotencyKey" type="hidden" value={idempotencyKey} />
            <input name="itemKey" type="hidden" value={itemKey} />

            {mode === "grid" ? (
              <>
                {/* Asset grid */}
                <div className="grid max-h-72 grid-cols-4 gap-2 overflow-y-auto pr-1 sm:grid-cols-6 md:grid-cols-8">
                  {availableAssets.map((asset) => (
                    <button
                      className={`group relative overflow-hidden rounded-lg border transition-all ${
                        selected?.assetKey === asset.assetKey
                          ? "border-[var(--gold-400)] ring-1 ring-[var(--gold-400)]"
                          : "border-[var(--wine-700)] hover:border-[var(--gold-600)]"
                      }`}
                      key={asset.assetKey}
                      onClick={() => setSelected(asset)}
                      title={asset.assetKey}
                      type="button"
                    >
                      <img
                        alt={asset.altText}
                        className="aspect-square w-full object-cover"
                        src={thumbnail(asset)}
                      />
                      {selected?.assetKey === asset.assetKey && (
                        <div className="absolute inset-0 flex items-center justify-center bg-[rgba(212,175,55,0.3)]">
                          <span className="text-lg text-white">✓</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                {selected && (
                  <p className="mt-2 text-xs text-[var(--gold-300)]">
                    Selected: <strong>{selected.assetKey}</strong> · {selected.widthPx}×{selected.heightPx}
                  </p>
                )}

                {/* Hidden fields for selected asset */}
                <input name="selectedAssetUrl" type="hidden" value={selected?.assetUrl ?? ""} />
                <input name="selectedAltText" type="hidden" value={selected?.altText ?? ""} />
                <input name="selectedWidthPx" type="hidden" value={selected?.widthPx?.toString() ?? "0"} />
                <input name="selectedHeightPx" type="hidden" value={selected?.heightPx?.toString() ?? "0"} />
                <input name="selectedDeliveryMode" type="hidden" value={selected?.deliveryMode ?? ""} />

                <button
                  className="admin-button mt-3 w-full"
                  disabled={!selected}
                  type="submit"
                >
                  {selected ? `Apply "${selected.assetKey}"` : "Select an image above"}
                </button>
              </>
            ) : (
              <>
                <label className="admin-label">
                  Image File
                  <input accept="image/*" className="admin-input" name="file" required type="file" />
                </label>
                <button className="admin-button mt-3 w-full" type="submit">
                  Upload & Apply
                </button>
              </>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
