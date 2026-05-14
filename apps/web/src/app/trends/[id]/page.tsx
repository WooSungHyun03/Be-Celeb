import { notFound } from "next/navigation";

type TrendDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function TrendDetailPage({ params }: TrendDetailPageProps) {
  await params;
  notFound();
}
