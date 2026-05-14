import { Badge } from "@/components/common/Badge";

type LoadingStepsProps = {
  steps: string[];
  activeIndex: number;
};

export function LoadingSteps({ steps, activeIndex }: LoadingStepsProps) {
  return (
    <div className="rounded-lg border border-violet-100 bg-violet-50 p-4">
      <div className="flex flex-wrap gap-2">
        {steps.map((step, index) => (
          <Badge key={step} tone={index <= activeIndex ? "brand" : "default"}>
            {step}
          </Badge>
        ))}
      </div>
    </div>
  );
}
