const ENUM_VALUE_PATTERN = /^[A-Z0-9][A-Z0-9_-]*$/;

export const ADMIN_TAG_MAX_COUNT = 16;
export const ADMIN_TAG_MAX_LENGTH = 40;
export const ADMIN_COLOR_TAGS = [
  "COLOR_RED", "COLOR_MAROON", "COLOR_PINK", "COLOR_ROSE", "COLOR_ORANGE",
  "COLOR_PEACH", "COLOR_YELLOW", "COLOR_GOLD", "COLOR_GREEN", "COLOR_OLIVE",
  "COLOR_EMERALD", "COLOR_TEAL", "COLOR_BLUE", "COLOR_NAVY", "COLOR_INDIGO",
  "COLOR_PURPLE", "COLOR_VIOLET", "COLOR_LAVENDER", "COLOR_BROWN", "COLOR_BLACK",
  "COLOR_WHITE", "COLOR_GREY", "COLOR_SILVER", "COLOR_BEIGE"
] as const;
export const ADMIN_MERCHANDISING_TAGS = [
  "NEW_ARRIVAL", "BESTSELLER", "FEATURED", "EXCLUSIVE", "LIMITED_EDITION",
  "SALE", "FESTIVE", "BRIDAL", "HANDLOOM", "PREMIUM"
] as const;
export const ADMIN_ASSET_TAG_OPTIONS = [...ADMIN_COLOR_TAGS, ...ADMIN_MERCHANDISING_TAGS] as const;

export function toEnumValue(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/&/g, " AND ")
    .replace(/[^A-Z0-9_-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/-+/g, "-")
    .replace(/^[_-]+|[_-]+$/g, "");
}

export function enumValues(values: readonly string[]): string[] {
  return Array.from(new Set(values.map(toEnumValue).filter(Boolean))).sort((left, right) => left.localeCompare(right));
}

export function toAdminTagValue(value: string): string {
  return limitEnumValue(toEnumValue(value), ADMIN_TAG_MAX_LENGTH);
}

export function adminTagValues(values: readonly string[]): string[] {
  return Array.from(new Set(values.map(toAdminTagValue).filter(Boolean)))
    .slice(0, ADMIN_TAG_MAX_COUNT)
    .sort((left, right) => left.localeCompare(right));
}

export function adminTagOptions(values: readonly string[]): string[] {
  return Array.from(new Set(values.map(toAdminTagValue).filter(Boolean)))
    .sort((left, right) => left.localeCompare(right));
}

export function ensureAdminTagOptions(options: readonly string[], values: readonly string[]): string[] {
  return adminTagOptions([...options, ...values]);
}

export function assertEnumValue(value: string, fieldName: string): string {
  const normalized = toEnumValue(value);
  if (!ENUM_VALUE_PATTERN.test(normalized)) {
    throw new Error(`${fieldName} must be uppercase and contain only A-Z, 0-9, hyphen, or underscore`);
  }
  return normalized;
}

export function enumDisplayLabel(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function limitEnumValue(value: string, maxLength: number): string {
  return value
    .slice(0, maxLength)
    .replace(/^[_-]+|[_-]+$/g, "");
}
