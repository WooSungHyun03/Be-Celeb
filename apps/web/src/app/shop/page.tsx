"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { EmptyState } from "@/components/common/EmptyState";
import { Loading } from "@/components/common/Loading";
import { PageHeader } from "@/components/common/PageHeader";
import { getShopProducts, type ShopProduct, type ShopSectionsResponse } from "@/lib/api/shop";
import { formatKrw, stripHtmlTags } from "@/lib/common/format";

function ProductCard({ product }: { product: ShopProduct }) {
  const title = stripHtmlTags(product.title);

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md">
      <a className="block aspect-[4/3] bg-slate-100" href={product.productUrl} rel="noreferrer" target="_blank">
        {product.imageUrl ? (
          <img alt={title} className="h-full w-full object-cover" src={product.imageUrl} />
        ) : (
          <div className="flex h-full items-center justify-center px-4 text-center text-sm font-semibold text-slate-400">
            기본 추천 장비
          </div>
        )}
      </a>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex flex-wrap gap-2">
          <Badge tone="brand">{product.equipmentCategory}</Badge>
          <Badge>{product.source === "fallback" ? "추천 검색" : product.source}</Badge>
        </div>
        <h2 className="mt-4 line-clamp-2 text-base font-bold leading-6 text-ink">{title}</h2>
        <div className="mt-3 grid gap-1 text-sm leading-6 text-slate-600">
          <p className="font-bold text-ink">{formatKrw(product.price)}</p>
          <p>{product.mallName || "쇼핑몰 정보 없음"}</p>
          {product.brand || product.maker ? (
            <p className="line-clamp-1 text-xs text-slate-500">
              {[product.brand, product.maker].filter(Boolean).join(" / ")}
            </p>
          ) : null}
          <p className="line-clamp-1 text-xs text-slate-400">{product.searchKeyword}</p>
        </div>
        <div className="mt-auto pt-4">
          <a
            className="inline-flex min-h-10 w-full items-center justify-center rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
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

export default function ShopPage() {
  const [response, setResponse] = useState<ShopSectionsResponse | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const sections = response?.sections ?? [];
  const fallbackMessage = useMemo(() => {
    const errors = sections.map((section) => section.error).filter((item): item is string => Boolean(item));
    return errors[0] ?? null;
  }, [sections]);

  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading");
    setMessage("");

    getShopProducts({ limit: 8 }, controller.signal)
      .then((data) => {
        setResponse(data);
        setStatus("ready");
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setStatus("error");
          setMessage(error instanceof Error ? error.message : "상품 목록을 불러오지 못했습니다.");
        }
      });

    return () => controller.abort();
  }, [reloadKey]);

  function handleRefresh() {
    setRefreshing(true);
    setMessage("");
    getShopProducts({ limit: 8, refresh: true })
      .then((data) => {
        setResponse(data);
        setStatus("ready");
      })
      .catch((error) => {
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "상품 목록 새로고침에 실패했습니다.");
      })
      .finally(() => setRefreshing(false));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        action={
          <Button disabled={refreshing || status === "loading"} onClick={handleRefresh} type="button" variant="secondary">
            {refreshing ? "새로고침 중" : "실시간 새로고침"}
          </Button>
        }
        description="유튜브 크리에이터에게 필요한 촬영·편집 장비를 한눈에 확인하세요."
        eyebrow={<Badge tone="brand">Naver Shopping</Badge>}
        title="크리에이터 상점"
      />

      <Card>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div>
            <h2 className="text-base font-bold text-ink">필수 장비 자동 진열</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              카메라, 마이크, 조명, 편집툴, 거치대 등 제작 흐름에 필요한 장비 섹션을 자동으로 불러옵니다.
            </p>
          </div>
          <Badge tone="info">광고/제휴 링크 아님</Badge>
        </div>
        <div className="mt-4 rounded-md bg-slate-50 px-3 py-2 text-xs font-semibold leading-5 text-slate-500">
          이 목록은 네이버 쇼핑 검색 결과와 backend cache를 함께 사용합니다. 가격과 재고는 판매처에서 다시 확인하세요.
        </div>
      </Card>

      {fallbackMessage ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold leading-6 text-amber-800">
          {fallbackMessage}
        </div>
      ) : null}

      {status === "loading" ? <Loading label="크리에이터 장비 섹션을 불러오는 중입니다." /> : null}

      {status === "error" ? (
        <EmptyState
          action={
            <Button onClick={() => setReloadKey((current) => current + 1)} variant="secondary">
              다시 시도
            </Button>
          }
          description={
            message.includes("NAVER_CLIENT")
              ? "네이버 쇼핑 API 인증 설정이 올바르지 않습니다. 관리자에게 문의하세요."
              : message || "실시간 상품 정보를 불러오지 못해 기본 추천 장비를 표시합니다."
          }
          title="상품 목록을 불러오지 못했습니다"
        />
      ) : null}

      {status === "ready" ? (
        <section className="space-y-8">
          {sections.length === 0 ? (
            <EmptyState
              description="아직 표시할 장비 섹션이 없습니다. shop migration과 backend 배포 상태를 확인하세요."
              title="표시할 상품이 없습니다"
            />
          ) : (
            sections.map((section) => (
              <div className="space-y-4" key={section.equipmentCategory}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-ink">{section.equipmentCategory}</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {section.isFallback ? "기본 추천 검색어로 구성한 fallback 섹션입니다." : "네이버 쇼핑 검색 결과 기반 장비 목록입니다."}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-slate-500">{section.items.length}개</p>
                </div>

                {section.items.length === 0 ? (
                  <EmptyState
                    description="이 섹션에 표시할 상품이 없습니다. 실시간 새로고침 또는 daily collector 상태를 확인하세요."
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
