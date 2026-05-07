import { Badge } from "@/components/common/Badge";

type TrendingItem = {
  name: string;
  signal: string;
  reason: string;
  audience: string;
  linkLabel: string;
  href: string;
};

type TrendingCategory = {
  title: string;
  description: string;
  tone: "brand" | "info" | "warning" | "signal";
  items: TrendingItem[];
};

const shoppingSearch = (query: string) =>
  `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(query)}`;

const trendingCategories: TrendingCategory[] = [
  {
    title: "패션",
    description: "룩북, 데일리핏, 계절 전환 콘텐츠에서 반응이 빠른 아이템입니다.",
    tone: "brand",
    items: [
      {
        name: "나일론 윈드브레이커",
        signal: "+32%",
        reason: "가벼운 아우터와 고프코어 스타일을 함께 보여주기 좋습니다.",
        audience: "대학생, 출근룩, 여행 브이로그",
        linkLabel: "상품 찾기",
        href: shoppingSearch("나일론 윈드브레이커"),
      },
      {
        name: "메리제인 플랫슈즈",
        signal: "+24%",
        reason: "꾸안꾸 코디와 미니멀 룩 추천 영상에 자연스럽게 연결됩니다.",
        audience: "패션 입문자, 데이트룩",
        linkLabel: "상품 찾기",
        href: shoppingSearch("메리제인 플랫슈즈"),
      },
      {
        name: "실버 미니백",
        signal: "+18%",
        reason: "심플한 착장에 포인트를 주는 전후 비교 콘텐츠로 만들기 좋습니다.",
        audience: "20대 여성, 페스티벌룩",
        linkLabel: "상품 찾기",
        href: shoppingSearch("실버 미니백"),
      },
    ],
  },
  {
    title: "뷰티",
    description: "짧은 튜토리얼, 사용 전후 비교, 파우치 소개에 바로 넣기 좋은 상품군입니다.",
    tone: "signal",
    items: [
      {
        name: "글로우 쿠션",
        signal: "+41%",
        reason: "피부 표현 전후가 선명해서 숏폼 첫 3초 훅으로 쓰기 좋습니다.",
        audience: "메이크업 초보, 출근 메이크업",
        linkLabel: "상품 찾기",
        href: shoppingSearch("글로우 쿠션"),
      },
      {
        name: "립 플럼퍼",
        signal: "+29%",
        reason: "즉각적인 변화가 보여 리뷰, 비교, 추천 포맷과 잘 맞습니다.",
        audience: "뷰티 리뷰 시청자",
        linkLabel: "상품 찾기",
        href: shoppingSearch("립 플럼퍼"),
      },
      {
        name: "두피 쿨링 스프레이",
        signal: "+21%",
        reason: "날씨, 운동, 출근 루틴과 연결해 생활형 콘텐츠로 확장하기 쉽습니다.",
        audience: "직장인, 운동 루틴",
        linkLabel: "상품 찾기",
        href: shoppingSearch("두피 쿨링 스프레이"),
      },
    ],
  },
  {
    title: "테크",
    description: "생산성, 데스크 셋업, 여행 준비물 영상에서 클릭을 만들기 쉬운 아이템입니다.",
    tone: "info",
    items: [
      {
        name: "초소형 무선 마이크",
        signal: "+36%",
        reason: "콘텐츠 제작 퀄리티 개선을 직접 들려주는 비교형 영상에 적합합니다.",
        audience: "크리에이터, 강의 제작자",
        linkLabel: "상품 찾기",
        href: shoppingSearch("초소형 무선 마이크"),
      },
      {
        name: "접이식 블루투스 키보드",
        signal: "+27%",
        reason: "카페 작업, 여행 업무, 미니멀 가방 챌린지에 잘 들어갑니다.",
        audience: "디지털 노마드, 학생",
        linkLabel: "상품 찾기",
        href: shoppingSearch("접이식 블루투스 키보드"),
      },
      {
        name: "스마트 태그",
        signal: "+19%",
        reason: "분실 방지와 여행 준비물 콘텐츠에서 실용성이 바로 전달됩니다.",
        audience: "여행객, 자취생",
        linkLabel: "상품 찾기",
        href: shoppingSearch("스마트 태그"),
      },
    ],
  },
  {
    title: "푸드 & 리빙",
    description: "집밥, 자취, 간편 루틴 콘텐츠에서 저장과 공유를 유도하기 좋은 상품입니다.",
    tone: "warning",
    items: [
      {
        name: "저당 그래놀라",
        signal: "+34%",
        reason: "아침 루틴과 식단 관리 콘텐츠로 반복 노출하기 좋습니다.",
        audience: "헬시 라이프, 직장인",
        linkLabel: "상품 찾기",
        href: shoppingSearch("저당 그래놀라"),
      },
      {
        name: "미니 제습기",
        signal: "+26%",
        reason: "계절성 문제 해결 아이템이라 전후 변화가 명확합니다.",
        audience: "자취생, 원룸 생활",
        linkLabel: "상품 찾기",
        href: shoppingSearch("미니 제습기"),
      },
      {
        name: "스테인리스 텀블러",
        signal: "+17%",
        reason: "데일리 루틴, 출근 가방, 친환경 소비 메시지와 연결됩니다.",
        audience: "직장인, 캠퍼스 라이프",
        linkLabel: "상품 찾기",
        href: shoppingSearch("스테인리스 텀블러"),
      },
    ],
  },
];

const metrics = [
  { label: "카테고리", value: trendingCategories.length },
  { label: "추천 아이템", value: trendingCategories.reduce((total, category) => total + category.items.length, 0) },
  { label: "연결 방식", value: "검색 링크" },
];

export default function TrendingItemsPage() {
  return (
    <div className="space-y-8">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_420px] lg:items-end">
          <div>
            <Badge tone="brand">Rising item board</Badge>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-ink">카테고리별 인기 상승 아이템</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
              트렌드 콘텐츠에 바로 연결하기 좋은 상품을 카테고리별로 정리했습니다. 각 아이템은 외부 검색 페이지로 연결되어 상품 탐색으로 이어집니다.
            </p>
          </div>
          <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
            {metrics.map((metric) => (
              <div className="border-r border-slate-200 px-4 py-4 last:border-r-0" key={metric.label}>
                <p className="text-xs font-semibold text-slate-500">{metric.label}</p>
                <p className="mt-2 text-2xl font-bold text-ink">{metric.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        {trendingCategories.map((category) => (
          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" key={category.title}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <Badge tone={category.tone}>{category.title}</Badge>
                <h2 className="mt-3 text-2xl font-bold text-ink">{category.title} 인기템</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{category.description}</p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {category.items.map((item) => (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4" key={item.name}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold text-ink">{item.name}</h3>
                        <span className="rounded-md bg-violet-100 px-2 py-1 text-xs font-bold text-violet-700">
                          {item.signal}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{item.reason}</p>
                    </div>
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      {item.linkLabel}
                    </a>
                  </div>
                  <p className="mt-3 text-xs font-medium text-slate-500">추천 타깃: {item.audience}</p>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
