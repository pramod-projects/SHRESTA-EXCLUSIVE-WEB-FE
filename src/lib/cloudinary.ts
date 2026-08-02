type CloudinaryFormat = "auto" | "webp" | "avif";
type CloudinaryCrop = "fill" | "fit" | "limit";

export type CloudinaryImageOptions = {
  width: number;
  height?: number;
  quality?: "auto" | number;
  format?: CloudinaryFormat;
  crop?: CloudinaryCrop;
};

export function buildCloudinaryUrl(
  publicId: string,
  options: CloudinaryImageOptions,
  cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
): string {
  if (!cloudName) {
    throw new Error("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is required");
  }

  if (!publicId || publicId.startsWith("http://") || publicId.startsWith("https://")) {
    throw new Error("Cloudinary image source must be a public_id, not a URL");
  }

  if (!Number.isSafeInteger(options.width) || options.width <= 0) {
    throw new Error("Cloudinary width must be a positive safe integer");
  }

  const transforms = [
    `w_${options.width}`,
    options.height ? `h_${options.height}` : undefined,
    `c_${options.crop ?? "limit"}`,
    `q_${options.quality ?? "auto"}`,
    `f_${options.format ?? "auto"}`
  ].filter(Boolean);

  return `https://res.cloudinary.com/${cloudName}/image/upload/${transforms.join(",")}/${publicId}`;
}
