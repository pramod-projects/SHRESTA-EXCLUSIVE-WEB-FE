import { isShrestaApiUnavailableError, ShrestaApiError } from "@/lib/api-client";

export async function nullWhenShrestaApiUnavailable<T>(load: () => Promise<T>): Promise<T | null> {
  try {
    return await load();
  } catch (error) {
    if (isShrestaApiUnavailableError(error) || isTransientApiError(error)) {
      return null;
    }

    throw error;
  }
}

function isTransientApiError(error: unknown): boolean {
  return error instanceof ShrestaApiError
    && (error.code === "INVALID_ENVELOPE" || error.status === 429 || error.status >= 500);
}
