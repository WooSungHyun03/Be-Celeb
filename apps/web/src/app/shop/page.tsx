"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { EmptyState } from "@/components/common/EmptyState";
import { Loading } from "@/components/common/Loading";
import { PageHeader } from "@/components/common/PageHeader";
import {
  getShopProducts,
  getShopSets,
  type ShopProduct,
  type ShopSectionsResponse,
  type ShopSet,
  type ShopSetsResponse,
} from "@/lib/api/shop";
import { formatKrw, stripHtmlTags } from "@/lib/common/format";

const EQUIPMENT_CATEGORIES = [
  "전체",
  "카메라",
  "마이크",
  "조명",
  "편집툴",
  "삼각대/거치대",
  "배경/소품",
  "저장장치",
  "라이브/스트리밍 장비",
];

const SORT_OPTIONS = [
  { value: "popular", label: "인기순" },
  { value: "price_asc", label: "가격 낮은순" },
  { value: "price_desc", label: "가격 높은순" },
  { value: "latest", label: "최신 수집순" },
];

const LEVEL_LABELS: Record<string, string> = {
  beginner: "입문",
  intermediate: "중급",
  advanced: "고급",
};

function ProductCard({ product }: { product: ShopProduct }) {
  const title = stripHtmlTags(product.title);

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-200/70 transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md hover:shadow-violet-100">
      <a className="block aspect-[4/3] bg-slate-100" href={product.productUrl} rel="noreferrer" target="_blank">
        {product.imageUrl ? (
          <img alt={title} className="h-full w-full object-cover" src={product.imageUrl} />
        ) : (
          <div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,#f8fafc_0%,#ede9fe_100%)] px-4 text-center text-sm font-semibold text-slate-400">
            기본 추천 장비
          </div>
        )}
      </a>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex flex-wrap gap-2">
          <Badge tone="brand">{product.equipmentCategory}</Badge>
          <Badge>{product.source === "fallback" ? "기본 추천" : "수집 상품"}</Badge>
          {product.recommendedLevel ? <Badge tone="info">{LEVEL_LABELS[product.recommendedLevel] ?? product.recommendedLevel}</Badge> : null}
        </div>
        <h2 className="mt-4 line-clamp-2 text-base font-bold leading-6 text-ink">{title}</h2>
        <div className="mt-3 grid gap-1 text-sm leading-6 text-slate-600">
          <p className="font-bold text-ink">{formatKrw(product.price)}</p>
          <p>{product.mallName || "판매처 정보 없음"}</p>
          {product.brand || product.maker ? (
            <p className="line-clamp-1 text-xs text-slate-500">
              {[product.brand, product.maker].filter(Boolean).join(" / ")}
            </p>
          ) : null}
          <p className="line-clamp-1 text-xs text-slate-400">{product.searchKeyword}</p>
        </div>
        <div className="mt-auto pt-4">
          <a
            className="inline-flex min-h-10 w-full items-center justify-center rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-violet-200 transition hover:bg-violet-700"
            href={product.productUrl}
            rel="noreferrer"
            target="_blank"
          >
            상품 보러가기
          </a>
        </div>
      </div>
    </article>
  );
}

function SetCard({ set }: { set: ShopSet }) {
  return (
    <Card className="h-full">
      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Badge tone="info">{LEVEL_LABELS[set.level] ?? set.level}</Badge>
            <h2 className="mt-3 text-lg font-black text-ink">{set.title}</h2>
          </div>
        </div>
        {set.description ? <p className="mt-3 text-sm leading-6 text-slate-500">{set.description}</p> : null}
        <div className="mt-4 flex flex-wrap gap-2">
          {set.items.map((item) => (
            <span
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600"
              key={`${set.level}-${item}`}
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </Card>
  );
}

export default function ShopPage() {
  const [response, setResponse] = useState<ShopSectionsResponse | null>(null);
  const [setsResponse, setSetsResponse] = useState<ShopSetsResponse | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [sort, setSort] = useState("popular");
  const [retryKey, setRetryKey] = useState(0);

  const sections = response?.sections ?? [];
  const sets = setsResponse?.sets ?? [];
  const fallbackMessage = useMemo(() => {
    const errors = sections.map((section) => section.error).filter((item): item is string => Boolean(item));
    return errors[0] ?? null;
  }, [sections]);

  useEffect(() => {
    const controller = new AbortController();
    const equipmentCategory = selectedCategory === "전체" ? undefined : selectedCategory;

    setStatus("loading");
    setMessage("");

    Promise.all([
      getShopProducts({ equipmentCategory, limit: 8, sort }, controller.signal),
      getShopSets(controller.signal).catch(() => ({ sets: [] })),
    ])
      .then(([products, setsData]) => {
        setResponse(products);
        setSetsResponse(setsData);
        setStatus("ready");
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setStatus("error");
          setMessage(error instanceof Error ? error.message : "상품 캐시를 불러오지 못했습니다.");
        }
      });

    return () => controller.abort();
  }, [selectedCategory, sort, retryKey]);

  return (
    <div className="space-y-6">
      <PageHeader
        description="YouTube 크리에이터에게 필요한 촬영, 편집, 운영 장비를 매일 수집된 상품 캐시로 확인하세요."
        eyebrow={<Badge tone="brand">Creator Store</Badge>}
        title="크리에이터 상점"
      />

      <Card>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
          <div>
            <h2 className="text-base font-bold text-ink">필수 장비 자동 진열</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              카메라, 마이크, 조명, 편집툴처럼 제작 단계별로 필요한 장비를 매일 수집된 캐시 기준으로 보여줍니다.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold text-slate-600">
              카테고리
              <select
                className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-ink outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                onChange={(event) => setSelectedCategory(event.target.value)}
                value={selectedCategory}
              >
                {EQUIPMENT_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-600">
              정렬
              <select
                className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-ink outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                onChange={(event) => setSort(event.target.value)}
                value={sort}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold leading-5 text-slate-500">
          상품 수집은 daily collector 또는 관리자 cron에서만 실행됩니다. 가격과 재고는 판매처에서 다시 확인하세요.
        </div>
      </Card>

      {sets.length > 0 ? (
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-black text-ink">추천 장비 세트</h2>
            <p className="mt-1 text-sm text-slate-500">제작 숙련도에 맞춰 함께 확인하기 좋은 장비 구성을 정리했습니다.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {sets.map((set) => (
              <SetCard key={set.level} set={set} />
            ))}
          </div>
        </section>
      ) : null}

      {fallbackMessage ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold leading-6 text-amber-800">
          {fallbackMessage}
        </div>
      ) : null}

      {status === "loading" ? <Loading label="크리에이터 장비 캐시를 불러오는 중입니다." /> : null}

      {status === "error" ? (
        <EmptyState
          action={
            <Button onClick={() => setRetryKey((current) => current + 1)} variant="secondary">
              다시 시도
            </Button>
          }
          description={message || "상품 캐시를 불러오지 못했습니다. daily collector와 backend 배포 상태를 확인하세요."}
          title="상품 목록을 불러오지 못했습니다"
        />
      ) : null}

      {status === "ready" ? (
        <section className="space-y-8">
          {sections.length === 0 ? (
            <EmptyState
              description="아직 표시할 장비 섹션이 없습니다. shop migration과 daily collector 상태를 확인하세요."
              title="표시할 상품이 없습니다"
            />
          ) : (
            sections.map((section) => (
              <div className="space-y-4" key={section.equipmentCategory}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-ink">{section.equipmentCategory}</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {section.isFallback ? "수집된 캐시가 없어 기본 추천 장비를 표시합니다." : "매일 수집된 상품 캐시 기반 장비 목록입니다."}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-slate-500">{section.items.length}개</p>
                </div>

                {section.items.length === 0 ? (
                  <EmptyState
                    description="이 섹션에 표시할 상품 캐시가 없습니다. daily collector 또는 기본 추천 데이터 상태를 확인하세요."
                    title={`${section.equipmentCategory} 상품 없음`}
                  />
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {section.items.slice(0, 8).map((product, index) => (
                      <ProductCard
                        key={`${product.source}-${product.sourceProductId ?? product.productUrl}-${product.searchKeyword}-${index}`}
                        product={product}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </section>
      ) : null}
    </div>
  );
}
