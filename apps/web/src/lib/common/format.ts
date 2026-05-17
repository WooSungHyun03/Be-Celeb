export function compactNumber(value: number | null | undefined) {
  if (value == null) {
    return "-";
  }
  return new Intl.NumberFormat("ko-KR", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}
