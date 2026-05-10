"use client";

// Renders an auto-advancing recommendation board for the landing hero.
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/common/Badge";
import type { Recommendation } from "@/types/recommendation";
import type { Trend } from "@/types/trend";
import { cn } from "@/utils/cn";

type HeroRecommendationBoardProps = {
  recommendations: Recommendation[];
  trends: Trend[];
};

export function HeroRecommendationBoard({ recommendations, trends }: HeroRecommendationBoardProps) {
  const slides = useMemo(
    () =>
      recommendations.map((recommendation, index) => {
        const trend = trends[index % trends.length];

        return {
          recommendation,
          trend,
        };
      }),
    [recommendations, trends],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const activeSlide = slides[activeIndex] ?? slides[0];

  useEffect(() => {
    if (slides.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 3200);

    return () => window.clearInterval(timer);
  }, [slides.length]);

  if (!activeSlide) {
    return null;
  }

  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/80">
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">Studio Brief</p>
          <h2 className="mt-2 text-2xl font-bold text-ink">콘텐츠 브리프</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">신호, 성장률, 제작 우선순위를 함께 봅니다.</p>
        </div>
        <Badge tone="info">Updated</Badge>
      </div>

      <div className="grid gap-4 py-5 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase text-slate-500">Trend</p>
          <p className="mt-2 line-clamp-2 text-sm font-bold text-ink">{activeSlide.trend.title}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase text-slate-500">Growth</p>
          <p className="mt-2 text-2xl font-bold text-violet-700">+{activeSlide.trend.growthRate}%</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase text-slate-500">Score</p>
          <p className="mt-2 text-2xl font-bold text-ink">{activeSlide.recommendation.score}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 text-white shadow-inner">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-semibold text-violet-300">{activeSlide.recommendation.title}</p>
          <span className="rounded-md bg-white/10 px-2.5 py-1 text-xs font-semibold text-slate-200">
            {activeSlide.recommendation.priority}
          </span>
        </div>
        <p className="mt-3 min-h-[72px] text-2xl font-bold leading-9">{activeSlide.recommendation.hook}</p>
        <div className="mt-5 h-1.5 rounded-full bg-white/10">
          <div className="h-1.5 rounded-full bg-violet-400 transition-all duration-500" style={{ width: `${activeSlide.recommendation.score}%` }} />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-4">
        <div className="flex gap-2">
          {slides.map((slide, index) => (
            <button
              aria-label={`${slide.recommendation.title} 추천 보기`}
              className={cn(
                "h-2.5 rounded-full transition-all",
                index === activeIndex ? "w-8 bg-ink" : "w-2.5 bg-slate-300 hover:bg-slate-400",
              )}
              key={slide.recommendation.id}
              onClick={() => setActiveIndex(index)}
              type="button"
            />
          ))}
        </div>
        <p className="text-xs font-medium text-slate-500">
          {activeIndex + 1} / {slides.length}
        </p>
      </div>
    </div>
  );
}
