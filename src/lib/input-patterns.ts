export const INPUT_PATTERNS = {
  backendMapping: "^attribute_facets\\.[a-z][a-z0-9_]*$",
  email: "^[A-Za-z0-9._%+\\-]+@[A-Za-z0-9.\\-]+\\.[A-Za-z]{2,}$",
  indianMobile: "^[6-9][0-9]{9}$",
  indianPinCode: "^[0-9]{6}$",
  personName: "^[A-Za-z][A-Za-z .'-]{1,79}$",
  addressLine: "^[A-Za-z0-9][A-Za-z0-9 .,#'/-]{4,239}$",
  optionalAddressLine: "^(?:[A-Za-z0-9][A-Za-z0-9 .,#'/-]{1,239})?$",
  cityOrState: "^[A-Za-z][A-Za-z .'-]{1,119}$",
  hsnCode: "^[0-9]{4,8}$",
  loginIdentity: "^(?:(?:[A-Za-z0-9._%+]|-)+@(?:[A-Za-z0-9.]|-)+\\.[A-Za-z]{2,}|(?:\\+91 ?)?[6-9][0-9]{9})$",
  otpSixDigits: "^[0-9]{6}$",
  relativePath: "^/[A-Za-z0-9._~/?#:@%=-]*$",
  slug: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
  snakeKey: "^[a-z][a-z0-9_]*$"
} as const;

export const INPUT_PATTERN_TITLES = {
  backendMapping: "Use attribute_facets followed by a lowercase snake_case attribute key, for example attribute_facets.material.",
  email: "Enter a valid email address.",
  indianMobile: "Enter a valid 10 digit Indian mobile number.",
  indianPinCode: "Enter a valid 6 digit PIN code.",
  personName: "Use letters, spaces, apostrophes, periods, or hyphens.",
  addressLine: "Enter a complete address using letters, numbers, spaces, and common address symbols.",
  optionalAddressLine: "Use letters, numbers, spaces, and common address symbols.",
  cityOrState: "Use letters and spaces only.",
  hsnCode: "Enter a numeric HSN code with 4 to 8 digits.",
  loginIdentity: "Enter a valid email address or Indian mobile number.",
  otpSixDigits: "Enter the 6 digit OTP.",
  relativePath: "Enter a site-relative URL beginning with /.",
  slug: "Use lowercase letters and numbers separated by hyphens.",
  snakeKey: "Use lowercase letters, numbers, and underscores, starting with a letter."
} as const;
