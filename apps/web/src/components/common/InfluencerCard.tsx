// Provides a reusable influencer summary card.
import Link from "next/link";
import { Badge } from "@/components/common/Badge";
import { cn } from "@/utils/cn";

type InfluencerCardProps = {
  name: string;
  handle?: string;
  avatarUrl?: string;
  category?: string;
  followers?: string;
  engagement?: string;
  tags?: string[];
  href?: string;
  className?: string;
};

export function InfluencerCard({ name, handle, avatarUrl, category, followers, engagement, tags = [], href, className }: InfluencerCardProps) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const content = (
    <>
      <div className="flex items-start gap-4">
        <div className="size-14 overflow-hidden rounded-2xl bg-slate-100">
          {avatarUrl ? (
            <img alt={name} className="h-full w-full object-cover" src={avatarUrl} />
          ) : (
            <div className="flex h-full items-center justify-center text-sm font-bold text-slate-500">{initials}</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          {category ? <p className="text-xs font-semibold uppercase text-violet-700">{category}</p> : null}
          <h3 className="mt-1 truncate text-lg font-bold text-ink">{name}</h3>
          {handle ? <p className="text-sm text-slate-500">{handle}</p> : null}
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-semibold text-slate-500">Followers</p>
          <p className="mt-1 text-lg font-bold text-ink">{followers ?? "-"}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-semibold text-slate-500">Engagement</p>
          <p className="mt-1 text-lg font-bold text-ink">{engagement ?? "-"}</p>
        </div>
      </div>
      {tags.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge key={tag}>{tag}</Badge>
          ))}
        </div>
      ) : null}
    </>
  );

  if (href) {
    return (
      <article className={cn("rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md", className)}>
        <Link href={href}>{content}</Link>
      </article>
    );
  }

  return <article className={cn("rounded-2xl border border-slate-200 bg-white p-5 shadow-sm", className)}>{content}</article>;
}
