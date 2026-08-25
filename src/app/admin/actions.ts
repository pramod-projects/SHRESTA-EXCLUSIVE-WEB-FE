"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import {
  approveAdminChangeRequest,
  checkAdminOrderRefundStatus,
  approveAdminOrderRefund,
  createAdminChangeRequest,
  fetchAdminCategories,
  fetchAdminNotificationConfiguration,
  fetchAdminRefundPolicyConfiguration,
  fetchAdminStorefrontHome,
  rejectAdminChangeRequest,
  revealTestUserOtp,
  updateAdminOrderStatus,
  upsertAdminChangeRequest
} from "@/features/admin/admin-api";
import { requireAdminModuleAccess } from "@/features/admin/admin-acl";
import {
  buildNotificationConfigurationChangeRequest,
  NOTIFICATION_TYPES,
  type NotificationType
} from "@/features/admin/notification-configuration";
import { buildRefundPolicyChangeRequest } from "@/features/admin/refund-policy-configuration";
import { adminTagValues, assertEnumValue, enumValues, toEnumValue } from "@/lib/admin-enums";
import { familyMerchandisingCatalog, isMerchandisingIconName } from "@/lib/category-merchandising";

export type AdminActionResult = { ok: true; message: string } | { ok: false; error: string };

export async function updateNotificationConfigurationAction(_prev: AdminActionResult | null, formData: FormData): Promise<AdminActionResult> {
  try {
    const session = await requireAdminModuleAccess("notifications");
    const typeValue = requiredString(formData, "type");
    if (!NOTIFICATION_TYPES.includes(typeValue as NotificationType)) {
      throw new Error("Unknown notification type.");
    }

    const type = typeValue as NotificationType;
    const configuration = await fetchAdminNotificationConfiguration();
    const current = configuration.find((record) => record.type === type);
    if (!current) {
      throw new Error("Notification configuration could not be found.");
    }
    const request = buildNotificationConfigurationChangeRequest({
      type,
      enabled: checkboxValue(formData, "enabled"),
      productionLocked: current.productionLocked,
      actor: session.email,
      reason: requiredString(formData, "reason")
    });
    await upsertAdminChangeRequest(request, mutationOptions(formData), "CHANGE_SUBMITTER");
    revalidatePath("/admin/configurations");
    revalidatePath("/admin/review");
    return { ok: true, message: "Pending review created. The notification setting remains unchanged until an approver accepts it." };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to submit notification configuration for review." };
  }
}

export async function updateRefundPolicyConfigurationAction(_prev: AdminActionResult | null, formData: FormData): Promise<AdminActionResult> {
  try {
    const session = await requireAdminModuleAccess("notifications");
    const configuration = await fetchAdminRefundPolicyConfiguration();
    const rawDays = requiredString(formData, "eligibilityDays");
    const eligibilityDays = Number(rawDays);
    const request = buildRefundPolicyChangeRequest({
      eligibilityDays,
      actor: session.email,
      reason: requiredString(formData, "reason")
    });
    if (eligibilityDays === configuration.eligibilityDays) {
      throw new Error("Choose a refund window different from the live setting.");
    }
    await upsertAdminChangeRequest(request, mutationOptions(formData), "CHANGE_SUBMITTER");
    revalidatePath("/admin/configurations");
    revalidatePath("/admin/review");
    return { ok: true, message: "Pending review created. The refund policy remains unchanged until an approver accepts it." };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to submit the refund policy for review." };
  }
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
    return { ok: true, message: "Asset archive requested. An approver must confirm; the R2 object will be deleted on approval." };
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
    return { ok: true, message: "Permanent deletion requested. An approver must confirm; the R2 object will be destroyed on approval." };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to request delete." };
  }
}

const PRODUCT_MEDIA_SLOT_VALUES = ["PRIMARY", "GALLERY_1", "GALLERY_2", "GALLERY_3", "GALLERY_4", "VIDEO"] as const;

export async function linkAssetToProductAction(_prev: AdminActionResult | null, formData: FormData): Promise<AdminActionResult> {
  try {
    const assetKey = requiredString(formData, "assetKey");
    const itemKey = requiredString(formData, "itemKey");
    const slot = requiredString(formData, "slot");
    if (!PRODUCT_MEDIA_SLOT_VALUES.includes(slot as (typeof PRODUCT_MEDIA_SLOT_VALUES)[number])) {
      throw new Error("Unknown product media slot.");
    }
    await upsertAdminChangeRequest({
      requestType: "storefront-product-media-link",
      entityType: "storefront_home_items",
      entityKey: itemKey,
      action: "UPDATE",
      submittedBy: "SHRESTA catalog admin",
      payload: { assetKey, slot }
    }, mutationOptions(formData), "CHANGE_SUBMITTER");
    revalidatePath("/admin/assets");
    revalidatePath("/admin/review");
    return { ok: true, message: "Media link submitted for review. An approver must confirm before it goes live." };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to submit media link for review." };
  }
}

export async function updateAssetMetadataAction(
  _prev: AdminActionResult | null,
  formData: FormData
): Promise<AdminActionResult> {
  try {
    const assetKey = requiredString(formData, "assetKey");
    const tags = adminTagValues(formData.getAll("tags").filter((value): value is string => typeof value === "string"));
    await upsertAdminChangeRequest({
      requestType: "asset-metadata",
      entityType: "media_asset",
      entityKey: assetKey,
      action: "UPDATE",
      submittedBy: "SHRESTA asset admin",
      payload: {
        altText: optionalString(formData, "altText"),
        tags,
        seoTitle: optionalString(formData, "seoTitle"),
        seoDescription: optionalString(formData, "seoDescription"),
        clearTags: tags.length === 0,
        clearSeoTitle: !optionalString(formData, "seoTitle"),
        clearSeoDescription: !optionalString(formData, "seoDescription")
      }
    }, mutationOptions(formData), "CHANGE_SUBMITTER");
    revalidatePath("/admin/assets");
    revalidatePath("/admin/review");
    return { ok: true, message: `Metadata for ${assetKey} submitted for review.` };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to submit asset metadata." };
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
    assertProductSlug(slugVal);

    const familyKeyVal = optionalString(formData, "familyKey")?.trim();
    if (!familyKeyVal) return { ok: false, error: "Category family is required." };
    const productTypeVal = requiredString(formData, "productType");
    const productValues = validatedProductValues(formData);

    // SKU uniqueness: no other product may share this SKU
    const allProducts = await fetchAdminStorefrontHome();
    const skuConflict = allProducts.bestsellers.find((p) => p.sku === skuVal && p.id !== itemKey);
    if (skuConflict) return { ok: false, error: `SKU "${skuVal}" is already used by "${skuConflict.name}". Each product must have a unique SKU.` };
    const slugConflict = allProducts.bestsellers.find((p) => p.slug === slugVal && p.id !== itemKey);
    if (slugConflict) return { ok: false, error: `Slug "${slugVal}" is already used by "${slugConflict.name}".` };
    const categories = await fetchAdminCategories();
    assertProductTypeBelongsToFamily(categories, familyKeyVal, productTypeVal);

    // ── Nothing-changed guard ─────────────────────────────────────────────────
    const current = allProducts.bestsellers.find((p) => p.id === itemKey);
    if (current) {
      const badgesVal = listEnumValue(formData, "badges");
      const colorFilterVal = optionalString(formData, "colorFilter") ?? "";
      const descriptionVal = optionalString(formData, "description") ?? "";
      const longDescriptionVal = optionalString(formData, "longDescription") ?? "";
      const featuredVal = checkboxValue(formData, "featured");

      const unchanged =
        titleVal === current.name &&
        skuVal === current.sku &&
        slugVal === (current.slug ?? "") &&
        familyKeyVal === current.familyKey &&
        productTypeVal === current.productType &&
        productValues.pricePaise === current.pricePaise &&
        productValues.compareAtPricePaise === current.compareAtPricePaise &&
        productValues.rating === current.rating &&
        productValues.reviewCount === current.reviewCount &&
        productValues.stockQuantity === current.stockQuantity &&
        JSON.stringify([...badgesVal].map(toEnumValue).sort()) === JSON.stringify([...current.badges].map(toEnumValue).sort()) &&
        colorFilterVal === (current.colorFilter ?? "") &&
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
    metadata.productType = productTypeVal;
    metadata.pricePaise = productValues.pricePaise;
    metadata.compareAtPricePaise = productValues.compareAtPricePaise;
    metadata.rating = productValues.rating;
    metadata.reviewCount = productValues.reviewCount;
    metadata.stockQuantity = productValues.stockQuantity;
    metadata.badges = listEnumValue(formData, "badges");
    metadata.colorFilter = optionalString(formData, "colorFilter") ?? null;
    const catalog = familyMerchandisingCatalog(categories, familyKeyVal);
    assertProductMerchandisingSelection(
      metadata.badges as string[],
      metadata.colorFilter as string | null,
      catalog,
      current?.badges ?? []
    );
    metadata.badgeIcons = Object.fromEntries(
      catalog.tags.filter((tag) => (metadata.badges as string[]).includes(tag.value)).map((tag) => [tag.value, tag.icon])
    );
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
      galleryAssetKeys
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

    const opts = { idempotencyKey: randomUUID() };
    const assetKey = requiredString(formData, "mediaAssetKey");
    const mediaId = requiredString(formData, "mediaMediaId");

    await upsertAdminChangeRequest(
      {
        requestType: "storefront-product-image",
        entityType: "storefront_home_item",
        entityKey: productKey,
        action: "UPDATE",
        submittedBy: "SHRESTA catalog admin",
        payload: {
          newAssetKey: assetKey,
          mediaId,
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

    const opts = { idempotencyKey: randomUUID() };
    const assetKey = requiredString(formData, "mediaAssetKey");
    const mediaId = requiredString(formData, "mediaMediaId");

    const galleryAssetKeys = [
      optionalString(formData, "currentGalleryKey1") ?? "",
      optionalString(formData, "currentGalleryKey2") ?? "",
      optionalString(formData, "currentGalleryKey3") ?? "",
      optionalString(formData, "currentGalleryKey4") ?? ""
    ];
    galleryAssetKeys[slot - 1] = assetKey;

    await upsertAdminChangeRequest(
      {
        requestType: "storefront-product-gallery",
        entityType: "storefront_home_item",
        entityKey: `${productKey}:gallery:${slot}`,
        action: "UPDATE",
        submittedBy: "SHRESTA catalog admin",
        payload: {
          gallerySlot: slot,
          galleryAssetKey: assetKey,
          mediaId,
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

    const demoVideoAssetKey = optionalString(formData, "mediaAssetKey") ?? "";
    const mediaId = optionalString(formData, "mediaMediaId");

    await upsertAdminChangeRequest(
      {
        requestType: "storefront-product-video",
        entityType: "storefront_home_item",
        entityKey: productKey,
        action: "UPDATE",
        submittedBy: "SHRESTA catalog admin",
        payload: { demoVideoAssetKey, ...(mediaId ? { mediaId } : {}) }
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

export async function assignAssetToDisplayItemAction(
  _prev: AdminActionResult | null,
  formData: FormData
): Promise<AdminActionResult> {
  try {
    const itemKey = requiredString(formData, "itemKey");
    const uploadedAssetKey = optionalString(formData, "mediaAssetKey");
    const imageAssetKey = uploadedAssetKey ?? requiredString(formData, "selectedAssetKey");
    const imageMediaId = optionalString(formData, "mediaMediaId");

    await upsertAdminChangeRequest(
      {
        requestType: "storefront-display-image",
        entityType: "storefront_home_item",
        entityKey: itemKey,
        action: "UPDATE",
        submittedBy: "SHRESTA display admin",
        payload: { imageAssetKey, ...(imageMediaId ? { imageMediaId } : {}) }
      },
      mutationOptions(formData),
      "CHANGE_SUBMITTER"
    );

    revalidatePath("/admin/assets");
    revalidatePath("/admin/review");
    revalidatePath("/");
    return { ok: true, message: "Display image submitted for review." };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to submit display image." };
  }
}

export async function uploadDisplayVideoAction(
  _prev: AdminActionResult | null,
  formData: FormData
): Promise<AdminActionResult> {
  try {
    const itemKey = requiredString(formData, "itemKey");
    const videoAssetKey = requiredString(formData, "videoAssetKey");
    const videoMediaId = requiredString(formData, "videoMediaId");

    await upsertAdminChangeRequest(
      {
        requestType: "storefront-display-video",
        entityType: "storefront_home_item",
        entityKey: itemKey,
        action: "UPDATE",
        submittedBy: "SHRESTA display admin",
        payload: { videoAssetKey, videoMediaId }
      },
      mutationOptions(formData),
      "CHANGE_SUBMITTER"
    );

    revalidatePath("/admin/assets");
    revalidatePath("/admin/review");
    revalidatePath("/");
    return { ok: true, message: "Demo video submitted for review." };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to submit demo video." };
  }
}

export async function addProductAction(_prev: AdminActionResult | null, formData: FormData): Promise<AdminActionResult> {
  try {
    // ── Validation ────────────────────────────────────────────────────────────
    const titleVal = optionalString(formData, "title")?.trim();
    if (!titleVal) return { ok: false, error: "Product name is required." };
    if (titleVal.length < 2) return { ok: false, error: "Product name must be at least 2 characters." };

    const productValues = validatedProductValues(formData);

    const familyKeyVal = optionalString(formData, "familyKey")?.trim();
    if (!familyKeyVal) return { ok: false, error: "Category family is required." };

    const skuVal = requiredString(formData, "sku");
    const slugVal = requiredString(formData, "slug");
    const productType = requiredString(formData, "productType");
    assertProductSlug(slugVal);
    const categories = await fetchAdminCategories();
    assertProductTypeBelongsToFamily(categories, familyKeyVal, productType);
    const allProducts = await fetchAdminStorefrontHome();
    const skuConflict = allProducts.bestsellers.find((product) => product.sku === skuVal);
    if (skuConflict) return { ok: false, error: `SKU "${skuVal}" is already used by "${skuConflict.name}". Each product must have a unique SKU.` };
    const slugConflict = allProducts.bestsellers.find((product) => product.slug === slugVal);
    if (slugConflict) return { ok: false, error: `Slug "${slugVal}" is already used by "${slugConflict.name}".` };

    // ── Everything valid — proceed ────────────────────────────────────────────
    const opts = mutationOptions(formData);

    const itemKey = requiredString(formData, "productReservationId");

  const sortOrder = nonNegativeIntegerValue(formData, "sortOrder", 0);
  const featured = formData.get("featured") === "on";
  const badges = formData.getAll("badges").filter((b): b is string => typeof b === "string");
  const colorFilter = optionalString(formData, "colorFilter");

  const metadata: Record<string, unknown> = {
    sku: assertEnumValue(skuVal, "sku"),
    slug: slugVal,
    productType,
    longDescription: optionalString(formData, "longDescription") ?? null,
    ...productValues
  };
  if (badges.length > 0) metadata.badges = badges;
  if (colorFilter) metadata.colorFilter = colorFilter;
  const catalog = familyMerchandisingCatalog(categories, familyKeyVal);
  assertProductMerchandisingSelection(badges, colorFilter ?? null, catalog);
  metadata.badgeIcons = Object.fromEntries(
    catalog.tags.filter((tag) => badges.includes(tag.value)).map((tag) => [tag.value, tag.icon])
  );

  const payload: Record<string, unknown> = {
    sectionKey: "bestsellers",
    familyKey: familyKeyVal ?? null,
    title: titleVal,
    subtitle: optionalString(formData, "subtitle") ?? null,
    description: optionalString(formData, "description") ?? null,
    ctaLabel: optionalString(formData, "ctaLabel") ?? null,
    ctaHref: optionalString(formData, "ctaHref") ?? null,
    sortOrder,
    featured,
    metadata,
  };
  payload.mediaAssetKey = requiredString(formData, "mediaAssetKey");
  payload.mediaId = requiredString(formData, "mediaMediaId");

  const galleryAssetKeys = [1, 2, 3, 4]
    .map((slot) => optionalString(formData, `gallery${slot}AssetKey`) ?? "");
  if (galleryAssetKeys.some(Boolean)) payload.galleryAssetKeys = galleryAssetKeys;
  const galleryMediaIds = [1, 2, 3, 4]
    .map((slot) => optionalString(formData, `gallery${slot}MediaId`) ?? "");
  if (galleryMediaIds.some(Boolean)) payload.galleryMediaIds = galleryMediaIds;

  const demoVideoAssetKey = optionalString(formData, "videoAssetKey");
  if (demoVideoAssetKey) payload.demoVideoAssetKey = demoVideoAssetKey;
  const demoVideoMediaId = optionalString(formData, "videoMediaId");
  if (demoVideoMediaId) payload.demoVideoMediaId = demoVideoMediaId;

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

export async function createTestUserAction(formData: FormData) {
  await requireAdminModuleAccess("test-users");

  const displayName = requiredString(formData, "displayName");
  const email = requiredString(formData, "email").toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Email must be a valid address.");
  }
  const mobile = optionalString(formData, "mobile");
  if (mobile !== undefined && !/^[6-9]\d{9}$/.test(mobile)) {
    throw new Error("Mobile must be a 10-digit Indian number.");
  }

  await createAdminChangeRequest({
    requestType: "test-user-management",
    entityType: "customer_accounts",
    entityKey: email,
    action: "CREATE",
    submittedBy: "SHRESTA test-user admin",
    payload: { displayName, email, mobile, note: optionalString(formData, "note") }
  }, mutationOptions(formData), "CHANGE_SUBMITTER");

  revalidatePath("/admin/test-users");
  revalidatePath("/admin/review");
}

export async function deleteTestUserAction(formData: FormData) {
  await requireAdminModuleAccess("test-users");

  const customerId = requiredString(formData, "customerId");
  const reason = requiredString(formData, "reason");

  await upsertAdminChangeRequest({
    requestType: "test-user-management",
    entityType: "customer_accounts",
    entityKey: customerId,
    action: "DELETE",
    submittedBy: "SHRESTA test-user admin",
    payload: { customerId, reason }
  }, mutationOptions(formData), "CHANGE_SUBMITTER");

  revalidatePath("/admin/test-users");
  revalidatePath("/admin/review");
}

export type TestUserOtpRevealResult = { ok: true; otp: string } | { ok: false; error: string };

export async function revealTestUserOtpAction(formData: FormData): Promise<TestUserOtpRevealResult> {
  try {
    await requireAdminModuleAccess("test-users");
    const { otp } = await revealTestUserOtp(requiredString(formData, "customerId"));
    return { ok: true, otp };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to reveal the OTP." };
  }
}

export async function approveChangeRequestAction(
  _prev: AdminActionResult | null,
  formData: FormData
): Promise<AdminActionResult> {
  try {
    await approveAdminChangeRequest(requiredString(formData, "requestKey"), optionalString(formData, "reviewNote"), mutationOptions(formData));
    revalidatePath("/admin/assets");
    revalidatePath("/admin/review");
    return { ok: true, message: "Change approved." };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Approval failed." };
  }
}

export async function rejectChangeRequestAction(
  _prev: AdminActionResult | null,
  formData: FormData
): Promise<AdminActionResult> {
  try {
    await rejectAdminChangeRequest(requiredString(formData, "requestKey"), optionalString(formData, "reviewNote"), mutationOptions(formData));
    revalidatePath("/admin/assets");
    revalidatePath("/admin/review");
    return { ok: true, message: "Change rejected." };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Rejection failed." };
  }
}

export async function updateAdminOrderStatusAction(_prev: AdminActionResult | null, formData: FormData): Promise<AdminActionResult> {
  try {
    const orderNumber = requiredString(formData, "orderNumber");
    const fulfillmentStatus = requiredString(formData, "fulfillmentStatus");
    const note = optionalString(formData, "note");
    const opsReference = optionalString(formData, "opsReference");

    await updateAdminOrderStatus(orderNumber, {
      fulfillmentStatus,
      note,
      opsReference
    }, mutationOptions(formData));

    revalidatePath("/admin/orders");
    revalidatePath("/admin");
    revalidatePath("/account");
    return { ok: true, message: `Order ${orderNumber} updated.` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update order status." };
  }
}

export async function approveAdminOrderRefundAction(_prev: AdminActionResult | null, formData: FormData): Promise<AdminActionResult> {
  try {
    const orderNumber = requiredString(formData, "orderNumber");
    const note = optionalString(formData, "note");
    const opsReference = optionalString(formData, "opsReference");

    await approveAdminOrderRefund(orderNumber, {
      note,
      opsReference
    }, mutationOptions(formData));

    revalidatePath("/admin/orders");
    revalidatePath("/admin");
    revalidatePath("/account");
    return { ok: true, message: `Refund initiated for order ${orderNumber}.` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to approve refund." };
  }
}

export async function checkAdminOrderRefundStatusAction(_prev: AdminActionResult | null, formData: FormData): Promise<AdminActionResult> {
  try {
    const orderNumber = requiredString(formData, "orderNumber");
    const status = await checkAdminOrderRefundStatus(orderNumber);

    revalidatePath("/admin/orders");
    revalidatePath("/admin");
    revalidatePath("/account");
    return {
      ok: true,
      message: `${status.message} Razorpay status: ${status.razorpayStatus}${status.refundId ? ` (${status.refundId})` : ""}.`
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to check refund status." };
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

export async function updateCategoryMerchandisingAction(
  _prev: AdminActionResult | null,
  formData: FormData
): Promise<AdminActionResult> {
  try {
    const familyKey = requiredString(formData, "familyKey");
    const merchandisingTags = categoryOptions(formData, "merchandisingTags", true);
    const colorFilters = categoryOptions(formData, "colorFilters", false);
    await submitGovernedCategoryChange(
      formData,
      "category-merchandising",
      "category_family_config",
      familyKey,
      "UPDATE",
      { merchandisingTags, colorFilters }
    );
    revalidatePath("/admin/categories");
    revalidatePath("/admin/assets");
    revalidatePath("/admin/review");
    return { ok: true, message: "Tag and colour options submitted for review." };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to submit tag and colour options." };
  }
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

function integerValue(formData: FormData, name: string): number | undefined {
  const value = optionalString(formData, name);
  if (value === undefined) {
    return undefined;
  }

  if (!/^-?\d+$/.test(value)) {
    throw new Error(`${name} must be a valid integer`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) throw new Error(`${name} must be a safe integer`);
  return parsed;
}

function numberValue(formData: FormData, name: string): number | undefined {
  const value = optionalString(formData, name);
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${name} must be a valid number`);
  }

  return parsed;
}

function paiseValue(formData: FormData, name: string): number | undefined {
  const value = optionalString(formData, name);
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${name} must be a non-negative price`);
  }

  return Math.round(parsed * 100);
}

function validatedProductValues(formData: FormData) {
  const pricePaise = paiseValue(formData, "priceRupees");
  const compareAtPricePaise = paiseValue(formData, "compareAtPriceRupees") ?? 0;
  const rating = numberValue(formData, "rating") ?? 0;
  const reviewCount = nonNegativeIntegerValue(formData, "reviewCount", 0);
  const stockQuantity = nonNegativeIntegerValue(formData, "stockQuantity");
  if (!pricePaise || pricePaise <= 0) throw new Error("Selling price is required and must be greater than ₹0.");
  if (compareAtPricePaise > 0 && compareAtPricePaise < pricePaise) throw new Error("Compare-at price must be at least the selling price.");
  if (rating < 0 || rating > 5) throw new Error("Rating must be between 0 and 5.");
  return { pricePaise, compareAtPricePaise, rating, reviewCount, stockQuantity };
}

function nonNegativeIntegerValue(formData: FormData, name: string, fallback?: number): number {
  const value = integerValue(formData, name);
  if (value === undefined) {
    if (fallback !== undefined) return fallback;
    throw new Error(`${name} is required`);
  }
  if (value < 0) throw new Error(`${name} must be non-negative`);
  return value;
}

function assertProductSlug(slug: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error("Slug must contain lowercase letters, numbers, and single hyphens.");
  }
}

function assertProductTypeBelongsToFamily(categories: Awaited<ReturnType<typeof fetchAdminCategories>>, familyKey: string, productType: string) {
  const family = categories.find((category) => category.familyKey === familyKey);
  if (!family) throw new Error("The selected category family is not active.");
  if (!family.productTypes.some((type) => type.typeKey === productType)) {
    throw new Error("The selected product type does not belong to the selected category family.");
  }
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

function categoryOptions(
  formData: FormData,
  name: string,
  withIcon: boolean
): Array<{ value: string; label: string; icon?: string }> {
  const raw = requiredString(formData, name);
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed) || parsed.length > 50) {
    throw new Error(`${name} must contain at most 50 options.`);
  }
  const seen = new Set<string>();
  return parsed.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`${name} contains an invalid option.`);
    }
    const record = item as Record<string, unknown>;
    const value = assertEnumValue(typeof record.value === "string" ? record.value : "", `${name} value`);
    const label = typeof record.label === "string" ? record.label.trim() : "";
    if (!label || label.length > 80 || seen.has(value)) {
      throw new Error(`${name} values must be unique and have labels up to 80 characters.`);
    }
    seen.add(value);
    if (withIcon && value.startsWith("COLOR_")) {
      throw new Error("Product tag values cannot start with COLOR_.");
    }
    if (!withIcon && !value.startsWith("COLOR_")) {
      throw new Error("Colour filter values must start with COLOR_.");
    }
    if (!withIcon) return { value, label };
    const icon = typeof record.icon === "string" ? record.icon : "";
    if (!isMerchandisingIconName(icon)) {
      throw new Error(`${name} contains an unsupported icon.`);
    }
    return { value, label, icon };
  });
}

function assertProductMerchandisingSelection(
  tags: string[],
  color: string | null,
  catalog: ReturnType<typeof familyMerchandisingCatalog>,
  existingTags: string[] = []
) {
  const allowedTags = new Set([...catalog.tags.map((option) => option.value), ...existingTags]);
  const allowedColors = new Set(catalog.colors.map((option) => option.value));
  if (tags.some((tag) => !allowedTags.has(tag))) {
    throw new Error("One or more asset tags are not configured for the selected category.");
  }
  if (color && !allowedColors.has(color)) {
    throw new Error("The colour filter is not configured for the selected category.");
  }
}

function mutationOptions(formData: FormData) {
  return { idempotencyKey: requiredString(formData, "idempotencyKey") };
}
