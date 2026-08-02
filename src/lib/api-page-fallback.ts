import { isShrestaApiUnavailableError } from "@/lib/api-client";

export async function nullWhenShrestaApiUnavailable<T>(load: () => Promise<T>): Promise<T | null> {
  try {
    return await load();
  } catch (error) {
    if (isShrestaApiUnavailableError(error)) {
      return null;
    }

    throw error;
  }
}
