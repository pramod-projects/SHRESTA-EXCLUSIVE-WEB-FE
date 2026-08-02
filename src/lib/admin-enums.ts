const ENUM_VALUE_PATTERN = /^[A-Z0-9][A-Z0-9_-]*$/;

export const ADMIN_TAG_MAX_COUNT = 16;
export const ADMIN_TAG_MAX_LENGTH = 40;
export const ADMIN_TAG_PATTERN = /^[A-Z0-9][A-Z0-9_-]{0,39}$/;

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

export function ensureEnumOption(options: readonly string[], value: string | null | undefined): string[] {
  const normalized = value ? toEnumValue(value) : "";
  return normalized && !options.includes(normalized) ? enumValues([...options, normalized]) : [...options];
}

export function ensureEnumOptions(options: readonly string[], values: readonly string[]): string[] {
  return enumValues([...options, ...values]);
}

export function ensureAdminTagOptions(options: readonly string[], values: readonly string[]): string[] {
  return adminTagValues([...options, ...values]);
}

export function assertEnumValue(value: string, fieldName: string): string {
  const normalized = toEnumValue(value);
  if (!ENUM_VALUE_PATTERN.test(normalized)) {
    throw new Error(`${fieldName} must be uppercase and contain only A-Z, 0-9, hyphen, or underscore`);
  }
  return normalized;
}

export function assertAdminTagValues(values: readonly string[], fieldName = "tags"): string[] {
  const normalized = values.map(toEnumValue).filter(Boolean);
  if (normalized.length > ADMIN_TAG_MAX_COUNT) {
    throw new Error(`${fieldName} supports up to ${ADMIN_TAG_MAX_COUNT} tags`);
  }

  for (const value of normalized) {
    if (value.length > ADMIN_TAG_MAX_LENGTH) {
      throw new Error(`${fieldName} value "${value}" must be ${ADMIN_TAG_MAX_LENGTH} characters or fewer`);
    }
    if (!ADMIN_TAG_PATTERN.test(value)) {
      throw new Error(`${fieldName} must be uppercase and contain only A-Z, 0-9, hyphen, or underscore`);
    }
  }

  return Array.from(new Set(normalized)).sort((left, right) => left.localeCompare(right));
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
