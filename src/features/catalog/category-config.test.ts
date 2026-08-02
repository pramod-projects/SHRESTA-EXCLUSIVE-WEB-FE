import { describe, expect, it } from "vitest";
import { fetchCategoryFamilies } from "./category-config";
import type { FetchLike } from "@/lib/api-client";

describe("category-config", () => {
  it("fetches category configuration through the SHRESTA API client", async () => {
    const fetchImpl: FetchLike = async (input, init) => {
      expect(input).toBe("http://localhost:8090/api/v1/categories");
      expect(init?.cache).toBe("no-store");

      return new Response(JSON.stringify({
        success: true,
        data: [
          {
            familyKey: "silk_saree",
            displayName: "Silk Sarees",
            description: "Premium silk saree launch family",
            sortOrder: 20,
            metadata: { launch: true },
            productTypes: [],
            attributes: [],
            filters: [
              {
                filterKey: "silk_type",
                displayName: "Silk Type",
                attributeKey: "silk_type",
                frontendControl: "checkbox",
                backendMapping: "attribute_facets.silk_type",
                sortOrder: 10
              }
            ],
            taxes: [],
            styling: []
          }
        ],
        error: null,
        traceId: "trace-category",
        timestamp: "2026-07-05T00:00:00Z"
      }), {
        headers: { "Content-Type": "application/json" }
      });
    };

    const families = await fetchCategoryFamilies({
      apiBaseUrl: "http://localhost:8090",
      fetchImpl
    });

    expect(families[0]?.familyKey).toBe("silk_saree");
    expect(families[0]?.filters[0]?.backendMapping).toBe("attribute_facets.silk_type");
  });
});
