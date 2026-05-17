export function errorMessage(error: unknown, fallback = "요청을 처리하지 못했습니다.") {
  return error instanceof Error ? error.message : fallback;
}
