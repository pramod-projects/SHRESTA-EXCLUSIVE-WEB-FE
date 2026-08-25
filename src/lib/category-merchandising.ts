import type { CategoryFamily } from "@/features/catalog/category-config";
import { ADMIN_COLOR_TAGS, ADMIN_MERCHANDISING_TAGS, enumDisplayLabel, toAdminTagValue } from "@/lib/admin-enums";

export const MERCHANDISING_ICON_NAMES = [
  "BadgeCheck",
  "Crown",
  "Flame",
  "Gem",
  "Heart",
  "Medal",
  "ShieldCheck",
  "ShoppingBag",
  "Sparkles",
  "Star",
  "Tag",
  "WandSparkles"
] as const;

export type MerchandisingIconName = (typeof MERCHANDISING_ICON_NAMES)[number];

export type MerchandisingTagOption = {
  value: string;
  label: string;
  icon: MerchandisingIconName;
};

export type ColorFilterOption = {
  value: string;
  label: string;
};

const DEFAULT_TAG_ICONS: Record<string, MerchandisingIconName> = {
  BESTSELLER: "Flame",
  BRIDAL: "Crown",
  EXCLUSIVE: "Gem",
  FEATURED: "Star",
  FESTIVE: "Sparkles",
  HANDLOOM: "WandSparkles",
  LIMITED_EDITION: "Medal",
  NEW_ARRIVAL: "Sparkles",
  PREMIUM: "BadgeCheck",
  SALE: "Tag"
};

export function merchandisingTags(metadata: Record<string, unknown>): MerchandisingTagOption[] {
  const isConfigured = Array.isArray(metadata.merchandisingTags);
  const configured = optionObjects(metadata.merchandisingTags)
    .map((option) => {
      const value = toAdminTagValue(text(option.value));
      const icon = text(option.icon);
      if (!value || value.startsWith("COLOR_") || !isMerchandisingIconName(icon)) return null;
      return { value, label: text(option.label) || enumDisplayLabel(value), icon };
    })
    .filter((option): option is MerchandisingTagOption => option !== null);
  if (isConfigured) return configured;
  return ADMIN_MERCHANDISING_TAGS.map((value) => ({
    value,
    label: enumDisplayLabel(value),
    icon: DEFAULT_TAG_ICONS[value] ?? "Tag"
  }));
}

export function colorFilters(metadata: Record<string, unknown>): ColorFilterOption[] {
  const isConfigured = Array.isArray(metadata.colorFilters);
  const configured = optionObjects(metadata.colorFilters)
    .map((option) => {
      const value = toAdminTagValue(text(option.value));
      return value.startsWith("COLOR_")
        ? { value, label: text(option.label) || enumDisplayLabel(value.replace(/^COLOR_/, "")) }
        : null;
    })
    .filter((option): option is ColorFilterOption => option !== null);
  if (isConfigured) return configured;
  return ADMIN_COLOR_TAGS.map((value) => ({ value, label: enumDisplayLabel(value.replace(/^COLOR_/, "")) }));
}

export function familyMerchandisingCatalog(categories: CategoryFamily[], familyKey: string) {
  const family = categories.find((category) => category.familyKey === familyKey);
  const metadata = family?.metadata ?? {};
  return { tags: merchandisingTags(metadata), colors: colorFilters(metadata) };
}

export function isMerchandisingIconName(value: string): value is MerchandisingIconName {
  return (MERCHANDISING_ICON_NAMES as readonly string[]).includes(value);
}

function optionObjects(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((option): option is Record<string, unknown> => Boolean(option) && typeof option === "object" && !Array.isArray(option))
    : [];
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
