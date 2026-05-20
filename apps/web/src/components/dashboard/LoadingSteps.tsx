type LoadingStepsProps = {
  steps: string[];
  activeIndex: number;
};

export function LoadingSteps({ steps, activeIndex }: LoadingStepsProps) {
  const progress = steps.length > 1 ? (activeIndex / (steps.length - 1)) * 100 : 100;
  const currentStep = steps[activeIndex] ?? steps[0] ?? "처리 중";

  return (
    <div className="rounded-xl border border-violet-100 bg-[linear-gradient(135deg,#ffffff_0%,#faf5ff_100%)] p-5 text-center shadow-sm shadow-violet-100/60">
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-violet-100">
        <div
          className="h-full rounded-full bg-violet-600 transition-[width] duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex min-h-12 items-center justify-center">
        <p
          className="animate-[stepFade_0.55s_ease-out] text-lg font-black text-violet-700 sm:text-xl"
          key={currentStep}
        >
          {currentStep}
        </p>
      </div>

      <div className="mt-2 flex justify-center gap-2" aria-hidden="true">
        {steps.map((step, index) => (
          <span
            className={`h-1.5 rounded-full transition-all duration-500 ${
              index === activeIndex ? "w-8 bg-violet-600" : index < activeIndex ? "w-4 bg-violet-300" : "w-4 bg-violet-100"
            }`}
            key={step}
          />
        ))}
      </div>
    </div>
  );
}
