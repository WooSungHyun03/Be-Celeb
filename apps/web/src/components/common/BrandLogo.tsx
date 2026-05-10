// Provides the shared BE CELEB brand mark.
import { cn } from "@/utils/cn";

type BrandLogoProps = {
  showText?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const markSizeClasses: Record<NonNullable<BrandLogoProps["size"]>, string> = {
  sm: "size-8 rounded-lg",
  md: "size-10 rounded-xl",
  lg: "size-12 rounded-2xl",
};

export function BrandLogo({ showText = true, size = "md", className }: BrandLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-bold text-ink", className)}>
      <img alt="BE CELEB" className={cn("shrink-0 object-contain", markSizeClasses[size])} src="/android-icon-192x192.png" />
      {showText ? <span className="tracking-wide">BE CELEB</span> : null}
    </span>
  );
}
