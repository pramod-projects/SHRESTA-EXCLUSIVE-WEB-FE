import { afterEach, describe, expect, it, vi } from "vitest";
import { prepareCanonicalImage } from "@/features/admin/canonical-image";

describe("prepareCanonicalImage", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("keeps an in-bounds canonical file without upscaling or re-encoding", async () => {
    const close = vi.fn();
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue({ width: 1200, height: 1600, close }));
    const source = new File([new Uint8Array(200)], "saree.webp", { type: "image/webp" });

    const result = await prepareCanonicalImage(source, {
      maxWidth: 4000,
      maxHeight: 5333,
      maxFileSize: 15_000_000,
    });

    expect(result).toEqual({ file: source, width: 1200, height: 1600 });
    expect(close).toHaveBeenCalledOnce();
  });

  it("downscales once to fit both configured dimensions", async () => {
    const close = vi.fn();
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue({ width: 6000, height: 8000, close }));
    const drawImage = vi.fn();
    const canvas = document.createElement("canvas");
    vi.spyOn(canvas, "getContext").mockReturnValue({
      drawImage,
      imageSmoothingEnabled: false,
      imageSmoothingQuality: "low",
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(canvas, "toBlob").mockImplementation((callback) => callback(new Blob([new Uint8Array(100)], { type: "image/webp" })));
    vi.spyOn(document, "createElement").mockReturnValue(canvas);
    const source = new File([new Uint8Array(200)], "large.jpg", { type: "image/jpeg" });

    const result = await prepareCanonicalImage(source, {
      maxWidth: 4000,
      maxHeight: 5333,
      maxFileSize: 15_000_000,
    });

    expect(result.width).toBe(4000);
    expect(result.height).toBe(5333);
    expect(result.file.type).toBe("image/webp");
    expect(drawImage).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledOnce();
  });
});
