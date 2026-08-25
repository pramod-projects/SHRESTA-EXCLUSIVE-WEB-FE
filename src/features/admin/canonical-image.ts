export type CanonicalImageOptions = {
  maxWidth: number;
  maxHeight: number;
  maxFileSize: number;
  outputType?: "image/webp" | "image/jpeg";
  quality?: number;
};

export type CanonicalImage = {
  file: File;
  width: number;
  height: number;
};

export async function prepareCanonicalImage(
  source: File,
  options: CanonicalImageOptions,
): Promise<CanonicalImage> {
  if (!source.type.startsWith("image/")) {
    throw new Error("Select an image file");
  }
  const bitmap = await createImageBitmap(source);
  try {
    const scale = Math.min(1, options.maxWidth / bitmap.width, options.maxHeight / bitmap.height);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    if (scale === 1 && source.size <= options.maxFileSize && ["image/jpeg", "image/png", "image/webp"].includes(source.type)) {
      return { file: source, width, height };
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Image preparation is not supported by this browser");
    }
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, 0, 0, width, height);
    const outputType = options.outputType ?? "image/webp";
    const blob = await canvasBlob(canvas, outputType, options.quality ?? 0.9);
    if (blob.size > options.maxFileSize) {
      throw new Error("Prepared image exceeds the configured file-size limit");
    }
    const extension = outputType === "image/webp" ? "webp" : "jpg";
    const baseName = source.name.replace(/\.[^.]+$/, "") || "image";
    return {
      file: new File([blob], `${baseName}.${extension}`, { type: outputType }),
      width,
      height,
    };
  } finally {
    bitmap.close();
  }
}

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Image preparation failed")), type, quality);
  });
}
