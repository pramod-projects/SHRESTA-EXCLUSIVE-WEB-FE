import { requestApi, type FetchLike } from "@/lib/api-client";

export type CategoryFamily = {
  familyKey: string;
  displayName: string;
  description: string | null;
  sortOrder: number;
  metadata: Record<string, unknown>;
  productTypes: CategoryProductType[];
  attributes: CategoryAttribute[];
  filters: CategoryFilter[];
  taxes: CategoryTax[];
  styling: CategoryStyling[];
};

export type CategoryProductType = {
  typeKey: string;
  displayName: string;
  sortOrder: number;
  metadata: Record<string, unknown>;
};

export type CategoryAttribute = {
  attributeKey: string;
  displayName: string;
  dataType: string;
  required: boolean;
  filterable: boolean;
  searchable: boolean;
  allowedValues: string[];
  sortOrder: number;
};

export type CategoryFilter = {
  filterKey: string;
  displayName: string;
  attributeKey: string;
  frontendControl: string;
  backendMapping: `attribute_facets.${string}`;
  sortOrder: number;
};

export type CategoryTax = {
  hsnCode: string;
  gstRateBasisPoints: number;
  effectiveFrom: string;
  effectiveTo: string | null;
};

export type CategoryStyling = {
  occasionKey: string;
  displayName: string;
  complementaryFamilyKeys: string[];
  rules: Record<string, unknown>;
  sortOrder: number;
};

export type FetchCategoryFamiliesOptions = {
  apiBaseUrl?: string;
  fetchImpl?: FetchLike;
};

export function fetchCategoryFamilies(options: FetchCategoryFamiliesOptions = {}): Promise<CategoryFamily[]> {
  return requestApi<CategoryFamily[]>("/api/v1/categories", {
    apiBaseUrl: options.apiBaseUrl,
    fetchImpl: options.fetchImpl,
    cache: "no-store"
  });
}
