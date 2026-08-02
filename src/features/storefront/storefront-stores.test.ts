import { fetchStorefrontStores } from "./storefront-stores";

describe("fetchStorefrontStores", () => {
  it("loads backend-owned stores from the SHRESTA API envelope", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      success: true,
      data: {
        section: {
          eyebrow: "Network",
          title: "Store Locator",
          description: "Find service coverage.",
          serviceNote: "DB-owned"
        },
        stores: [
          {
            storeKey: "bengaluru-premium-hub",
            displayName: "SHRESTA EXCLUSIVE Bengaluru Premium Hub",
            shortName: "Bengaluru Hub",
            status: "ACTIVE",
            address: {
              addressLine1: "Level 2",
              addressLine2: null,
              locality: "Ashok Nagar",
              city: "Bengaluru",
              state: "Karnataka",
              postalCode: "560001",
              countryCode: "IN"
            },
            coordinates: { latitude: 12.97, longitude: 77.6 },
            contact: { phone: "+91-80-4567-1100", whatsappNumber: "+91-90080-11000", email: "bengaluru@shrestaexclusive.com" },
            supportedFamilyKeys: ["silk_saree"],
            serviceModes: ["same_day_delivery"],
            highlights: ["Personal consultation"],
            openingHours: [{ day: "Mon-Sat", opensAt: "10:00", closesAt: "20:30", closed: false }],
            fulfillment: {
              deliveryRadiusKm: 12,
              sameDayAvailable: true,
              appointmentRequired: false,
              deliveryPromise: "90-180 min",
              pickupPromise: "45 min"
            },
            sortOrder: 10
          }
        ],
        cities: ["Bengaluru"],
        states: ["Karnataka"],
        serviceModes: ["same_day_delivery"]
      },
      error: null,
      traceId: "test-trace",
      timestamp: "2026-07-05T00:00:00Z"
    })));

    const stores = await fetchStorefrontStores({ apiBaseUrl: "http://localhost:8090", fetchImpl });

    expect(stores.section.title).toBe("Store Locator");
    expect(stores.stores[0].address.city).toBe("Bengaluru");
    expect(fetchImpl).toHaveBeenCalledWith("http://localhost:8090/api/v1/storefront/stores", expect.any(Object));
  });
});
