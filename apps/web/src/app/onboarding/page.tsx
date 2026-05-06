// Renders mock onboarding steps for platform, category, and goal selection.
'use client';

import { useState } from 'react';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { CategoryStep } from '@/components/onboarding/CategoryStep';
import { GoalStep } from '@/components/onboarding/GoalStep';
import { PlatformStep } from '@/components/onboarding/PlatformStep';

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const steps = ['플랫폼', '카테고리', '목표'];
  const totalSteps = steps.length;
  const progressPercent = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Get started</p>
        <h1 className="mt-3 text-4xl font-semibold text-ink">개인 분석 시작</h1>
        <p className="mt-3 text-base text-slate-600">
          3가지 간단한 단계로 당신의 계정과 목표에 맞춘 추천을 받아보세요.
        </p>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm font-medium">
            <span className="text-slate-600">진행률</span>
            <span className="text-ink">{currentStep + 1} of {totalSteps}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      <Card>
        <div className="space-y-8">
          <div className="space-y-4">
            {currentStep === 0 && <PlatformStep />}
            {currentStep === 1 && <CategoryStep />}
            {currentStep === 2 && <GoalStep />}
          </div>

          <div className="flex gap-3 border-t border-slate-200 pt-6">
            <Button
              variant="secondary"
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
            >
              이전
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                if (currentStep < totalSteps - 1) {
                  setCurrentStep(currentStep + 1);
                }
              }}
            >
              {currentStep === totalSteps - 1 ? '분석 완료' : '다음'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
