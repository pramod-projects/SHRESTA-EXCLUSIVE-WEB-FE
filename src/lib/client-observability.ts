"use client";

type ErrorMetadata = Record<string, string | number | boolean | null | undefined>;

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }
  if (typeof error === "string") {
    return error;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown client error";
  }
}

export function reportClientNonFatal(context: string, error: unknown, metadata?: ErrorMetadata) {
  const details = formatError(error);
  if (metadata && Object.keys(metadata).length > 0) {
    console.warn(`[non-fatal] ${context}: ${details}`, metadata);
    return;
  }
  console.warn(`[non-fatal] ${context}: ${details}`);
}
