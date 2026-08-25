import { afterEach, describe, expect, it, vi } from "vitest";
import { uploadCanonicalMedia } from "@/features/admin/media-upload";

class MockXmlHttpRequest {
  static statuses: number[] = [];
  static requests: MockXmlHttpRequest[] = [];

  status = 0;
  upload: { onprogress: ((event: ProgressEvent) => void) | null } = { onprogress: null };
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;
  onload: (() => void) | null = null;
  headers = new Map<string, string>();
  method = "";
  url = "";
  body: File | null = null;

  constructor() {
    MockXmlHttpRequest.requests.push(this);
  }

  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }

  setRequestHeader(name: string, value: string) {
    this.headers.set(name, value);
  }

  send(body: File) {
    this.body = body;
    this.upload.onprogress?.({ lengthComputable: true, loaded: body.size, total: body.size } as ProgressEvent);
    this.status = MockXmlHttpRequest.statuses.shift() ?? 200;
    this.onload?.();
  }
}

describe("uploadCanonicalMedia", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    MockXmlHttpRequest.requests = [];
    MockXmlHttpRequest.statuses = [];
  });

  it("uploads bytes directly with signed headers, then completes metadata", async () => {
    MockXmlHttpRequest.statuses = [200];
    vi.stubGlobal("XMLHttpRequest", MockXmlHttpRequest);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({
        mediaId: "media-id",
        assetKey: "asset-key",
        objectKey: "products/product-one/images/media-id.webp",
        uploadUrl: "https://r2.example/signed",
        expiresAt: "2026-08-13T12:10:00Z",
        contentType: "image/webp",
        requiredHeaders: {
          "content-type": "image/webp",
          "cache-control": "public,max-age=604800",
          "x-amz-meta-media-id": "media-id",
        },
      }))
      .mockResolvedValueOnce(response({ assetKey: "asset-key", status: "READY" }));
    vi.stubGlobal("fetch", fetchMock);
    const progress = vi.fn();
    const file = new File([new Uint8Array(12)], "saree.webp", { type: "image/webp" });

    const result = await uploadCanonicalMedia(file, {
      productId: "product-one",
      mediaType: "PRODUCT_IMAGE",
      widthPx: 1200,
      heightPx: 1600,
    }, progress);

    expect(result).toMatchObject({
      mediaId: "media-id",
      asset: { assetKey: "asset-key", status: "READY" },
    });
    expect(MockXmlHttpRequest.requests).toHaveLength(1);
    const [request] = MockXmlHttpRequest.requests;
    expect(request).toBeDefined();
    expect(request?.url).toBe("https://r2.example/signed");
    expect(request?.body).toBe(file);
    expect(request?.headers.get("x-amz-meta-media-id")).toBe("media-id");
    expect(progress).toHaveBeenCalledWith(100);
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/admin-media/complete", expect.objectContaining({ method: "POST" }));
  });

  it("retries one failed PUT without authorizing a second object", async () => {
    MockXmlHttpRequest.statuses = [500, 200];
    vi.stubGlobal("XMLHttpRequest", MockXmlHttpRequest);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({
        mediaId: "media-id",
        assetKey: "asset-key",
        objectKey: "products/product-one/images/media-id.webp",
        uploadUrl: "https://r2.example/signed",
        expiresAt: "2026-08-13T12:10:00Z",
        contentType: "image/webp",
        requiredHeaders: { "content-type": "image/webp" },
      }))
      .mockResolvedValueOnce(response({ assetKey: "asset-key", status: "READY" }));
    vi.stubGlobal("fetch", fetchMock);

    await uploadCanonicalMedia(
      new File([new Uint8Array(12)], "saree.webp", { type: "image/webp" }),
      { productId: "product-one", mediaType: "PRODUCT_IMAGE", widthPx: 1200, heightPx: 1600 },
      vi.fn(),
    );

    expect(MockXmlHttpRequest.requests).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("reports upload failure after one retry and never calls completion", async () => {
    MockXmlHttpRequest.statuses = [503, 503];
    vi.stubGlobal("XMLHttpRequest", MockXmlHttpRequest);
    const fetchMock = vi.fn().mockResolvedValueOnce(response({
      mediaId: "media-id",
      assetKey: "asset-key",
      objectKey: "products/product-one/images/media-id.webp",
      uploadUrl: "https://r2.example/signed",
      expiresAt: "2026-08-13T12:10:00Z",
      contentType: "image/webp",
      requiredHeaders: { "content-type": "image/webp" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(uploadCanonicalMedia(
      new File([new Uint8Array(12)], "saree.webp", { type: "image/webp" }),
      { productId: "product-one", mediaType: "PRODUCT_IMAGE", widthPx: 1200, heightPx: 1600 },
      vi.fn(),
    )).rejects.toThrow("R2 upload failed with status 503");

    expect(MockXmlHttpRequest.requests).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});

function response(body: unknown): Response {
  return { ok: true, json: async () => body } as Response;
}
