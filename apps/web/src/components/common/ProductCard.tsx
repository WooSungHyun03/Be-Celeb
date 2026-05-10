// Provides a reusable product card for trending item surfaces.
import Link from "next/link";
import { Badge } from "@/components/common/Badge";
import { FavoriteButton } from "@/components/common/FavoriteButton";
import { cn } from "@/utils/cn";

type ProductCardProps = {
  name: string;
  category?: string;
  description?: string;
  price?: string;
  signal?: string;
  imageUrl?: string;
  href?: string;
  isFavorite?: boolean;
  onFavoriteChange?: (active: boolean) => void;
  className?: string;
};

export function ProductCard({
  name,
  category,
  description,
  price,
  signal,
  imageUrl,
  href,
  isFavorite,
  onFavoriteChange,
  className,
}: ProductCardProps) {
  const title = href ? (
    <Link className="hover:text-violet-700" href={href}>
      {name}
    </Link>
  ) : (
    name
  );

  return (
    <article className={cn("rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md", className)}>
      {href ? (
        <Link className="block aspect-[4/3] overflow-hidden rounded-xl bg-slate-100" href={href}>
          {imageUrl ? (
            <img alt={name} className="h-full w-full object-cover" src={imageUrl} />
          ) : (
            <div className="flex h-full items-center justify-center text-sm font-semibold text-slate-400">No image</div>
          )}
        </Link>
      ) : (
        <div className="aspect-[4/3] overflow-hidden rounded-xl bg-slate-100">
          {imageUrl ? (
            <img alt={name} className="h-full w-full object-cover" src={imageUrl} />
          ) : (
            <div className="flex h-full items-center justify-center text-sm font-semibold text-slate-400">No image</div>
          )}
        </div>
      )}
      <div className="mt-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            {category ? <p className="text-xs font-semibold uppercase text-violet-700">{category}</p> : null}
            <h3 className="mt-1 text-lg font-bold text-ink">{title}</h3>
          </div>
          {signal ? <Badge tone="brand">{signal}</Badge> : null}
        </div>
        {description ? <p className="text-sm leading-6 text-slate-600">{description}</p> : null}
        <div className="flex items-center justify-between gap-3">
          {price ? <p className="text-sm font-bold text-ink">{price}</p> : <span />}
          <FavoriteButton active={isFavorite} onChange={onFavoriteChange} />
        </div>
      </div>
    </article>
  );
}
