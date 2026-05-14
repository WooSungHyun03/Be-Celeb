"use client";

// Renders the creator shop page.
import { useMemo, useState } from "react";

type Product = {
  name: string;
  description: string;
  price: string;
  badge: string;
  badgeTone: string;
  icon: string;
  imageTone: string;
};

type StoreCategory = {
  title: string;
  icon: string;
  products: Product[];
};

const shoppingSearch = (query: string) =>
  `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(query)}`;

const categoryTabs = [
  { label: "전체", icon: "▦" },
  { label: "카메라", icon: "📷" },
  { label: "조명", icon: "🔆" },
  { label: "마이크", icon: "🎙️" },
  { label: "삼각대 / 거치대", icon: "♜" },
  { label: "Shorts 촬영 소품", icon: "👜" },
  { label: "편집 / 디자인 도구", icon: "🧰" },
];

const filters = ["전체", "입문용", "베스트셀러", "예산별"];
const sortOptions = ["인기순", "가격 낮은순", "추천순"] as const;

type SortOption = (typeof sortOptions)[number];

const storeCategories: StoreCategory[] = [
  {
    title: "카메라",
    icon: "📷",
    products: [
      { name: "브이로그 카메라", description: "가볍고 선명한 4K 촬영", price: "₩649,000", badge: "추천", badgeTone: "bg-pink-500", icon: "📷", imageTone: "from-slate-100 to-slate-300" },
      { name: "미러리스 입문 세트", description: "카메라 + 렌즈 구성", price: "₩890,000", badge: "인기", badgeTone: "bg-orange-500", icon: "📸", imageTone: "from-stone-100 to-stone-300" },
      { name: "스마트폰 촬영용 카메라", description: "고화질 스마트폰 보조 장비", price: "₩129,000", badge: "입문용", badgeTone: "bg-emerald-500", icon: "📱", imageTone: "from-slate-50 to-violet-100" },
      { name: "액션캠", description: "작고, 활동성 강한 촬영 지원", price: "₩299,000", badge: "베스트", badgeTone: "bg-violet-600", icon: "🎥", imageTone: "from-slate-200 to-slate-400" },
    ],
  },
  {
    title: "조명",
    icon: "🔆",
    products: [
      { name: "링라이트", description: "밝기/색온도 조절 가능", price: "₩79,000", badge: "인기", badgeTone: "bg-orange-500", icon: "💡", imageTone: "from-amber-50 to-orange-100" },
      { name: "미니 LED 조명", description: "휴대용 충전식", price: "₩49,000", badge: "입문용", badgeTone: "bg-emerald-500", icon: "▰", imageTone: "from-slate-50 to-slate-200" },
      { name: "소프트박스 조명", description: "부드러운 빛 연출", price: "₩129,000", badge: "추천", badgeTone: "bg-pink-500", icon: "◧", imageTone: "from-slate-100 to-zinc-300" },
      { name: "컬러 무드 라이트", description: "RGB 컬러 분위기 연출", price: "₩39,000", badge: "베스트", badgeTone: "bg-violet-600", icon: "●", imageTone: "from-fuchsia-100 to-violet-300" },
    ],
  },
  {
    title: "마이크",
    icon: "🎙️",
    products: [
      { name: "무선 핀마이크", description: "선 없는 깔끔한 음질", price: "₩149,000", badge: "인기", badgeTone: "bg-orange-500", icon: "🎙️", imageTone: "from-slate-100 to-slate-300" },
      { name: "USB 마이크", description: "간단 연결, 고음질 녹음", price: "₩99,000", badge: "추천", badgeTone: "bg-pink-500", icon: "🎤", imageTone: "from-zinc-100 to-zinc-300" },
      { name: "샷건 마이크", description: "브이로그와 야외 촬영용", price: "₩119,000", badge: "베스트", badgeTone: "bg-violet-600", icon: "🎧", imageTone: "from-red-50 to-slate-200" },
      { name: "스마트폰 마이크", description: "작고 가벼운 외장 마이크", price: "₩59,000", badge: "입문용", badgeTone: "bg-emerald-500", icon: "▮", imageTone: "from-slate-100 to-stone-300" },
    ],
  },
  {
    title: "삼각대 / 거치대",
    icon: "♜",
    products: [
      { name: "높이조절 삼각대", description: "최대 170cm, 안정적인 지지", price: "₩59,000", badge: "추천", badgeTone: "bg-pink-500", icon: "♜", imageTone: "from-slate-50 to-slate-200" },
      { name: "탁상 거치대", description: "데스크용 스마트폰 거치대", price: "₩29,000", badge: "인기", badgeTone: "bg-orange-500", icon: "📱", imageTone: "from-amber-50 to-stone-200" },
      { name: "오버헤드 촬영 스탠드", description: "탑뷰 촬영에 최적", price: "₩89,000", badge: "베스트", badgeTone: "bg-violet-600", icon: "┬", imageTone: "from-slate-50 to-slate-200" },
      { name: "스마트폰 짐벌", description: "매끈한 보정 촬영 가능", price: "₩119,000", badge: "입문용", badgeTone: "bg-emerald-500", icon: "⌁", imageTone: "from-slate-100 to-zinc-300" },
    ],
  },
  {
    title: "Shorts 촬영 소품",
    icon: "👜",
    products: [
      { name: "배경 천", description: "다양한 컬러 & 사이즈", price: "₩35,000", badge: "인기", badgeTone: "bg-orange-500", icon: "▥", imageTone: "from-amber-50 to-stone-200" },
      { name: "감성 머그/오브제", description: "공간 연출용 소품", price: "₩15,000", badge: "추천", badgeTone: "bg-pink-500", icon: "☕", imageTone: "from-stone-50 to-orange-100" },
      { name: "데스크 소품 세트", description: "촬영용 소품 6종 구성", price: "₩29,000", badge: "베스트", badgeTone: "bg-violet-600", icon: "🪴", imageTone: "from-emerald-50 to-stone-100" },
      { name: "촬영용 미니 플랜트", description: "인테리어 포인트 아이템", price: "₩12,000", badge: "입문용", badgeTone: "bg-emerald-500", icon: "🌿", imageTone: "from-green-50 to-emerald-100" },
    ],
  },
  {
    title: "편집 / 디자인 도구",
    icon: "🧰",
    products: [
      { name: "영상 편집 앱 추천", description: "초보자도 쉬운 편집 앱", price: "₩0~ / 월", badge: "추천", badgeTone: "bg-pink-500", icon: "Pr", imageTone: "from-indigo-100 to-violet-300" },
      { name: "썸네일 디자인 툴", description: "템플릿으로 빠른 제작", price: "₩0~ / 월", badge: "인기", badgeTone: "bg-orange-500", icon: "Canva", imageTone: "from-cyan-100 to-blue-300" },
      { name: "자막 템플릿 팩", description: "숏폼 자막 스타일", price: "₩19,000", badge: "베스트", badgeTone: "bg-violet-600", icon: "T", imageTone: "from-violet-100 to-slate-300" },
      { name: "Shorts 아이디어 플래너", description: "콘텐츠 기획 & 일정 관리", price: "₩9,900", badge: "입문용", badgeTone: "bg-emerald-500", icon: "▦", imageTone: "from-pink-50 to-violet-100" },
    ],
  },
];

function ProductVisual({ item }: { item: Product }) {
  return (
    <div className={`relative flex h-20 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br ${item.imageTone}`}>
      <span className="text-2xl font-black text-slate-800 drop-shadow-sm">{item.icon}</span>
      <span className="absolute inset-x-4 bottom-2 h-1 rounded-full bg-black/10" />
    </div>
  );
}

function ProductCard({ item }: { item: Product }) {
  return (
    <a
      className="relative grid min-h-[112px] grid-cols-[auto_1fr] gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm shadow-slate-100 transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md"
      href={shoppingSearch(item.name)}
      rel="noreferrer"
      target="_blank"
    >
      <span className={`absolute left-3 top-2 z-10 rounded-full px-2 py-0.5 text-[10px] font-black text-white ${item.badgeTone}`}>
        {item.badge}
      </span>
      <ProductVisual item={item} />
      <div className="min-w-0 pt-1">
        <h3 className="truncate text-sm font-black text-ink">{item.name}</h3>
        <p className="mt-0.5 truncate text-[11px] font-medium text-slate-500">{item.description}</p>
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="text-xs font-black text-ink">{item.price}</span>
          <span className="rounded-md border border-violet-200 px-2 py-1 text-[10px] font-black text-violet-700">보기</span>
        </div>
      </div>
    </a>
  );
}

function CategorySection({ category, index }: { category: StoreCategory; index: number }) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-full bg-violet-600 text-xs font-black text-white">{index + 1}</span>
          <h2 className="text-base font-black text-ink">{category.title}</h2>
        </div>
        <a className="text-xs font-black text-slate-500 transition hover:text-violet-700" href={shoppingSearch(category.title)} target="_blank" rel="noreferrer">
          전체 보기 →
        </a>
      </div>
      <div className="grid gap-3 lg:grid-cols-4">
        {category.products.map((item) => (
          <ProductCard item={item} key={item.name} />
        ))}
      </div>
    </section>
  );
}

function getPriceValue(price: string) {
  const normalized = price.replace(/[^\d]/g, "");
  return normalized ? Number(normalized) : 0;
}

function getFilteredCategories(activeCategory: string, activeFilter: string, sortOption: SortOption) {
  return storeCategories
    .filter((category) => activeCategory === "전체" || category.title === activeCategory)
    .map((category) => {
      let products = [...category.products];

      if (activeFilter === "입문용") {
        products = products.filter((product) => product.badge === "입문용");
      }

      if (activeFilter === "베스트셀러") {
        products = products.filter((product) => product.badge === "베스트" || product.badge === "인기");
      }

      if (activeFilter === "예산별") {
        products = products.filter((product) => getPriceValue(product.price) <= 59000 || product.price.includes("₩0"));
      }

      products.sort((a, b) => {
        if (sortOption === "가격 낮은순") {
          return getPriceValue(a.price) - getPriceValue(b.price);
        }

        if (sortOption === "추천순") {
          return Number(b.badge === "추천") - Number(a.badge === "추천");
        }

        const rank = { 인기: 4, 베스트: 3, 추천: 2, 입문용: 1 };
        return (rank[b.badge as keyof typeof rank] ?? 0) - (rank[a.badge as keyof typeof rank] ?? 0);
      });

      return { ...category, products };
    })
    .filter((category) => category.products.length > 0);
}

export default function ShopPage() {
  const [activeCategory, setActiveCategory] = useState("전체");
  const [activeFilter, setActiveFilter] = useState("전체");
  const [sortOption, setSortOption] = useState<SortOption>("인기순");
  const [isSortOpen, setIsSortOpen] = useState(false);
  const visibleCategories = useMemo(
    () => getFilteredCategories(activeCategory, activeFilter, sortOption),
    [activeCategory, activeFilter, sortOption],
  );

  return (
    <div className="space-y-6">
      <header className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <div className="pt-2">
          <p className="text-xs font-bold text-slate-500">상점&nbsp;&nbsp;/&nbsp;&nbsp;store</p>
          <h1 className="mt-4 flex items-center gap-3 text-4xl font-black tracking-tight text-ink">
            크리에이터 상점
            <span aria-hidden="true" className="text-4xl leading-none text-violet-600">🛍️</span>
          </h1>
          <p className="mt-4 text-sm font-medium leading-6 text-slate-500">
            Shorts 제작에 필요한 장비와 도구를 한눈에 보고, 내 콘텐츠 스타일에 맞는 아이템을 찾아보세요.
          </p>
        </div>
        <aside className="rounded-2xl border border-violet-100 bg-[linear-gradient(100deg,#f3e8ff_0%,#fff1f8_100%)] p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-ink">초보 크리에이터 추천 세트</h2>
                <span className="rounded-full bg-pink-500 px-2 py-0.5 text-[10px] font-black text-white">추천</span>
              </div>
              <p className="mt-2 max-w-sm text-xs font-medium leading-5 text-slate-500">카메라 + 마이크 + 조명으로 완성하는 콘텐츠 제작 입문 세트.</p>
              <a className="mt-4 inline-flex rounded-lg bg-violet-600 px-4 py-2 text-xs font-black text-white shadow-sm shadow-violet-200 transition hover:bg-violet-700" href={shoppingSearch("초보 크리에이터 촬영 세트")} target="_blank" rel="noreferrer">
                세트 보러가기 →
              </a>
            </div>
            <div className="hidden grid-cols-3 gap-3 sm:grid">
              {["📷", "🎙️", "💡"].map((icon) => (
                <span className="flex size-16 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm" key={icon}>{icon}</span>
              ))}
            </div>
          </div>
        </aside>
      </header>

      <nav className="grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
        {categoryTabs.map((tab) => (
          <button
            className={`flex min-h-16 items-center justify-center gap-2 rounded-xl border px-2 text-sm font-black shadow-sm transition hover:-translate-y-0.5 hover:border-violet-200 hover:text-violet-700 ${
              activeCategory === tab.label
                ? "border-violet-200 bg-violet-50 text-violet-700"
                : "border-slate-200 bg-white text-ink"
            }`}
            key={tab.label}
            onClick={() => setActiveCategory(tab.label)}
            type="button"
          >
            <span className="text-xl">{tab.icon}</span>
            <span className="min-w-0 text-center leading-tight">{tab.label}</span>
          </button>
        ))}
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <button
              className={`rounded-full px-4 py-2 text-xs font-black transition ${
                activeFilter === filter ? "bg-violet-600 text-white shadow-sm shadow-violet-200" : "bg-white text-slate-600 hover:text-violet-700"
              }`}
              key={filter}
              onClick={() => setActiveFilter(filter)}
              type="button"
            >
              {filter}
            </button>
          ))}
        </div>
        <div className="relative flex items-center gap-2">
          <span className="text-xs font-black text-slate-500">정렬</span>
          <button
            className="inline-flex min-h-9 items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-black text-ink shadow-sm transition hover:border-violet-200 hover:text-violet-700"
            onClick={() => setIsSortOpen((current) => !current)}
            type="button"
          >
            {sortOption}
            <span className={`text-slate-400 transition ${isSortOpen ? "rotate-180" : ""}`}>⌄</span>
          </button>
          {isSortOpen ? (
            <div className="absolute right-0 top-11 z-20 w-32 overflow-hidden rounded-lg border border-slate-200 bg-white p-1 text-xs font-black shadow-lg shadow-slate-200/70">
              {sortOptions.map((option) => (
                <button
                  className={`block w-full rounded-md px-3 py-2 text-left transition ${
                    sortOption === option ? "bg-violet-50 text-violet-700" : "text-slate-600 hover:bg-slate-50 hover:text-violet-700"
                  }`}
                  key={option}
                  onClick={() => {
                    setSortOption(option);
                    setIsSortOpen(false);
                  }}
                  type="button"
                >
                  {option}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="space-y-6">
        {visibleCategories.map((category, index) => (
          <div id={category.title} key={category.title}>
            <CategorySection category={category} index={index} />
          </div>
        ))}
      </div>

      <aside className="rounded-2xl border border-violet-100 bg-[linear-gradient(90deg,#f1e9ff_0%,#fff1f8_100%)] px-5 py-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white text-3xl shadow-sm">💡</span>
          <div className="min-w-0 flex-1">
            <p className="text-base font-black text-ink">좋은 장비보다 중요한 건 꾸준한 업로드예요.</p>
            <p className="mt-1 text-xs font-medium text-slate-500">필요한 도구부터 하나씩 준비해보세요.</p>
          </div>
          <span className="hidden text-3xl font-black text-pink-400 sm:block">✦</span>
        </div>
      </aside>
    </div>
  );
}

