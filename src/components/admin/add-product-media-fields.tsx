"use client";

import { useEffect, useState } from "react";
import { DirectMediaInput } from "@/components/admin/direct-media-input";

type Reservation = {
  productId: string;
  expiresAt: string;
};

export function AddProductMediaFields() {
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/admin-media/product-reservation", {
      method: "POST",
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json() as Reservation & { error?: string };
        if (!response.ok) throw new Error(payload.error ?? "Could not reserve product media");
        setReservation(payload);
      })
      .catch((reservationError: unknown) => {
        if (reservationError instanceof DOMException && reservationError.name === "AbortError") return;
        setError(reservationError instanceof Error ? reservationError.message : "Could not reserve product media");
      });
    return () => controller.abort();
  }, []);

  if (error) {
    return <p className="text-sm text-rose-400">{error}</p>;
  }
  if (!reservation) {
    return <p className="text-sm text-[var(--shresta-logo-muted)]">Preparing secure product uploads...</p>;
  }

  return (
    <>
      <input name="productReservationId" type="hidden" value={reservation.productId} />

      <div className="rounded-lg border border-[var(--shresta-logo-border)] p-4">
        <p className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-[var(--gold-400)]">Primary Display Image - mandatory</p>
        <p className="mb-3 text-xs text-[var(--shresta-logo-muted)]">
          Upload the canonical main product image directly to R2. It will be linked when the product is approved.
        </p>
        <div className="max-w-md">
          <DirectMediaInput
            accept="image/jpeg,image/png,image/webp"
            captureMediaId
            fieldName="media"
            label="Upload primary canonical image"
            mediaType="PRODUCT_IMAGE"
            productId={reservation.productId}
            required
          />
        </div>
      </div>

      <div className="rounded-lg border border-[var(--shresta-logo-border)] p-4">
        <p className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-[var(--gold-400)]">Gallery Images - up to 4 optional</p>
        <p className="mb-4 text-xs text-[var(--shresta-logo-muted)]">
          Upload up to four additional canonical images. Empty slots are ignored.
        </p>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {([1, 2, 3, 4] as const).map((slot) => (
            <div className="rounded-lg border border-[var(--shresta-logo-border)] p-3" key={slot}>
              <DirectMediaInput
                accept="image/jpeg,image/png,image/webp"
                captureMediaId
                fieldName={`gallery${slot}`}
                label={`Gallery slot ${slot}`}
                mediaType="PRODUCT_IMAGE"
                productId={reservation.productId}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-[var(--shresta-logo-border)] p-4">
        <p className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-[var(--gold-400)]">Demo Video - optional</p>
        <p className="mb-3 text-xs text-[var(--shresta-logo-muted)]">
          Upload one canonical MP4, WebM, or QuickTime video directly to R2. Maximum duration is 30 seconds.
        </p>
        <div className="max-w-md">
          <DirectMediaInput
            accept="video/mp4,video/webm,video/quicktime"
            captureMediaId
            fieldName="video"
            label="Upload canonical demo video"
            mediaType="PRODUCT_VIDEO"
            productId={reservation.productId}
          />
        </div>
      </div>
    </>
  );
}
