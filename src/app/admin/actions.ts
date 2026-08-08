"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import {
  approveAdminChangeRequest,
  createAdminChangeRequest,
  fetchAdminStorefrontHome,
  rejectAdminChangeRequest,
  replaceAdminAssetImage,
  updateAdminOrderStatus,
  uploadAdminAssets,
  upsertAdminChangeRequest
} from "@/features/admin/admin-api";
import { assertAdminTagValues, assertEnumValue, enumValues, toEnumValue } from "@/lib/admin-enums";

export type AdminActionResult = { ok: true; message: string } | { ok: false; error: string };

export async function uploadAssetsAction(formData: FormData) {
  const uploadForm = new FormData();
  for (const file of formData.getAll("files")) {
    if (file instanceof File && file.size > 0) {
      uploadForm.append("files", file);
    }
  }

  appendOptional(uploadForm, "categoryFamilyKey", optionalString(formData, "categoryFamilyKey"));
  appendOptional(uploadForm, "categoryProductTypeKey", optionalString(formData, "categoryProductTypeKey"));
  appendOptional(uploadForm, "productSku", optionalEnumString(formData, "productSku", "productSku"));
  appendOptional(uploadForm, "altText", optionalString(formData, "altText"));
  appendOptional(uploadForm, "seoTitle", optionalString(formData, "seoTitle"));
  appendOptional(uploadForm, "seoDescription", optionalString(formData, "seoDescription"));
  for (const tag of listAdminTagValue(formData, "tags")) {
    uploadForm.append("tags", tag);
  }

  await uploadAdminAssets(uploadForm, mutationOptions(formData));
  revalidatePath("/admin/assets");
}

export async function replaceAssetImageAction(formData: FormData) {
  const assetKey = requiredString(formData, "assetKey");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Select an image file to replace this asset");
  }

  const replaceForm = new FormData();
  replaceForm.append("file", file);

  await replaceAdminAssetImage(assetKey, replaceForm, mutationOptions(formData));
  revalidatePath("/admin/assets");
  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/categories");
}

export async function updateAssetMetadataAction(formData: FormData) {
  const assetKey = requiredString(formData, "assetKey");
  const categoryFamilyKey = optionalString(formData, "categoryFamilyKey");
  const categoryProductTypeKey = optionalString(formData, "categoryProductTypeKey");
  const productSku = optionalEnumString(formData, "productSku", "productSku");
  const tags = listAdminTagValue(formData, "tags");
  const seoTitle = optionalString(formData, "seoTitle");
  const seoDescription = optionalString(formData, "seoDescription");

  await createAdminChangeRequest({
    requestType: "asset-metadata",
    entityType: "media_asset",
    entityKey: assetKey,
    action: "UPDATE",
    submittedBy: "SHRESTA asset admin",
    payload: {
      altText: requiredString(formData, "altText"),
      categoryFamilyKey,
      categoryProductTypeKey,
      productSku,
      tags,
      seoTitle,
      seoDescription,
      clearCategoryFamilyKey: categoryFamilyKey === undefined,
      clearCategoryProductTypeKey: categoryProductTypeKey === undefined,
      clearProductSku: productSku === undefined,
      clearTags: tags.length === 0,
      clearSeoTitle: seoTitle === undefined,
      clearSeoDescription: seoDescription === undefined
    }
  }, mutationOptions(formData), "CHANGE_SUBMITTER");
  revalidatePath("/admin/assets");
  revalidatePath("/admin/review");
}

export async function archiveAssetAction(_prev: AdminActionResult | null, formData: FormData): Promise<AdminActionResult> {
  try {
    const assetKey = requiredString(formData, "assetKey");
    await upsertAdminChangeRequest({
      requestType: "asset-removal",
      entityType: "media_asset",
      entityKey: assetKey,
      action: "ARCHIVE",
      submittedBy: "SHRESTA asset admin",
      payload: { assetKey }
    }, mutationOptions(formData), "CHANGE_SUBMITTER");
    revalidatePath("/admin/assets");
    revalidatePath("/admin/review");
    return { ok: true, message: "Asset archive requested. An approver must confirm — the file will be deleted from S3 on approval." };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to request archive." };
  }
}

export async function deleteAssetRequestAction(_prev: AdminActionResult | null, formData: FormData): Promise<AdminActionResult> {
  try {
    const assetKey = requiredString(formData, "assetKey");
    await upsertAdminChangeRequest({
      requestType: "asset-removal",
      entityType: "media_asset",
      entityKey: assetKey,
      action: "DELETE",
      submittedBy: "SHRESTA asset admin",
      payload: { assetKey }
    }, mutationOptions(formData), "CHANGE_SUBMITTER");
    revalidatePath("/admin/assets");
    revalidatePath("/admin/review");
    return { ok: true, message: "Permanent deletion requested. An approver must confirm — the file will be destroyed from S3 on approval." };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to request delete." };
  }
}

export async function submitAdminChangeRequestAction(formData: FormData) {
  const action = requiredString(formData, "requestAction");
  if (!["CREATE", "UPDATE", "ARCHIVE", "DELETE"].includes(action)) {
    throw new Error("requestAction must be CREATE, UPDATE, ARCHIVE, or DELETE");
  }

  await createAdminChangeRequest({
    requestType: requiredString(formData, "requestType"),
    entityType: requiredString(formData, "entityType"),
    entityKey: requiredString(formData, "entityKey"),
    action: action as "CREATE" | "UPDATE" | "ARCHIVE" | "DELETE",
    submittedBy: optionalString(formData, "submittedBy") ?? "SHRESTA admin",
    payload: jsonObjectValue(formData, "payload")
  }, mutationOptions(formData), "CHANGE_SUBMITTER");
  revalidatePath("/admin/categories");
  revalidatePath("/admin/assets");
  revalidatePath("/admin/merchandising");
  revalidatePath("/admin/review");
}

export async function bulkAssignAssetsAction(formData: FormData) {
  const assetKeys = listValue(formData, "assetKeys");
  const categoryFamilyKey = requiredString(formData, "categoryFamilyKey");
  const categoryProductTypeKey = optionalString(formData, "categoryProductTypeKey");
  await createAdminChangeRequest({
    requestType: "asset-bulk-category-assignment",
    entityType: "media_asset",
    entityKey: assetKeys.join(","),
    action: "UPDATE",
    submittedBy: "SHRESTA asset admin",
    payload: { assetKeys, categoryFamilyKey, categoryProductTypeKey }
  }, mutationOptions(formData), "CHANGE_SUBMITTER");
  revalidatePath("/admin/assets");
  revalidatePath("/admin/review");
}

export async function updateMerchandisingProductAction(_prev: AdminActionResult | null, formData: FormData): Promise<AdminActionResult> {
  try {
    const itemKey = requiredString(formData, "itemKey");

    // ── Validation ────────────────────────────────────────────────────────────
    const titleVal = optionalString(formData, "title")?.trim();
    if (!titleVal) return { ok: false, error: "Product name is required." };
    if (titleVal.length < 2) return { ok: false, error: "Product name must be at least 2 characters." };

    const skuVal = optionalString(formData, "sku")?.trim();
    if (!skuVal) return { ok: false, error: "SKU is required." };

    const slugVal = optionalString(formData, "slug")?.trim();
    if (!slugVal) return { ok: false, error: "Slug is required." };

    const familyKeyVal = optionalString(formData, "familyKey")?.trim();
    if (!familyKeyVal) return { ok: false, error: "Category family is required." };

    const priceStr = optionalString(formData, "priceRupees");
    const pricePaiseVal = priceStr !== undefined ? Math.round(Number.parseFloat(priceStr) * 100) : 0;
    if (!pricePaiseVal || pricePaiseVal <= 0) return { ok: false, error: "Selling price is required and must be greater than ₹0." };

    // SKU uniqueness: no other product may share this SKU
    const allProducts = await fetchAdminStorefrontHome();
    const skuConflict = allProducts.bestsellers.find((p) => p.sku === skuVal && p.id !== itemKey);
    if (skuConflict) return { ok: false, error: `SKU "${skuVal}" is already used by "${skuConflict.name}". Each product must have a unique SKU.` };

    // ── Nothing-changed guard ─────────────────────────────────────────────────
    const current = allProducts.bestsellers.find((p) => p.id === itemKey);
    if (current) {
      const compareAtPricePaiseVal = paiseValue(formData, "compareAtPriceRupees") ?? 0;
      const ratingVal = numberValue(formData, "rating") ?? 0;
      const reviewCountVal = integerValue(formData, "reviewCount") ?? 0;
      const stockQuantityVal = integerValue(formData, "stockQuantity") ?? 0;
      const badgesVal = listEnumValue(formData, "badges");
      const descriptionVal = optionalString(formData, "description") ?? "";
      const longDescriptionVal = optionalString(formData, "longDescription") ?? "";
      const featuredVal = checkboxValue(formData, "featured");
      const productTypeVal = requiredString(formData, "productType");

      const unchanged =
        titleVal === current.name &&
        skuVal === current.sku &&
        slugVal === (current.slug ?? "") &&
        familyKeyVal === current.familyKey &&
        productTypeVal === current.productType &&
        pricePaiseVal === current.pricePaise &&
        compareAtPricePaiseVal === current.compareAtPricePaise &&
        ratingVal === current.rating &&
        reviewCountVal === current.reviewCount &&
        stockQuantityVal === current.stockQuantity &&
        JSON.stringify([...badgesVal].map(toEnumValue).sort()) === JSON.stringify([...current.badges].map(toEnumValue).sort()) &&
        descriptionVal === (current.description ?? "") &&
        longDescriptionVal === (current.longDescription ?? "") &&
        featuredVal === current.isBestseller;

      if (unchanged) {
        return { ok: false, error: "No changes detected — nothing was submitted for review." };
      }
    }

    // ── Build payload ─────────────────────────────────────────────────────────
    const metadata = jsonObjectValue(formData, "metadata");
    metadata.sku = assertEnumValue(skuVal, "sku");
    metadata.slug = slugVal;
    metadata.productType = requiredString(formData, "productType");
    metadata.pricePaise = pricePaiseVal;
    metadata.compareAtPricePaise = paiseValue(formData, "compareAtPriceRupees") ?? 0;
    metadata.rating = numberValue(formData, "rating") ?? 0;
    metadata.reviewCount = integerValue(formData, "reviewCount") ?? 0;
    metadata.stockQuantity = integerValue(formData, "stockQuantity") ?? 0;
    metadata.badges = listEnumValue(formData, "badges");
    metadata.longDescription = optionalString(formData, "longDescription") ?? "";

    const galleryAssetKeys = [
      optionalString(formData, "galleryAssetKey1") ?? "",
      optionalString(formData, "galleryAssetKey2") ?? "",
      optionalString(formData, "galleryAssetKey3") ?? "",
      optionalString(formData, "galleryAssetKey4") ?? ""
    ];

    const payload = {
      familyKey: familyKeyVal,
      title: titleVal,
      subtitle: optionalString(formData, "subtitle"),
      description: optionalString(formData, "description"),
      ctaLabel: optionalString(formData, "ctaLabel"),
      ctaHref: optionalString(formData, "ctaHref"),
      sortOrder: integerValue(formData, "sortOrder"),
      featured: checkboxValue(formData, "featured"),
      metadata,
      galleryAssetKeys,
      demoVideoUrl: optionalString(formData, "demoVideoUrl") ?? "",
      media: {
        assetUrl: optionalString(formData, "mediaUrl"),
        altText: optionalString(formData, "mediaAltText"),
        widthPx: integerValue(formData, "mediaWidthPx"),
        heightPx: integerValue(formData, "mediaHeightPx"),
        deliveryMode: optionalString(formData, "mediaDeliveryMode")
      }
    };

    // ── Upsert (replace existing PENDING request if any) ──────────────────────
    await upsertAdminChangeRequest({
      requestType: "storefront-product-merchandising",
      entityType: "storefront_home_item",
      entityKey: itemKey,
      action: "UPDATE",
      submittedBy: "SHRESTA catalog admin",
      payload
    }, mutationOptions(formData), "CHANGE_SUBMITTER");

    revalidatePath("/admin/products");
    revalidatePath("/admin/merchandising");
    revalidatePath("/admin/review");
    revalidatePath("/admin/assets");
    revalidatePath("/products");
    revalidatePath("/");

    return { ok: true, message: `"${titleVal}" sent for review. An approver must confirm before changes go live.` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unexpected error. Please try again." };
  }
}

export async function uploadAndSetProductPrimaryImageAction(
  _prev: AdminActionResult | null,
  formData: FormData,
): Promise<AdminActionResult> {
  try {
    const productKey = requiredString(formData, "productKey");
    const oldAssetKey = optionalString(formData, "oldAssetKey");

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: "Select an image file to upload" };
    }

    const uploadForm = new FormData();
    uploadForm.append("files", file);
    const opts = { idempotencyKey: randomUUID() };
    const uploaded = await uploadAdminAssets(uploadForm, opts);
    const asset = uploaded[0];
    if (!asset) return { ok: false, error: "Upload returned no asset" };

    await upsertAdminChangeRequest(
      {
        requestType: "storefront-product-image",
        entityType: "storefront_home_item",
        entityKey: productKey,
        action: "UPDATE",
        submittedBy: "SHRESTA catalog admin",
        payload: {
          newAssetKey: asset.assetKey,
          ...(oldAssetKey ? { oldAssetKey } : {}),
          media: {
            assetUrl: asset.assetUrl,
            altText: asset.altText || file.name,
            widthPx: asset.widthPx,
            heightPx: asset.heightPx,
            deliveryMode: asset.deliveryMode
          }
        }
      },
      opts,
      "CHANGE_SUBMITTER"
    );

    revalidatePath("/admin/assets");
    revalidatePath("/admin/review");
    revalidatePath("/");
    revalidatePath("/products");
    return { ok: true, message: "Primary image uploaded and queued for review." };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Upload failed" };
  }
}

export async function uploadAndSetProductGalleryImageAction(
  _prev: AdminActionResult | null,
  formData: FormData,
): Promise<AdminActionResult> {
  try {
    const productKey = requiredString(formData, "productKey");
    const slot = integerValue(formData, "slot") ?? 1;
    const oldAssetKey = optionalString(formData, "oldAssetKey");

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: "Select an image file to upload" };
    }

    const uploadForm = new FormData();
    uploadForm.append("files", file);
    const opts = { idempotencyKey: randomUUID() };
    const uploaded = await uploadAdminAssets(uploadForm, opts);
    const asset = uploaded[0];
    if (!asset) return { ok: false, error: "Upload returned no asset" };

    const galleryAssetKeys = [
      optionalString(formData, "currentGalleryKey1") ?? "",
      optionalString(formData, "currentGalleryKey2") ?? "",
      optionalString(formData, "currentGalleryKey3") ?? "",
      optionalString(formData, "currentGalleryKey4") ?? ""
    ];
    galleryAssetKeys[slot - 1] = asset.assetKey;

    await upsertAdminChangeRequest(
      {
        requestType: "storefront-product-gallery",
        entityType: "storefront_home_item",
        entityKey: `${productKey}:gallery:${slot}`,
        action: "UPDATE",
        submittedBy: "SHRESTA catalog admin",
        payload: {
          gallerySlot: slot,
          galleryAssetKey: asset.assetKey,
          ...(oldAssetKey ? { oldAssetKey } : {})
        }
      },
      opts,
      "CHANGE_SUBMITTER"
    );

    revalidatePath("/admin/assets");
    revalidatePath("/admin/review");
    revalidatePath("/");
    revalidatePath("/products");
    return { ok: true, message: `Gallery slot ${slot} uploaded and queued for review.` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Upload failed" };
  }
}

export async function uploadAndSetProductVideoAction(
  _prev: AdminActionResult | null,
  formData: FormData,
): Promise<AdminActionResult> {
  try {
    const productKey = requiredString(formData, "productKey");
    const opts = { idempotencyKey: randomUUID() };

    const file = formData.get("file");
    let demoVideoUrl: string;

    if (file instanceof File && file.size > 0) {
      const uploadForm = new FormData();
      uploadForm.append("files", file);
      const uploaded = await uploadAdminAssets(uploadForm, opts);
      const asset = uploaded[0];
      if (!asset) return { ok: false, error: "Upload returned no asset" };
      demoVideoUrl = asset.assetUrl;
    } else {
      demoVideoUrl = optionalString(formData, "demoVideoUrl") ?? "";
    }

    await upsertAdminChangeRequest(
      {
        requestType: "storefront-product-video",
        entityType: "storefront_home_item",
        entityKey: productKey,
        action: "UPDATE",
        submittedBy: "SHRESTA catalog admin",
        payload: { demoVideoUrl }
      },
      opts,
      "CHANGE_SUBMITTER"
    );

    revalidatePath("/admin/assets");
    revalidatePath("/admin/review");
    revalidatePath("/");
    revalidatePath("/products");
    return { ok: true, message: "Video URL updated and queued for review." };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to update video" };
  }
}

export async function clearProductGallerySlotAction(
  _prev: AdminActionResult | null,
  formData: FormData,
): Promise<AdminActionResult> {
  try {
    const productKey = requiredString(formData, "productKey");
    const slot = integerValue(formData, "slot") ?? 1;
    const oldAssetKey = optionalString(formData, "oldAssetKey");
    const opts = { idempotencyKey: randomUUID() };

    await upsertAdminChangeRequest(
      {
        requestType: "storefront-product-gallery",
        entityType: "storefront_home_item",
        entityKey: `${productKey}:gallery:${slot}`,
        action: "UPDATE",
        submittedBy: "SHRESTA catalog admin",
        payload: {
          gallerySlot: slot,
          galleryAssetKey: "",
          ...(oldAssetKey ? { oldAssetKey } : {})
        }
      },
      opts,
      "CHANGE_SUBMITTER"
    );

    revalidatePath("/admin/assets");
    revalidatePath("/admin/review");
    revalidatePath("/");
    revalidatePath("/products");
    return { ok: true, message: `Gallery slot ${slot} cleared and queued for review.` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to clear slot" };
  }
}

export async function assignAssetToDisplayItemAction(formData: FormData) {
  const itemKey = requiredString(formData, "itemKey");
  const opts = mutationOptions(formData);

  let assetUrl: string;
  let altText: string;
  let widthPx: number;
  let heightPx: number;
  let deliveryMode: string;

  const file = formData.get("file");
  if (file instanceof File && file.size > 0) {
    const uploadForm = new FormData();
    uploadForm.append("files", file);
    const uploaded = await uploadAdminAssets(uploadForm, opts);
    const asset = uploaded[0];
    if (!asset) throw new Error("Upload returned no asset");
    assetUrl = asset.assetUrl;
    altText = asset.altText || file.name;
    widthPx = asset.widthPx;
    heightPx = asset.heightPx;
    deliveryMode = asset.deliveryMode;
  } else {
    assetUrl = requiredString(formData, "selectedAssetUrl");
    altText = optionalString(formData, "selectedAltText") ?? "";
    widthPx = parseInt(optionalString(formData, "selectedWidthPx") ?? "0", 10);
    heightPx = parseInt(optionalString(formData, "selectedHeightPx") ?? "0", 10);
    deliveryMode = optionalString(formData, "selectedDeliveryMode") ?? "s3-compatible-local";
  }

  await createAdminChangeRequest(
    {
      requestType: "storefront-product-merchandising",
      entityType: "storefront_home_item",
      entityKey: itemKey,
      action: "UPDATE",
      submittedBy: "SHRESTA display admin",
      payload: { media: { assetUrl, altText, widthPx, heightPx, deliveryMode } }
    },
    opts,
    "CHANGE_SUBMITTER"
  );

  revalidatePath("/admin/assets");
  revalidatePath("/admin/review");
  revalidatePath("/");
}

export async function addProductAction(_prev: AdminActionResult | null, formData: FormData): Promise<AdminActionResult> {
  try {
    // ── Validation ────────────────────────────────────────────────────────────
    const titleVal = optionalString(formData, "title")?.trim();
    if (!titleVal) return { ok: false, error: "Product name is required." };
    if (titleVal.length < 2) return { ok: false, error: "Product name must be at least 2 characters." };

    const priceStr = optionalString(formData, "priceRupees");
    const pricePaiseVal = priceStr !== undefined ? Math.round(Number.parseFloat(priceStr) * 100) : 0;
    if (!pricePaiseVal || pricePaiseVal <= 0) return { ok: false, error: "Selling price is required and must be greater than ₹0." };

    const familyKeyVal = optionalString(formData, "familyKey")?.trim();
    if (!familyKeyVal) return { ok: false, error: "Category family is required." };

    // SKU uniqueness check (only if a SKU was provided)
    const skuVal = optionalString(formData, "sku")?.trim();
    if (skuVal) {
      const allProducts = await fetchAdminStorefrontHome();
      const skuConflict = allProducts.bestsellers.find((p) => p.sku === skuVal);
      if (skuConflict) return { ok: false, error: `SKU "${skuVal}" is already used by "${skuConflict.name}". Each product must have a unique SKU.` };
    }

    // ── Everything valid — proceed ────────────────────────────────────────────
    const opts = mutationOptions(formData);

    const baseSlug = titleVal
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .substring(0, 70);
    const itemKey = `product-${baseSlug}-${Date.now().toString(36)}`;

  // Upload primary image if provided
  let mediaAssetKey: string | undefined;
  const imageFile = formData.get("imageFile");
  if (imageFile instanceof File && imageFile.size > 0) {
    const uploadForm = new FormData();
    uploadForm.append("files", imageFile);
    const uploaded = await uploadAdminAssets(uploadForm, opts);
    mediaAssetKey = uploaded[0]?.assetKey;
  }

  // Upload gallery images if provided (slots 1–4)
  const galleryAssetKeys: string[] = [];
  for (const slot of [1, 2, 3, 4] as const) {
    const file = formData.get(`galleryFile${slot}`);
    if (file instanceof File && file.size > 0) {
      const uploadForm = new FormData();
      uploadForm.append("files", file);
      const uploaded = await uploadAdminAssets(uploadForm, opts);
      galleryAssetKeys.push(uploaded[0]?.assetKey ?? "");
    } else {
      galleryAssetKeys.push("");
    }
  }
  // Trim trailing empty slots
  while (galleryAssetKeys.length > 0 && galleryAssetKeys[galleryAssetKeys.length - 1] === "") {
    galleryAssetKeys.pop();
  }

  // Demo video: file upload takes precedence over pasted URL
  let demoVideoUrl: string | undefined;
  const videoFile = formData.get("videoFile");
  if (videoFile instanceof File && videoFile.size > 0) {
    const uploadForm = new FormData();
    uploadForm.append("files", videoFile);
    const uploaded = await uploadAdminAssets(uploadForm, opts);
    demoVideoUrl = uploaded[0]?.assetUrl;
  } else {
    demoVideoUrl = optionalString(formData, "demoVideoUrl") ?? undefined;
  }

  const compareAtPricePaise = paiseValue(formData, "compareAtPriceRupees");
  const sku = skuVal;
  const productType = optionalString(formData, "productType");
  const sortOrderRaw = Number.parseInt(optionalString(formData, "sortOrder") ?? "", 10);
  const sortOrder = Number.isNaN(sortOrderRaw) ? 0 : sortOrderRaw;
  const featured = formData.get("featured") === "on";
  const ratingRaw = optionalString(formData, "rating");
  const reviewCountRaw = optionalString(formData, "reviewCount");
  const badges = formData.getAll("badges").filter((b): b is string => typeof b === "string");

  const metadata: Record<string, unknown> = { pricePaise: pricePaiseVal };
  if (compareAtPricePaise != null) metadata.compareAtPricePaise = compareAtPricePaise;
  if (sku) metadata.sku = sku;
  if (productType) metadata.productType = productType;
  if (ratingRaw) metadata.rating = Number.parseFloat(ratingRaw);
  if (reviewCountRaw) metadata.reviewCount = Number.parseInt(reviewCountRaw, 10);
  const stockQuantityRaw = optionalString(formData, "stockQuantity");
  if (stockQuantityRaw) metadata.stockQuantity = Number.parseInt(stockQuantityRaw, 10);
  if (badges.length > 0) metadata.badges = badges;

  const payload: Record<string, unknown> = {
    sectionKey: "bestsellers",
    familyKey: familyKeyVal ?? null,
    title: titleVal,
    subtitle: optionalString(formData, "subtitle") ?? null,
    description: optionalString(formData, "description") ?? null,
    longDescription: optionalString(formData, "longDescription") ?? null,
    ctaLabel: optionalString(formData, "ctaLabel") ?? null,
    ctaHref: optionalString(formData, "ctaHref") ?? null,
    sortOrder,
    featured,
    metadata,
  };
  if (mediaAssetKey) payload.mediaAssetKey = mediaAssetKey;
  if (galleryAssetKeys.length > 0) payload.galleryAssetKeys = galleryAssetKeys;
  if (demoVideoUrl) payload.demoVideoUrl = demoVideoUrl;

  await createAdminChangeRequest(
    {
      requestType: "storefront-product-create",
      entityType: "storefront_home_items",
      entityKey: itemKey,
      action: "CREATE",
      submittedBy: "SHRESTA catalog admin",
      payload,
    },
    opts,
    "CHANGE_SUBMITTER"
  );

  revalidatePath("/admin/assets");
  revalidatePath("/admin/review");
  revalidatePath("/");
  revalidatePath("/products");

  return { ok: true, message: `"${titleVal}" submitted for review. An approver must confirm before it goes live.` } satisfies AdminActionResult;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unexpected error. Please try again." } satisfies AdminActionResult;
  }
}

export async function approveChangeRequestAction(formData: FormData) {
  await approveAdminChangeRequest(requiredString(formData, "requestKey"), optionalString(formData, "reviewNote"), mutationOptions(formData));
  revalidatePath("/admin/review");
}

export async function rejectChangeRequestAction(formData: FormData) {
  await rejectAdminChangeRequest(requiredString(formData, "requestKey"), optionalString(formData, "reviewNote"), mutationOptions(formData));
  revalidatePath("/admin/review");
}

export async function updateAdminOrderStatusAction(_prev: AdminActionResult | null, formData: FormData): Promise<AdminActionResult> {
  try {
    const orderNumber = requiredString(formData, "orderNumber");
    const orderStatus = optionalString(formData, "orderStatus");
    const paymentStatus = optionalString(formData, "paymentStatus");
    const fulfillmentStatus = optionalString(formData, "fulfillmentStatus");
    const note = optionalString(formData, "note");

    await updateAdminOrderStatus(orderNumber, {
      orderStatus,
      paymentStatus,
      fulfillmentStatus,
      note
    }, mutationOptions(formData));

    revalidatePath("/admin/orders");
    revalidatePath("/admin");
    revalidatePath("/account");
    return { ok: true, message: `Order ${orderNumber} updated.` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update order status." };
  }
}

export async function createCategoryFamilyAction(formData: FormData) {
  const familyKey = requiredString(formData, "familyKey");
  const payload = {
    familyKey,
    displayName: requiredString(formData, "displayName"),
    description: optionalString(formData, "description"),
    sortOrder: integerValue(formData, "sortOrder"),
    metadata: jsonObjectValue(formData, "metadata")
  };
  await submitGovernedCategoryChange(formData, "category-family", "category_family_config", familyKey, "CREATE", payload);
  revalidatePath("/admin/categories");
  revalidatePath("/admin/review");
}

export async function updateCategoryFamilyAction(formData: FormData) {
  const familyKey = requiredString(formData, "familyKey");
  const payload = {
    displayName: requiredString(formData, "displayName"),
    description: optionalString(formData, "description"),
    sortOrder: integerValue(formData, "sortOrder"),
    metadata: jsonObjectValue(formData, "metadata")
  };
  await submitGovernedCategoryChange(formData, "category-family", "category_family_config", familyKey, "UPDATE", payload);
  revalidatePath("/admin/categories");
  revalidatePath("/admin/assets");
  revalidatePath("/admin/review");
}

export async function createProductTypeAction(formData: FormData) {
  const familyKey = requiredString(formData, "familyKey");
  const typeKey = requiredString(formData, "typeKey");
  const payload = {
    familyKey,
    typeKey,
    displayName: requiredString(formData, "displayName"),
    sortOrder: integerValue(formData, "sortOrder"),
    metadata: jsonObjectValue(formData, "metadata")
  };
  await submitGovernedCategoryChange(formData, "category-product-type", "category_product_type_config", `${familyKey}:${typeKey}`, "CREATE", payload);
  revalidatePath("/admin/categories");
  revalidatePath("/admin/review");
}

export async function updateProductTypeAction(formData: FormData) {
  const familyKey = requiredString(formData, "familyKey");
  const typeKey = requiredString(formData, "typeKey");
  const payload = {
    familyKey,
    typeKey,
    displayName: requiredString(formData, "displayName"),
    sortOrder: integerValue(formData, "sortOrder"),
    metadata: jsonObjectValue(formData, "metadata")
  };
  await submitGovernedCategoryChange(formData, "category-product-type", "category_product_type_config", `${familyKey}:${typeKey}`, "UPDATE", payload);
  revalidatePath("/admin/categories");
  revalidatePath("/admin/review");
}

export async function createAttributeAction(formData: FormData) {
  const familyKey = requiredString(formData, "familyKey");
  const attributeKey = requiredString(formData, "attributeKey");
  const payload = {
    familyKey,
    attributeKey,
    displayName: requiredString(formData, "displayName"),
    dataType: requiredString(formData, "dataType"),
    required: checkboxValue(formData, "required"),
    filterable: checkboxValue(formData, "filterable"),
    searchable: checkboxValue(formData, "searchable"),
    allowedValues: listValue(formData, "allowedValues"),
    sortOrder: integerValue(formData, "sortOrder")
  };
  await submitGovernedCategoryChange(formData, "category-attribute", "category_attribute_config", `${familyKey}:${attributeKey}`, "CREATE", payload);
  revalidatePath("/admin/categories");
  revalidatePath("/admin/review");
}

export async function updateAttributeAction(formData: FormData) {
  const familyKey = requiredString(formData, "familyKey");
  const attributeKey = requiredString(formData, "attributeKey");
  const payload = {
    familyKey,
    attributeKey,
    displayName: requiredString(formData, "displayName"),
    dataType: requiredString(formData, "dataType"),
    required: checkboxValue(formData, "required"),
    filterable: checkboxValue(formData, "filterable"),
    searchable: checkboxValue(formData, "searchable"),
    allowedValues: listValue(formData, "allowedValues"),
    sortOrder: integerValue(formData, "sortOrder")
  };
  await submitGovernedCategoryChange(formData, "category-attribute", "category_attribute_config", `${familyKey}:${attributeKey}`, "UPDATE", payload);
  revalidatePath("/admin/categories");
  revalidatePath("/admin/review");
}

export async function createFilterAction(formData: FormData) {
  const familyKey = requiredString(formData, "familyKey");
  const filterKey = requiredString(formData, "filterKey");
  const payload = {
    familyKey,
    filterKey,
    displayName: requiredString(formData, "displayName"),
    attributeKey: requiredString(formData, "attributeKey"),
    frontendControl: requiredString(formData, "frontendControl"),
    backendMapping: requiredString(formData, "backendMapping"),
    sortOrder: integerValue(formData, "sortOrder")
  };
  await submitGovernedCategoryChange(formData, "category-filter", "category_filter_config", `${familyKey}:${filterKey}`, "CREATE", payload);
  revalidatePath("/admin/categories");
  revalidatePath("/admin/review");
}

export async function updateFilterAction(formData: FormData) {
  const familyKey = requiredString(formData, "familyKey");
  const filterKey = requiredString(formData, "filterKey");
  const payload = {
    familyKey,
    filterKey,
    displayName: requiredString(formData, "displayName"),
    attributeKey: requiredString(formData, "attributeKey"),
    frontendControl: requiredString(formData, "frontendControl"),
    backendMapping: requiredString(formData, "backendMapping"),
    sortOrder: integerValue(formData, "sortOrder")
  };
  await submitGovernedCategoryChange(formData, "category-filter", "category_filter_config", `${familyKey}:${filterKey}`, "UPDATE", payload);
  revalidatePath("/admin/categories");
  revalidatePath("/admin/review");
}

export async function createTaxAction(formData: FormData) {
  const familyKey = requiredString(formData, "familyKey");
  const hsnCode = requiredString(formData, "hsnCode");
  const effectiveFrom = requiredString(formData, "effectiveFrom");
  const payload = {
    familyKey,
    hsnCode,
    gstRateBasisPoints: integerValue(formData, "gstRateBasisPoints"),
    effectiveFrom: requiredString(formData, "effectiveFrom"),
    effectiveTo: optionalString(formData, "effectiveTo") ?? null
  };
  await submitGovernedCategoryChange(formData, "category-tax", "category_tax_config", `${familyKey}:${hsnCode}:${effectiveFrom}`, "CREATE", payload);
  revalidatePath("/admin/categories");
  revalidatePath("/admin/review");
}

export async function updateTaxAction(formData: FormData) {
  const familyKey = requiredString(formData, "familyKey");
  const targetHsnCode = requiredString(formData, "targetHsnCode");
  const targetEffectiveFrom = requiredString(formData, "targetEffectiveFrom");
  const effectiveTo = optionalString(formData, "effectiveTo");

  const payload = {
    familyKey,
    targetHsnCode,
    targetEffectiveFrom,
    hsnCode: requiredString(formData, "hsnCode"),
    gstRateBasisPoints: integerValue(formData, "gstRateBasisPoints"),
    effectiveFrom: requiredString(formData, "effectiveFrom"),
    effectiveTo: effectiveTo ?? null,
    clearEffectiveTo: effectiveTo === undefined
  };
  await submitGovernedCategoryChange(formData, "category-tax", "category_tax_config", `${familyKey}:${targetHsnCode}:${targetEffectiveFrom}`, "UPDATE", payload);
  revalidatePath("/admin/categories");
  revalidatePath("/admin/review");
}

export async function createStylingAction(formData: FormData) {
  const familyKey = requiredString(formData, "familyKey");
  const occasionKey = requiredString(formData, "occasionKey");
  const payload = {
    familyKey,
    occasionKey,
    displayName: requiredString(formData, "displayName"),
    complementaryFamilyKeys: listValue(formData, "complementaryFamilyKeys"),
    rules: jsonObjectValue(formData, "rules"),
    sortOrder: integerValue(formData, "sortOrder")
  };
  await submitGovernedCategoryChange(formData, "category-styling", "category_styling_config", `${familyKey}:${occasionKey}`, "CREATE", payload);
  revalidatePath("/admin/categories");
  revalidatePath("/admin/review");
}

export async function updateStylingAction(formData: FormData) {
  const familyKey = requiredString(formData, "familyKey");
  const occasionKey = requiredString(formData, "occasionKey");
  const payload = {
    familyKey,
    occasionKey,
    displayName: requiredString(formData, "displayName"),
    complementaryFamilyKeys: listValue(formData, "complementaryFamilyKeys"),
    rules: jsonObjectValue(formData, "rules"),
    sortOrder: integerValue(formData, "sortOrder")
  };
  await submitGovernedCategoryChange(formData, "category-styling", "category_styling_config", `${familyKey}:${occasionKey}`, "UPDATE", payload);
  revalidatePath("/admin/categories");
  revalidatePath("/admin/review");
}

async function submitGovernedCategoryChange(
  formData: FormData,
  requestType: string,
  entityType: string,
  entityKey: string,
  action: "CREATE" | "UPDATE" | "ARCHIVE" | "DELETE",
  payload: Record<string, unknown>
) {
  await createAdminChangeRequest({
    requestType,
    entityType,
    entityKey,
    action,
    submittedBy: "SHRESTA catalog admin",
    payload
  }, mutationOptions(formData), "CHANGE_SUBMITTER");
}

function requiredString(formData: FormData, name: string): string {
  const value = optionalString(formData, name);
  if (value === undefined) {
    throw new Error(`${name} is required`);
  }

  return value;
}

function optionalString(formData: FormData, name: string): string | undefined {
  const value = formData.get(name);
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function optionalEnumString(formData: FormData, name: string, fieldName: string): string | undefined {
  const value = optionalString(formData, name);
  return value === undefined ? undefined : assertEnumValue(value, fieldName);
}

function integerValue(formData: FormData, name: string): number | undefined {
  const value = optionalString(formData, name);
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`${name} must be a valid integer`);
  }

  return parsed;
}

function numberValue(formData: FormData, name: string): number | undefined {
  const value = optionalString(formData, name);
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`${name} must be a valid number`);
  }

  return parsed;
}

function requiredPaiseValue(formData: FormData, name: string): number {
  const value = paiseValue(formData, name);
  if (value === undefined) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function paiseValue(formData: FormData, name: string): number | undefined {
  const value = optionalString(formData, name);
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed) || parsed < 0) {
    throw new Error(`${name} must be a non-negative price`);
  }

  return Math.round(parsed * 100);
}

function checkboxValue(formData: FormData, name: string): boolean {
  return formData.get(name) === "on";
}

function listValue(formData: FormData, name: string): string[] {
  const values = formData.getAll(name)
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);
  if (values.length === 0) {
    return [];
  }

  return values
    .flatMap((value) => value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean));
}

function listEnumValue(formData: FormData, name: string): string[] {
  return enumValues(listValue(formData, name));
}

function listAdminTagValue(formData: FormData, name: string): string[] {
  return assertAdminTagValues(listValue(formData, name), name);
}

function jsonObjectValue(formData: FormData, name: string): Record<string, unknown> {
  const value = optionalString(formData, name);
  if (value === undefined) {
    return {};
  }

  const parsed = JSON.parse(value) as unknown;
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${name} must be a JSON object`);
  }

  return parsed as Record<string, unknown>;
}

function appendOptional(formData: FormData, key: string, value: string | undefined) {
  if (value !== undefined) {
    formData.append(key, value);
  }
}

function mutationOptions(formData: FormData) {
  return { idempotencyKey: requiredString(formData, "idempotencyKey") };
}
