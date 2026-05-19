export function compactNumber(value: number | null | undefined) {
  if (value == null) {
    return "-";
  }
  return new Intl.NumberFormat("ko-KR", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function formatInteger(value: number | null | undefined) {
  return Number(value ?? 0).toLocaleString("ko-KR");
}

export function formatKrw(value: number | null | undefined) {
  if (value == null) {
    return "가격 정보 없음";
  }
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(value);
}

export function stripHtmlTags(value: string | null | undefined) {
  return (value ?? "").replace(/<[^>]+>/g, "").trim();
}
