import { describe, expect, it } from "vitest";
import { buildCloudinaryUrl } from "./cloudinary";

describe("cloudinary", () => {
  it("builds a transformed URL from a public id", () => {
    const url = buildCloudinaryUrl("products/jhumka-001", { width: 800, format: "webp" }, "shresta-test");

    expect(url).toBe("https://res.cloudinary.com/shresta-test/image/upload/w_800,c_limit,q_auto,f_webp/products/jhumka-001");
  });

  it("rejects full URLs because only public_id is durable domain data", () => {
    expect(() => buildCloudinaryUrl("https://example.com/image.jpg", { width: 800 }, "shresta-test"))
      .toThrow("Cloudinary image source must be a public_id, not a URL");
  });

  it("requires a cloud name", () => {
    expect(() => buildCloudinaryUrl("products/jhumka-001", { width: 800 }, ""))
      .toThrow("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is required");
  });
});
