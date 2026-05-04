// Provides shared score normalization for future cross-app reuse.
export function clampScore(score: number) {
  return Math.max(0, Math.min(score, 100));
}
