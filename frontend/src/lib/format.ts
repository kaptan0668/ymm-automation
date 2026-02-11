export function onlyDigits(value: string): string {
  return (value || "").replace(/\D/g, "");
}

export function formatPhoneInput(value: string): string {
  let digits = onlyDigits(value);
  if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  digits = digits.slice(0, 10);

  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  if (digits.length <= 8) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)} ${digits.slice(6)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8, 10)}`;
}

export function normalizePhoneForApi(value: string): string {
  const digits = onlyDigits(value);
  if (digits.length === 11 && digits.startsWith("0")) {
    return digits.slice(1);
  }
  return digits;
}

export function formatPhoneDisplay(value?: string | null): string {
  if (!value) return "-";
  return formatPhoneInput(value);
}
