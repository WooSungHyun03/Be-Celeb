"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { EmptyState } from "@/components/common/EmptyState";
import { Loading } from "@/components/common/Loading";
import { PageHeader } from "@/components/common/PageHeader";
import { CREATOR_CATEGORIES } from "@/lib/categories";
import { getShopProducts, type ShopProduct, type ShopProductsResponse } from "@/lib/api/shop";
import { formatKrw } from "@/lib/common/format";

function ProductCard({ product }: { product: ShopProduct }) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md">
      <a className="block aspect-[4/3] bg-slate-100" href={product.productUrl} rel="noreferrer" target="_blank">
        {product.imageUrl ? (
          <img alt={product.title} className="h-full w-full object-cover" src={product.imageUrl} />
        ) : (
          <div className="flex h-full items-center justify-center text-sm font-semibold text-slate-400">No image</div>
        )}
      </a>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex flex-wrap gap-2">
          <Badge tone="brand">{product.creatorCategory}</Badge>
          <Badge>{product.source}</Badge>
        </div>
        <h2 className="mt-4 line-clamp-2 text-base font-bold leading-6 text-ink">{product.title}</h2>
        <div className="mt-3 grid gap-1 text-sm leading-6 text-slate-600">
          <p className="font-bold text-ink">{formatKrw(product.price)}</p>
          <p>{product.mallName || "쇼핑몰 정보 없음"}</p>
          {product.brand || product.maker ? (
            <p className="line-clamp-1 text-xs text-slate-500">
              {[product.brand, product.maker].filter(Boolean).join(" / ")}
            </p>
          ) : null}
          {product.category ? <p className="line-clamp-1 text-xs text-slate-400">{product.category}</p> : null}
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
  const [category, setCategory] = useState("IT");
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [response, setResponse] = useState<ShopProductsResponse | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const products = response?.products ?? [];
  const hasQuery = submittedQuery.trim().length > 0;
  const subtitle = useMemo(() => {
    if (!response) {
      return "Naver Shopping 검색 결과를 backend cache와 함께 불러옵니다.";
    }
    return response.fromCache ? "캐시된 Naver Shopping 결과입니다." : "Naver Shopping API에서 새로 수집한 결과입니다.";
  }, [response]);

  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading");
    setMessage("");

    getShopProducts({ category, query: submittedQuery, limit: 24 }, controller.signal)
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
  }, [category, submittedQuery, reloadKey]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittedQuery(query.trim());
  }

  function handleRefresh() {
    setStatus("loading");
    setMessage("");
    getShopProducts({ category, query: submittedQuery, limit: 24, refresh: true })
      .then((data) => {
        setResponse(data);
        setStatus("ready");
      })
      .catch((error) => {
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "상품 목록 새로고침에 실패했습니다.");
      });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        description="카테고리별 제작 장비를 Naver Shopping 검색 결과 기반으로 확인합니다."
        eyebrow={<Badge tone="brand">Naver Shopping</Badge>}
        title="크리에이터 상점"
      />

      <Card>
        <form className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)_auto_auto] lg:items-end" onSubmit={handleSearch}>
          <label className="block text-sm font-semibold text-slate-700">
            <span>카테고리</span>
            <select
              className="mt-2 block min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-ink focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100"
              onChange={(event) => {
                setCategory(event.target.value);
                setSubmittedQuery("");
                setQuery("");
              }}
              value={category}
            >
              {CREATOR_CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            <span>검색어</span>
            <input
              className="mt-2 block min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-ink placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="예: 유튜브 마이크, 링라이트"
              value={query}
            />
          </label>

          <Button type="submit">검색</Button>
          <Button onClick={handleRefresh} type="button" variant="secondary">
            새로고침
          </Button>
        </form>
        <div className="mt-4 rounded-md bg-slate-50 px-3 py-2 text-xs font-semibold leading-5 text-slate-500">
          이 목록은 광고/제휴 링크가 아니라 Naver Shopping Search API 검색 결과입니다. 가격과 재고는 판매처에서 다시 확인하세요.
        </div>
      </Card>

      {status === "loading" ? <Loading label="Naver Shopping 상품을 불러오는 중입니다." /> : null}

      {status === "error" ? (
        <EmptyState
          action={
            <Button onClick={() => setReloadKey((current) => current + 1)} variant="secondary">
              다시 시도
            </Button>
          }
          description={message.includes("NAVER_CLIENT") ? "Render Backend에 NAVER_CLIENT_ID와 NAVER_CLIENT_SECRET을 설정한 뒤 다시 배포하세요." : message}
          title="상품 목록을 불러오지 못했습니다"
        />
      ) : null}

      {status === "ready" ? (
        <section className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-ink">{hasQuery ? `"${submittedQuery}" 검색 결과` : `${category} 추천 장비`}</h2>
              <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
            </div>
            <p className="text-sm font-bold text-slate-500">{products.length}개</p>
          </div>

          {products.length === 0 ? (
            <EmptyState
              description="아직 캐시된 상품이 없거나 검색 결과가 없습니다. 새로고침으로 Naver Shopping API 수집을 실행해 보세요."
              title="표시할 상품이 없습니다"
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={`${product.source}-${product.sourceProductId}-${product.searchKeyword}`} product={product} />
              ))}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
