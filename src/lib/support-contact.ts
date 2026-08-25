const DEFAULT_SUPPORT_EMAIL = "support@shrestaexclusive.com";
const DEFAULT_SUPPORT_PHONE_DISPLAY = "+91 12345 67890";
const DEFAULT_SUPPORT_PHONE_DIAL = "+911234567890";

function supportEmail(value: string | undefined): string {
  const candidate = value?.trim() ?? "";
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(candidate) ? candidate : DEFAULT_SUPPORT_EMAIL;
}

function supportPhoneDisplay(value: string | undefined): string {
  const candidate = value?.trim() ?? "";
  return /^[+0-9 ()-]{7,30}$/.test(candidate) ? candidate : DEFAULT_SUPPORT_PHONE_DISPLAY;
}

function supportPhoneDial(value: string | undefined): string {
  const candidate = value?.trim() ?? "";
  return /^\+[1-9][0-9]{7,14}$/.test(candidate) ? candidate : DEFAULT_SUPPORT_PHONE_DIAL;
}

export const SUPPORT_EMAIL = supportEmail(process.env.NEXT_PUBLIC_SHRESTA_SUPPORT_EMAIL);
export const SUPPORT_PHONE_DISPLAY = supportPhoneDisplay(process.env.NEXT_PUBLIC_SHRESTA_SUPPORT_PHONE_DISPLAY);
export const SUPPORT_PHONE_DIAL = supportPhoneDial(process.env.NEXT_PUBLIC_SHRESTA_SUPPORT_PHONE_DIAL);