"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { PageHeader } from "@/components/common/PageHeader";
import { Toast } from "@/components/common/Toast";
import { CategoryStep } from "@/components/onboarding/CategoryStep";
import { GoalStep } from "@/components/onboarding/GoalStep";
import { PlatformStep } from "@/components/onboarding/PlatformStep";
import { ROUTES } from "@/constants/routes";

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState(false);
  const steps = ["YouTube 채널", "카테고리", "목표"];
  const totalSteps = steps.length;
  const progressPercent = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        eyebrow={<p className="text-sm font-bold uppercase text-violet-700">Get started</p>}
        title="개인 분석 시작"
        description="세 가지 설정만 선택하면 YouTube 채널 목표에 맞춘 트렌드와 콘텐츠 추천 화면을 구성합니다."
      />

      <Card>
        <div className="space-y-5">
          <div className="flex items-center justify-between text-sm font-semibold">
            <span className="text-slate-600">진행률</span>
            <span className="text-ink">
              {currentStep + 1} / {totalSteps}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-violet-100">
            <div className="h-full bg-violet-600 transition-all duration-300" style={{ width: `${progressPercent}%` }} />
          </div>
          <div className="grid gap-2 text-xs font-bold text-slate-500 sm:grid-cols-3">
            {steps.map((step, index) => (
              <span
                className={index === currentStep ? "rounded-full bg-violet-50 px-3 py-2 text-violet-700" : "px-3 py-2"}
                key={step}
              >
                {step}
              </span>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <div className="space-y-8">
          {currentStep === 0 && <PlatformStep />}
          {currentStep === 1 && <CategoryStep />}
          {currentStep === 2 && <GoalStep />}
          {completed ? <Toast message="온보딩이 완료되었습니다. 대시보드에서 추천을 확인해 주세요." /> : null}

          <div className="flex gap-3 border-t border-violet-100 pt-6">
            <Button variant="secondary" onClick={() => setCurrentStep(Math.max(0, currentStep - 1))} disabled={currentStep === 0}>
              이전
            </Button>
            {currentStep === totalSteps - 1 ? (
              <Link
                href={ROUTES.dashboard}
                className="inline-flex min-h-10 flex-1 items-center justify-center rounded-md bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-700"
                onClick={() => setCompleted(true)}
              >
                분석 완료
              </Link>
            ) : (
              <Button className="flex-1" onClick={() => setCurrentStep(currentStep + 1)}>
                다음
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
