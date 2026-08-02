import { requestApi, type FetchLike } from "@/lib/api-client";

export type StorefrontStores = {
  section: StorefrontStoresSection;
  stores: StoreLocation[];
  cities: string[];
  states: string[];
  serviceModes: string[];
};

export type StorefrontStoresSection = {
  eyebrow: string;
  title: string;
  description: string;
  serviceNote: string;
};

export type StoreLocation = {
  storeKey: string;
  displayName: string;
  shortName: string;
  status: "ACTIVE" | "SERVICE_ONLY" | "OPENING_SOON" | string;
  address: StoreAddress;
  coordinates: StoreCoordinates;
  contact: StoreContact;
  supportedFamilyKeys: string[];
  serviceModes: string[];
  highlights: string[];
  openingHours: StoreOpeningHour[];
  fulfillment: StoreFulfillment;
  sortOrder: number;
};

export type StoreAddress = {
  addressLine1: string;
  addressLine2: string | null;
  locality: string;
  city: string;
  state: string;
  postalCode: string;
  countryCode: string;
};

export type StoreCoordinates = {
  latitude: number;
  longitude: number;
};

export type StoreContact = {
  phone: string | null;
  whatsappNumber: string | null;
  email: string | null;
};

export type StoreOpeningHour = {
  day: string;
  opensAt: string;
  closesAt: string;
  closed: boolean;
};

export type StoreFulfillment = {
  deliveryRadiusKm: number;
  sameDayAvailable: boolean;
  appointmentRequired: boolean;
  deliveryPromise: string;
  pickupPromise: string;
};

export type FetchStorefrontStoresOptions = {
  apiBaseUrl?: string;
  fetchImpl?: FetchLike;
};

export function fetchStorefrontStores(options: FetchStorefrontStoresOptions = {}): Promise<StorefrontStores> {
  return requestApi<StorefrontStores>("/api/v1/storefront/stores", {
    apiBaseUrl: options.apiBaseUrl,
    fetchImpl: options.fetchImpl,
    cache: "no-store"
  });
}
