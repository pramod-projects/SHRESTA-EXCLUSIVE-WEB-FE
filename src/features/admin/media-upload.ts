import type {
  AssetResponse,
  MediaUploadAuthorizationRequest,
  MediaUploadAuthorizationResponse,
} from "@/features/admin/admin-api";

export type UploadProgress = (percent: number) => void;

export type CompletedMediaUpload = {
  mediaId: string;
  asset: AssetResponse;
};

export async function uploadCanonicalMedia(
  file: File,
  metadata: Omit<MediaUploadAuthorizationRequest, "contentType" | "originalFilename" | "byteSize">,
  onProgress: UploadProgress,
): Promise<CompletedMediaUpload> {
  const authorization = await postJson<MediaUploadAuthorizationResponse>("/api/admin-media/authorize", {
    ...metadata,
    contentType: file.type,
    originalFilename: file.name,
    byteSize: file.size,
  });
  await putWithProgress(file, authorization, onProgress);
  const asset = await postJson<AssetResponse>("/api/admin-media/complete", { mediaId: authorization.mediaId });
  return { mediaId: authorization.mediaId, asset };
}

async function putWithProgress(
  file: File,
  authorization: MediaUploadAuthorizationResponse,
  onProgress: UploadProgress,
): Promise<void> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await putOnce(file, authorization, onProgress);
      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Direct media upload failed");
    }
  }
  throw lastError ?? new Error("Direct media upload failed");
}

function putOnce(
  file: File,
  authorization: MediaUploadAuthorizationResponse,
  onProgress: UploadProgress,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", authorization.uploadUrl);
    Object.entries(authorization.requiredHeaders).forEach(([name, value]) => request.setRequestHeader(name, value));
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    request.onerror = () => reject(new Error("R2 upload could not be reached"));
    request.onabort = () => reject(new Error("R2 upload was cancelled"));
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress(100);
        resolve();
      } else {
        reject(new Error(`R2 upload failed with status ${request.status}`));
      }
    };
    request.send(file);
  });
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json() as T & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? "Media request failed");
  }
  return payload;
}
