// Provides score helpers for trend and recommendation summary views.
export function getScoreLabel(score: number) {
  if (score >= 85) {
    return "High";
  }

  if (score >= 70) {
    return "Medium";
  }

  return "Watch";
}

export function getScoreTone(score: number) {
  if (score >= 85) {
    return "text-violet-700";
  }

  if (score >= 70) {
    return "text-amber-700";
  }

  return "text-slate-600";
}
