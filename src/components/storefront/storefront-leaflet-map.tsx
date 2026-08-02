"use client";

import { useEffect, useRef, useState } from "react";
import type { StoreLocation } from "@/features/storefront/storefront-stores";

type LeafletApi = typeof import("leaflet");
type LeafletMap = import("leaflet").Map;
type LeafletMarker = import("leaflet").Marker;
type LeafletLatLngExpression = import("leaflet").LatLngExpression;

type StorefrontLeafletMapProps = {
  stores: StoreLocation[];
  selectedStore: StoreLocation | null;
  onSelect: (storeKey: string) => void;
};

const INDIA_CENTER: LeafletLatLngExpression = [20.5937, 78.9629];
const INDIA_ZOOM = 5;
const SELECTED_STORE_ZOOM = 14;

export function StorefrontLeafletMap({ stores, selectedStore, onSelect }: StorefrontLeafletMapProps) {
  const [isMapReady, setIsMapReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<LeafletApi | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<Map<string, LeafletMarker>>(new Map());

  useEffect(() => {
    let disposed = false;
    const markers = markersRef.current;

    import("leaflet").then((leaflet) => {
      if (disposed || !containerRef.current || mapRef.current) {
        return;
      }

      leafletRef.current = leaflet;
      mapRef.current = leaflet.map(containerRef.current, {
        attributionControl: false,
        scrollWheelZoom: true,
        zoomControl: true
      }).setView(INDIA_CENTER, INDIA_ZOOM);

      leaflet.control.attribution({ prefix: false })
        .addAttribution('&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>')
        .addTo(mapRef.current);

      leaflet.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19
      }).addTo(mapRef.current);

      setIsMapReady(true);
    });

    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
      leafletRef.current = null;
      markers.clear();
      setIsMapReady(false);
    };
  }, []);

  useEffect(() => {
    const leaflet = leafletRef.current;
    const map = mapRef.current;
    if (!isMapReady || !leaflet || !map) {
      return;
    }

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    stores.forEach((store) => {
      const selected = selectedStore?.storeKey === store.storeKey;
      const marker = leaflet.marker([store.coordinates.latitude, store.coordinates.longitude], {
        icon: markerIcon(leaflet, store, selected)
      })
        .addTo(map)
        .bindPopup(popupHtml(store), { closeButton: false, offset: [0, -8] });

      marker.on("click", () => onSelect(store.storeKey));
      markersRef.current.set(store.storeKey, marker);
    });
  }, [isMapReady, onSelect, selectedStore?.storeKey, stores]);

  useEffect(() => {
    const leaflet = leafletRef.current;
    const map = mapRef.current;
    if (!isMapReady || !leaflet || !map) {
      return;
    }

    if (selectedStore) {
      const selectedMarker = markersRef.current.get(selectedStore.storeKey);
      map.flyTo(
        [selectedStore.coordinates.latitude, selectedStore.coordinates.longitude],
        SELECTED_STORE_ZOOM,
        { animate: true, duration: 0.8 }
      );
      selectedMarker?.openPopup();
      return;
    }

    if (stores.length > 1) {
      const bounds = leaflet.latLngBounds(stores.map((store) => [store.coordinates.latitude, store.coordinates.longitude]));
      map.fitBounds(bounds, { animate: true, maxZoom: INDIA_ZOOM, padding: [42, 42] });
      return;
    }

    if (stores.length === 1) {
      const store = stores[0];
      if (store) {
        map.flyTo([store.coordinates.latitude, store.coordinates.longitude], 11, { animate: true, duration: 0.6 });
      }
      return;
    }

    map.setView(INDIA_CENTER, INDIA_ZOOM);
  }, [isMapReady, selectedStore, stores]);

  return (
    <div className="relative h-full w-full">
      <div className="h-full w-full" data-testid="store-leaflet-map" ref={containerRef} />
      {!isMapReady ? (
        <div className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(135deg,rgba(26,9,12,0.92),rgba(72,16,37,0.68))]">
          <p className="text-sm font-medium text-white/65">Loading India service map...</p>
        </div>
      ) : null}
    </div>
  );
}

function markerIcon(leaflet: LeafletApi, store: StoreLocation, selected: boolean) {
  const sameDay = store.fulfillment.sameDayAvailable;
  const background = selected ? "#1A090C" : sameDay ? "#D4AF37" : "#5A1D2D";
  const border = selected ? "#F6D56B" : "#FFFFFF";
  const size = selected ? 38 : sameDay ? 34 : 30;

  return leaflet.divIcon({
    className: "shresta-store-marker",
    html: `
      <div style="
        width:${size}px;
        height:${size}px;
        border-radius:999px;
        border:3px solid ${border};
        background:${background};
        box-shadow:0 14px 34px rgba(0,0,0,0.34);
        display:flex;
        align-items:center;
        justify-content:center;
      ">
        <span style="
          width:8px;
          height:8px;
          border-radius:999px;
          background:${selected ? "#F6D56B" : "#FFFFFF"};
          display:block;
        "></span>
      </div>
    `,
    iconAnchor: [size / 2, size / 2],
    iconSize: [size, size],
    popupAnchor: [0, -size / 2]
  });
}

function popupHtml(store: StoreLocation) {
  const addressLine2 = store.address.addressLine2 ? `, ${escapeHtml(store.address.addressLine2)}` : "";
  return `
    <div style="min-width:220px;font-family:Inter,system-ui,sans-serif;color:#3A141A">
      <p style="margin:0 0 6px 0;font-size:15px;font-weight:700">${escapeHtml(store.displayName)}</p>
      <p style="margin:0 0 8px 0;font-size:12px;line-height:1.45;color:#6B3B42">
        ${escapeHtml(store.address.addressLine1)}${addressLine2}<br />
        ${escapeHtml(store.address.locality)}, ${escapeHtml(store.address.city)} ${escapeHtml(store.address.postalCode)}
      </p>
      <p style="margin:0;font-size:12px;color:#6B3B42">
        ${escapeHtml(store.fulfillment.deliveryPromise)} delivery | ${escapeHtml(store.fulfillment.pickupPromise)} pickup
      </p>
    </div>
  `;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
