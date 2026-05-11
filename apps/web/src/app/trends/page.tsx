"use client";

// Renders the trends dashboard page.
import { useState } from "react";
import Link from "next/link";
import { ROUTES } from "@/constants/routes";

const reels = [
  { title: "집에서 보내는 감성 주말 브이로그", account: "@daily_vlog", time: "0:32", tag: "라이프스타일", tagTone: "bg-violet-50 text-violet-600", theme: "room", views: "52.3만", comments: "8.7만", saves: "1,234" },
  { title: "5분 만에 완성하는 데일리 메이크업", account: "@makeup_su", time: "0:29", tag: "뷰티", tagTone: "bg-pink-50 text-pink-600", theme: "beauty", views: "45.8만", comments: "7.2만", saves: "987" },
  { title: "출근룩 코디 3가지 정리", account: "@office_style", time: "0:27", tag: "패션", tagTone: "bg-blue-50 text-blue-600", theme: "fashion", views: "38.6만", comments: "6.1만", saves: "876" },
  { title: "AI로 업무 시간 줄이는 방법", account: "@productivity.kr", time: "0:35", tag: "생산성", tagTone: "bg-emerald-50 text-emerald-600", theme: "laptop", views: "29.4만", comments: "5.3만", saves: "642" },
  { title: "10분 완성 초간단 파스타", account: "@cook_easy", time: "0:31", tag: "푸드", tagTone: "bg-orange-50 text-orange-600", theme: "food", views: "31.2만", comments: "6.8만", saves: "701" },
];

const hashtags = ["#브이로그", "#모닝루틴", "#AI툴", "#생산성", "#데일리룩", "#출근룩", "#자기계발", "#홈카페", "#다이어트", "#맛집"];

const keywordPeriods = ["일별", "주별", "월별"] as const;

type KeywordPeriod = (typeof keywordPeriods)[number];

const keywordChartData: Record<KeywordPeriod, { labels: string[]; paths: string[] }> = {
  일별: {
    labels: ["5/12", "5/13", "5/14", "5/16", "5/17", "5/18"],
    paths: [
      "M20 115 C62 88 92 104 132 82 S206 90 250 64 330 48 378 58 424 79 472 58 520 42 548 52",
      "M20 142 C62 126 94 136 136 116 S210 124 254 101 334 86 382 94 428 111 474 98 522 88 548 96",
      "M20 160 C64 150 98 154 138 140 S214 145 258 126 336 116 384 120 432 132 478 123 524 117 548 123",
      "M20 169 C68 166 100 163 142 156 S218 158 262 148 340 142 386 145 434 151 480 146 526 141 548 144",
      "M20 176 C70 174 104 172 146 166 S220 168 264 161 342 157 388 160 436 164 482 160 528 157 548 159",
    ],
  },
  주별: {
    labels: ["1주", "2주", "3주", "4주", "5주", "6주"],
    paths: [
      "M20 130 C74 112 106 98 148 86 S226 70 270 73 344 59 390 51 442 47 500 33 548 38",
      "M20 151 C78 139 118 128 158 118 S226 100 270 105 342 91 394 86 444 77 502 68 548 72",
      "M20 164 C76 156 118 148 160 141 S228 129 274 132 344 119 392 116 448 105 502 99 548 102",
      "M20 172 C76 169 118 164 160 158 S230 153 274 155 344 146 392 144 448 137 504 132 548 135",
      "M20 178 C78 176 120 174 162 169 S230 167 276 168 346 162 394 160 450 154 504 151 548 153",
    ],
  },
  월별: {
    labels: ["1월", "2월", "3월", "4월", "5월", "6월"],
    paths: [
      "M20 150 C78 124 114 117 158 95 S230 79 276 61 344 47 392 34 444 41 500 24 548 28",
      "M20 160 C78 142 116 135 160 119 S230 105 276 91 344 78 394 63 446 68 502 52 548 57",
      "M20 169 C78 157 118 151 162 139 S232 128 278 116 346 106 396 94 448 96 504 84 548 87",
      "M20 176 C78 171 120 166 164 159 S232 153 280 146 348 139 398 131 450 132 504 124 548 126",
      "M20 181 C80 179 122 176 166 171 S234 168 282 163 350 158 400 153 452 153 506 147 548 149",
    ],
  },
};

const keywordRankingData: Record<KeywordPeriod, { top: string[][]; rising: string[][] }> = {
  일별: {
    top: [
      ["브이로그", "125,420"],
      ["모닝루틴", "98,730"],
      ["AI툴", "78,560"],
      ["생산성", "65,210"],
      ["데일리룩", "54,890"],
    ],
    rising: [
      ["AI툴", "156%"],
      ["생성형", "98%"],
      ["모닝루틴", "76%"],
      ["데일리룩", "58%"],
      ["브이로그", "41%"],
    ],
  },
  주별: {
    top: [
      ["릴스편집", "642,180"],
      ["숏폼전략", "558,910"],
      ["브이로그", "512,760"],
      ["AI툴", "488,340"],
      ["홈카페", "421,500"],
    ],
    rising: [
      ["숏폼전략", "132%"],
      ["릴스편집", "118%"],
      ["홈카페", "87%"],
      ["챗GPT", "74%"],
      ["자기계발", "63%"],
    ],
  },
  월별: {
    top: [
      ["인스타성장", "2.4M"],
      ["브랜드협찬", "1.9M"],
      ["데일리룩", "1.6M"],
      ["맛집추천", "1.4M"],
      ["생산성", "1.1M"],
    ],
    rising: [
      ["인스타성장", "204%"],
      ["브랜드협찬", "171%"],
      ["맛집추천", "126%"],
      ["데일리룩", "94%"],
      ["생산성", "82%"],
    ],
  },
};

const keywordColors = ["#8b5cf6", "#ec4899", "#3b82f6", "#10b981", "#f97316"];

const keywordReels: Record<string, typeof reels> = {
  브이로그: [
    { title: "하루를 기록하는 감성 브이로그 구성", account: "@daily_vlog", time: "0:32", tag: "브이로그", tagTone: "bg-violet-50 text-violet-600", theme: "room", views: "52.3만", comments: "8.7만", saves: "1,234" },
    { title: "집에서 보내는 주말 루틴 릴스", account: "@home_day", time: "0:28", tag: "브이로그", tagTone: "bg-violet-50 text-violet-600", theme: "phone", views: "41.8만", comments: "5.9만", saves: "928" },
    { title: "카페 없이도 예쁜 일상 컷 만들기", account: "@soft_daily", time: "0:31", tag: "브이로그", tagTone: "bg-violet-50 text-violet-600", theme: "screen", views: "36.1만", comments: "4.2만", saves: "774" },
  ],
  모닝루틴: [
    { title: "조회수 잘 나오는 30분 모닝루틴", account: "@morning.zip", time: "0:29", tag: "루틴", tagTone: "bg-pink-50 text-pink-600", theme: "room", views: "49.6만", comments: "6.4만", saves: "1,102" },
    { title: "아침 준비 과정을 빠르게 보여주는 법", account: "@routine_maker", time: "0:25", tag: "루틴", tagTone: "bg-pink-50 text-pink-600", theme: "beauty", views: "38.7만", comments: "4.8만", saves: "689" },
    { title: "출근 전 책상 정리 루틴", account: "@desk_start", time: "0:27", tag: "루틴", tagTone: "bg-pink-50 text-pink-600", theme: "laptop", views: "31.5만", comments: "3.9만", saves: "532" },
  ],
  AI툴: [
    { title: "AI로 릴스 기획 10분 만에 끝내기", account: "@productivity.kr", time: "0:35", tag: "AI툴", tagTone: "bg-blue-50 text-blue-600", theme: "laptop", views: "78.5만", comments: "9.1만", saves: "1,880" },
    { title: "챗GPT로 후킹 문장 뽑는 방법", account: "@ai_creator", time: "0:33", tag: "AI툴", tagTone: "bg-blue-50 text-blue-600", theme: "screen", views: "64.3만", comments: "7.4만", saves: "1,204" },
    { title: "AI 편집툴로 컷 편집 줄이기", account: "@reels_ai", time: "0:30", tag: "AI툴", tagTone: "bg-blue-50 text-blue-600", theme: "editor", views: "58.2만", comments: "6.8만", saves: "1,021" },
  ],
  생산성: [
    { title: "크리에이터 업무 시간 줄이는 루틴", account: "@productivity.kr", time: "0:35", tag: "생산성", tagTone: "bg-emerald-50 text-emerald-600", theme: "laptop", views: "65.2만", comments: "6.7만", saves: "932" },
    { title: "콘텐츠 캘린더를 하루에 정리하는 법", account: "@plan_creator", time: "0:34", tag: "생산성", tagTone: "bg-emerald-50 text-emerald-600", theme: "screen", views: "42.9만", comments: "4.4만", saves: "710" },
    { title: "릴스 아이디어를 놓치지 않는 기록법", account: "@idea_note", time: "0:26", tag: "생산성", tagTone: "bg-emerald-50 text-emerald-600", theme: "tags", views: "29.8만", comments: "3.3만", saves: "584" },
  ],
  데일리룩: [
    { title: "출근룩 코디 3가지 정리", account: "@office_style", time: "0:27", tag: "데일리룩", tagTone: "bg-orange-50 text-orange-600", theme: "fashion", views: "54.8만", comments: "6.1만", saves: "876" },
    { title: "기본템으로 만드는 일주일 코디", account: "@daily_fit", time: "0:30", tag: "데일리룩", tagTone: "bg-orange-50 text-orange-600", theme: "fashion", views: "47.2만", comments: "5.6만", saves: "802" },
    { title: "하객룩 릴스에서 잘 먹히는 컷", account: "@style_clip", time: "0:24", tag: "데일리룩", tagTone: "bg-orange-50 text-orange-600", theme: "phone", views: "33.4만", comments: "3.8만", saves: "619" },
  ],
  생성형: [
    { title: "생성형 AI로 썸네일 문구 만들기", account: "@ai_creator", time: "0:33", tag: "생성형", tagTone: "bg-blue-50 text-blue-600", theme: "screen", views: "44.9만", comments: "5.4만", saves: "810" },
    { title: "이미지 AI로 릴스 콘셉트 잡기", account: "@design_ai", time: "0:29", tag: "생성형", tagTone: "bg-blue-50 text-blue-600", theme: "tags", views: "38.1만", comments: "4.1만", saves: "692" },
    { title: "AI 프롬프트로 콘텐츠 시리즈 만들기", account: "@prompt_lab", time: "0:31", tag: "생성형", tagTone: "bg-blue-50 text-blue-600", theme: "laptop", views: "35.7만", comments: "3.8만", saves: "640" },
  ],
  릴스편집: [
    { title: "릴스 편집 플로우 한 번에 정리", account: "@edit_flow", time: "0:48", tag: "릴스편집", tagTone: "bg-violet-50 text-violet-600", theme: "editor", views: "64.2만", comments: "7.8만", saves: "1,322" },
    { title: "컷 전환이 자연스러워지는 편집법", account: "@cut_master", time: "0:36", tag: "릴스편집", tagTone: "bg-violet-50 text-violet-600", theme: "screen", views: "51.6만", comments: "6.2만", saves: "997" },
    { title: "자막 위치만 바꿔도 완성도가 올라가는 법", account: "@caption_lab", time: "0:40", tag: "릴스편집", tagTone: "bg-violet-50 text-violet-600", theme: "phone", views: "46.8만", comments: "5.1만", saves: "875" },
  ],
  숏폼전략: [
    { title: "첫 3초 후킹을 만드는 숏폼 구조", account: "@shorts_plan", time: "0:42", tag: "숏폼전략", tagTone: "bg-pink-50 text-pink-600", theme: "phone", views: "55.8만", comments: "6.9만", saves: "1,121" },
    { title: "저장률 높은 릴스 기획 공식", account: "@save_rate", time: "0:37", tag: "숏폼전략", tagTone: "bg-pink-50 text-pink-600", theme: "tags", views: "48.4만", comments: "5.7만", saves: "940" },
    { title: "시리즈 콘텐츠로 팔로워 늘리기", account: "@series_lab", time: "0:34", tag: "숏폼전략", tagTone: "bg-pink-50 text-pink-600", theme: "screen", views: "43.2만", comments: "5.0만", saves: "822" },
  ],
  홈카페: [
    { title: "홈카페 컷을 따뜻하게 찍는 법", account: "@home_cafe", time: "0:31", tag: "홈카페", tagTone: "bg-orange-50 text-orange-600", theme: "food", views: "42.1만", comments: "4.8만", saves: "798" },
    { title: "커피 내리는 소리로 몰입감 만들기", account: "@coffee_clip", time: "0:26", tag: "홈카페", tagTone: "bg-orange-50 text-orange-600", theme: "room", views: "35.3만", comments: "3.9만", saves: "652" },
    { title: "디저트 플레이팅 릴스 구도", account: "@dessert_day", time: "0:28", tag: "홈카페", tagTone: "bg-orange-50 text-orange-600", theme: "food", views: "31.7만", comments: "3.2만", saves: "580" },
  ],
  챗GPT: [
    { title: "챗GPT로 릴스 대본 뽑는 법", account: "@prompt_lab", time: "0:33", tag: "챗GPT", tagTone: "bg-blue-50 text-blue-600", theme: "laptop", views: "51.9만", comments: "6.6만", saves: "1,034" },
    { title: "댓글 반응으로 다음 콘텐츠 찾기", account: "@ai_creator", time: "0:29", tag: "챗GPT", tagTone: "bg-blue-50 text-blue-600", theme: "screen", views: "40.2만", comments: "4.7만", saves: "721" },
    { title: "콘텐츠 제목 20개 한 번에 만들기", account: "@title_lab", time: "0:24", tag: "챗GPT", tagTone: "bg-blue-50 text-blue-600", theme: "tags", views: "37.6만", comments: "4.2만", saves: "688" },
  ],
  자기계발: [
    { title: "공부 기록 릴스가 저장되는 이유", account: "@growth_note", time: "0:34", tag: "자기계발", tagTone: "bg-emerald-50 text-emerald-600", theme: "room", views: "38.4만", comments: "4.5만", saves: "760" },
    { title: "목표 달성 과정을 콘텐츠로 만드는 법", account: "@goal_maker", time: "0:30", tag: "자기계발", tagTone: "bg-emerald-50 text-emerald-600", theme: "screen", views: "33.8만", comments: "3.8만", saves: "622" },
    { title: "책상 위 루틴으로 브랜딩하기", account: "@desk_start", time: "0:27", tag: "자기계발", tagTone: "bg-emerald-50 text-emerald-600", theme: "laptop", views: "29.5만", comments: "3.1만", saves: "574" },
  ],
  인스타성장: [
    { title: "팔로워가 느는 프로필 구성", account: "@growth_lab", time: "0:36", tag: "인스타성장", tagTone: "bg-violet-50 text-violet-600", theme: "screen", views: "92.4만", comments: "10.1만", saves: "2,304" },
    { title: "릴스 저장률을 올리는 게시 순서", account: "@reels_growth", time: "0:38", tag: "인스타성장", tagTone: "bg-violet-50 text-violet-600", theme: "tags", views: "80.8만", comments: "8.8만", saves: "1,982" },
    { title: "계정 분석으로 콘텐츠 주제 잡기", account: "@creator_data", time: "0:41", tag: "인스타성장", tagTone: "bg-violet-50 text-violet-600", theme: "laptop", views: "73.6만", comments: "7.9만", saves: "1,754" },
  ],
  브랜드협찬: [
    { title: "협찬 제안서에 꼭 들어갈 3가지", account: "@brand_deal", time: "0:35", tag: "브랜드협찬", tagTone: "bg-pink-50 text-pink-600", theme: "screen", views: "61.9만", comments: "7.2만", saves: "1,410" },
    { title: "브랜드가 좋아하는 피드 정리법", account: "@creator_biz", time: "0:32", tag: "브랜드협찬", tagTone: "bg-pink-50 text-pink-600", theme: "fashion", views: "56.4만", comments: "6.4만", saves: "1,125" },
    { title: "협찬 릴스에서 광고 느낌 줄이기", account: "@ad_soft", time: "0:29", tag: "브랜드협찬", tagTone: "bg-pink-50 text-pink-600", theme: "phone", views: "48.2만", comments: "5.1만", saves: "930" },
  ],
  맛집추천: [
    { title: "맛집 릴스 첫 컷은 이렇게 잡기", account: "@cook_easy", time: "0:31", tag: "맛집추천", tagTone: "bg-orange-50 text-orange-600", theme: "food", views: "70.4만", comments: "8.1만", saves: "1,640" },
    { title: "메뉴판 없이도 정보 전달하는 법", account: "@food_clip", time: "0:28", tag: "맛집추천", tagTone: "bg-orange-50 text-orange-600", theme: "food", views: "58.9만", comments: "6.5만", saves: "1,140" },
    { title: "웨이팅 맛집 분위기 담는 구도", account: "@taste_log", time: "0:30", tag: "맛집추천", tagTone: "bg-orange-50 text-orange-600", theme: "room", views: "47.5만", comments: "5.4만", saves: "987" },
  ],
};

const guides = [
  { label: "공략 팁스", title: "릴스 후킹 3초 공식", desc: "첫 3초가 조회수를 결정합니다.", time: "0:42", theme: "phone", tone: "violet" },
  { label: "강력 팁", title: "조회수 잘 나오는 썸네일 만들기", desc: "클릭을 부르는 썸네일 디자인 전략", time: "0:36", theme: "screen", tone: "pink" },
  { label: "가이드", title: "참여율 높이는 해시태그 조합", desc: "도달과 참여를 동시에 올리는 조합", time: "0:33", theme: "tags", tone: "emerald" },
  { label: "공략 팁스", title: "릴스 편집 플로우 한 번에 정리", desc: "촬영부터 업로드까지 쉽게 가이드", time: "0:48", theme: "editor", tone: "violet" },
];

function SectionHeader({ number, title, description, action }: { number: string; title: string; description: string; action?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-violet-600 text-xs font-black text-white shadow-sm shadow-violet-200">{number}</span>
        <h2 className="shrink-0 text-base font-black tracking-tight text-ink">{title}</h2>
        <p className="hidden truncate text-xs font-medium text-slate-500 sm:block">{description}</p>
      </div>
      {action ? (
        <Link className="shrink-0 text-xs font-black text-violet-600 hover:text-violet-700" href={ROUTES.recommendations}>
          {action} →
        </Link>
      ) : null}
    </div>
  );
}

function Thumb({ theme, compact = false }: { theme: string; compact?: boolean }) {
  const base = compact ? "h-[148px]" : "h-[124px]";

  return (
    <div className={`relative overflow-hidden rounded-t-xl ${base} bg-slate-100`}>
      {theme === "room" ? (
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#f5e7d7,#eef2e4)]">
          <div className="absolute bottom-4 left-4 h-9 w-20 rounded-lg bg-white/75 shadow-sm" />
          <div className="absolute right-5 top-5 h-20 w-10 rounded-full bg-emerald-300/70" />
          <div className="absolute left-7 top-7 h-12 w-16 rounded-xl bg-amber-200/70" />
        </div>
      ) : null}
      {theme === "beauty" ? (
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#fde2e8,#fff7ed)]">
          <div className="absolute bottom-0 left-1/2 h-24 w-16 -translate-x-1/2 rounded-t-full bg-[#f5c7b8]" />
          <div className="absolute left-7 top-7 size-8 rounded-full bg-white/80" />
          <div className="absolute right-8 top-9 h-12 w-2 rotate-[-18deg] rounded-full bg-pink-500" />
        </div>
      ) : null}
      {theme === "fashion" ? (
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#eee7df,#d8d2ca)]">
          <div className="absolute bottom-0 left-1/2 h-24 w-14 -translate-x-1/2 rounded-t-full bg-stone-700" />
          <div className="absolute bottom-8 left-8 h-12 w-8 rounded bg-stone-200 shadow" />
        </div>
      ) : null}
      {theme === "laptop" ? (
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#e2e8f0,#f8fafc)]">
          <div className="absolute bottom-7 left-7 right-7 h-16 rounded-lg bg-slate-900 shadow-lg">
            <div className="mx-auto mt-5 h-3 w-20 rounded bg-white/80" />
          </div>
          <div className="absolute bottom-5 left-5 right-5 h-2 rounded bg-slate-400" />
        </div>
      ) : null}
      {theme === "food" ? (
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#fff7ed,#fed7aa)]">
          <div className="absolute left-1/2 top-1/2 size-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow" />
          <div className="absolute left-1/2 top-1/2 size-16 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-300" />
          <div className="absolute left-[43%] top-[42%] h-2 w-12 rotate-12 rounded bg-red-500" />
        </div>
      ) : null}
      {theme === "phone" ? (
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#ede9fe,#fed7aa)]">
          <div className="absolute bottom-4 left-1/2 h-24 w-14 -translate-x-1/2 rotate-[-8deg] rounded-xl bg-white shadow-lg" />
          <div className="absolute bottom-8 left-1/2 h-14 w-9 -translate-x-1/2 rotate-[-8deg] rounded-lg bg-stone-700" />
        </div>
      ) : null}
      {theme === "screen" ? (
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#fce7f3,#dbeafe)]">
          <div className="absolute inset-x-8 top-7 h-16 rounded-xl bg-white shadow">
            <div className="m-3 grid grid-cols-3 gap-1">
              <span className="h-5 rounded bg-violet-200" />
              <span className="h-5 rounded bg-sky-200" />
              <span className="h-5 rounded bg-pink-200" />
            </div>
          </div>
        </div>
      ) : null}
      {theme === "tags" ? (
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#dbeafe,#f8fafc)]">
          {["#브이로그", "#해시태그", "#AI툴"].map((tag, index) => (
            <span className="absolute rounded-full bg-white px-3 py-1 text-[10px] font-black text-slate-700 shadow-sm" key={tag} style={{ left: 22 + index * 16, top: 24 + index * 22 }}>
              {tag}
            </span>
          ))}
        </div>
      ) : null}
      {theme === "editor" ? (
        <div className="absolute inset-0 bg-slate-900">
          <div className="absolute left-4 right-4 top-5 h-16 rounded bg-slate-700" />
          <div className="absolute bottom-5 left-4 right-4 grid grid-cols-4 gap-1">
            <span className="h-4 rounded bg-violet-400" />
            <span className="h-4 rounded bg-slate-500" />
            <span className="h-4 rounded bg-pink-400" />
            <span className="h-4 rounded bg-slate-500" />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ReelCard({ reel }: { reel: (typeof reels)[number] }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm shadow-slate-100 transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md">
      <div className="relative overflow-hidden rounded-lg">
        <Thumb theme={reel.theme} />
        <span className="absolute bottom-1.5 right-1.5 rounded-full bg-black/80 px-1.5 py-0.5 text-[9px] font-bold text-white">{reel.time}</span>
      </div>
      <div className="px-1 pb-1 pt-2">
        <h3 className="line-clamp-2 min-h-[32px] text-[11px] font-black leading-4 text-ink">{reel.title}</h3>
        <p className="mt-1 text-[10px] font-semibold text-slate-400">{reel.account}</p>
        <div className="mt-2 flex items-center gap-2 text-[9px] font-bold text-slate-400">
          <span className="inline-flex items-center gap-0.5">▷ {reel.views}</span>
          <span className="inline-flex items-center gap-0.5">♡ {reel.comments}</span>
          <span className="inline-flex items-center gap-0.5">□ {reel.saves}</span>
        </div>
        <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[9px] font-black ${reel.tagTone}`}>{reel.tag}</span>
      </div>
    </article>
  );
}

function KeywordTabs({ activePeriod, onChange }: { activePeriod: KeywordPeriod; onChange: (period: KeywordPeriod) => void }) {
  return (
    <div className="flex shrink-0 rounded-full bg-slate-100 p-1 text-[11px] font-black">
      {keywordPeriods.map((period) => {
        const isActive = activePeriod === period;

        return (
          <button
            className={`rounded-full px-4 py-1 transition ${
              isActive ? "bg-violet-600 text-white shadow-sm shadow-violet-200" : "text-slate-500 hover:text-violet-700"
            }`}
            key={period}
            onClick={() => onChange(period)}
            type="button"
          >
            {period}
          </button>
        );
      })}
    </div>
  );
}

function KeywordChart({ period }: { period: KeywordPeriod }) {
  const chart = keywordChartData[period];

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
      <div className="mb-3 flex items-center gap-3">
        <h3 className="text-sm font-black text-ink">키워드 트렌드 그래프</h3>
      </div>
      <svg className="h-[190px] w-full" role="img" viewBox="0 0 560 190">
        {[35, 70, 105, 140, 175].map((y) => (
          <line key={y} opacity="0.12" stroke="#64748b" x1="18" x2="550" y1={y} y2={y} />
        ))}
        {chart.paths.map((path, index) => (
          <path d={path} fill="none" key={path} stroke={keywordColors[index]} strokeLinecap="round" strokeWidth="2.5" />
        ))}
        <g className="text-[10px] font-bold">
          {chart.labels.map((label, index) => (
            <text fill="#64748b" key={label} x={[24, 125, 232, 338, 444, 518][index]} y="187">
              {label}
            </text>
          ))}
        </g>
      </svg>
      <div className="mt-2 flex flex-wrap gap-4 text-[10px] font-bold text-slate-500">
        {["브이로그", "모닝루틴", "AI툴", "생산성", "데일리룩"].map((label, index) => (
          <span className="inline-flex items-center gap-1.5" key={label}>
            <i className={["bg-violet-500", "bg-pink-500", "bg-blue-500", "bg-emerald-500", "bg-orange-500"][index] + " size-1.5 rounded-full"} />
            {label}
          </span>
        ))}
      </div>
    </article>
  );
}

function RankingCard({
  title,
  rows,
  rising = false,
  selectedKeyword,
  onKeywordSelect,
}: {
  title: string;
  rows: string[][];
  rising?: boolean;
  selectedKeyword: string | null;
  onKeywordSelect: (keyword: string) => void;
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-base font-black text-ink">{title}</h3>
      <div className="mt-4 space-y-4">
        {rows.map(([label, value], index) => (
          <button
            className={`flex w-full items-center justify-between gap-3 rounded-lg text-left text-sm font-bold transition ${
              selectedKeyword === label ? "text-violet-700" : "text-slate-700 hover:text-violet-700"
            }`}
            key={label}
            onClick={() => onKeywordSelect(label)}
            type="button"
          >
            <span className="flex min-w-0 items-center gap-2.5 text-slate-700">
              <span
                className={`flex size-7 shrink-0 items-center justify-center rounded-md text-xs ${
                  selectedKeyword === label ? "bg-violet-600 text-white" : "bg-violet-100 text-violet-700"
                }`}
              >
                {index + 1}
              </span>
              <span className={`truncate ${selectedKeyword === label ? "text-violet-700" : ""}`}>{label}</span>
            </span>
            <span className={rising ? "text-emerald-600" : "text-slate-500"}>{rising ? `▲ ${value}` : value}</span>
          </button>
        ))}
      </div>
    </article>
  );
}

function KeywordReelResults({ keyword, reels }: { keyword: string; reels: typeof keywordReels[string] }) {
  return (
    <div className="mt-3 rounded-xl border border-violet-100 bg-violet-50/40 p-3 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black text-violet-700">선택한 키워드</p>
          <h3 className="mt-1 text-base font-black text-ink">{keyword} 관련 릴스</h3>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-violet-700 shadow-sm">{reels.length}개 추천</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {reels.map((reel) => (
          <ReelCard key={`${keyword}-${reel.title}`} reel={reel} />
        ))}
      </div>
    </div>
  );
}

function GuideCard({ guide }: { guide: (typeof guides)[number] }) {
  const toneClasses = {
    emerald: "bg-emerald-500",
    pink: "bg-pink-500",
    violet: "bg-violet-600",
  }[guide.tone];

  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-sm shadow-slate-100 transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md">
      <div className="relative overflow-hidden rounded-lg">
        <Thumb compact theme={guide.theme} />
        <span className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-black text-white ${toneClasses}`}>
          {guide.label}
        </span>
        <span className="absolute bottom-2 right-2 rounded-full bg-black/75 px-2 py-0.5 text-[10px] font-bold text-white">
          {guide.time}
        </span>
      </div>
      <div className="px-1 pb-2 pt-3">
        <h3 className="line-clamp-2 min-h-[38px] text-sm font-black leading-5 text-ink">{guide.title}</h3>
        <p className="mt-1 text-xs font-medium leading-5 text-slate-500">{guide.desc}</p>
      </div>
    </article>
  );
}

function TrendTipBanner() {
  return (
    <aside className="rounded-2xl border border-violet-100 bg-[linear-gradient(90deg,#f1e9ff_0%,#fff1f8_100%)] px-5 py-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white text-3xl shadow-sm">💡</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-ink">트렌드는 참고하고, 내 계정에 맞게 응용하는 것이 가장 중요해요.</p>
          <p className="mt-1 text-xs font-medium text-slate-500">데이터를 보고 나만의 릴스 전략을 만들어보세요.</p>
        </div>
        <span className="hidden text-3xl font-black text-pink-400 sm:block">✦</span>
      </div>
    </aside>
  );
}

export default function TrendsPage() {
  const [keywordPeriod, setKeywordPeriod] = useState<KeywordPeriod>("일별");
  const [selectedTopKeyword, setSelectedTopKeyword] = useState<string | null>(null);
  const [selectedRisingKeyword, setSelectedRisingKeyword] = useState<string | null>(null);
  const [selectedResultKeyword, setSelectedResultKeyword] = useState<string | null>(null);
  const keywordRanking = keywordRankingData[keywordPeriod];
  const selectedKeywordReels = selectedResultKeyword ? keywordReels[selectedResultKeyword] : null;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-bold text-slate-500">트렌드&nbsp;&nbsp;/&nbsp;&nbsp;trends</p>
        <h1 className="text-4xl font-black tracking-tight text-ink">
          트렌드 페이지 <span className="text-violet-600">✦</span>
        </h1>
        <p className="text-sm font-medium leading-6 text-slate-500">지금 인기 있는 릴스와 급상승 키워드, 그리고 인스타 공략 콘텐츠를 한눈에 확인하세요.</p>
      </header>

      <section>
        <SectionHeader number="1" title="현재 인기 릴스" description="지금 가장 반응이 좋은 릴스를 확인해보세요." action="전체 보기" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {reels.map((reel) => (
            <ReelCard key={reel.title} reel={reel} />
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between [&>div:first-child]:mb-0">
          <SectionHeader number="2" title="급상승 키워드" description="일별, 주별, 월별 흐름으로 키워드 변화를 분석하세요." />
          <KeywordTabs
            activePeriod={keywordPeriod}
            onChange={(period) => {
              setKeywordPeriod(period);
              setSelectedTopKeyword(null);
              setSelectedRisingKeyword(null);
              setSelectedResultKeyword(null);
            }}
          />
        </div>
        <div className="grid gap-3 lg:grid-cols-4">
          <KeywordChart period={keywordPeriod} />
          <RankingCard
            onKeywordSelect={(keyword) => {
              setSelectedTopKeyword(keyword);
              setSelectedRisingKeyword(null);
              setSelectedResultKeyword(keyword);
            }}
            rows={keywordRanking.top}
            selectedKeyword={selectedTopKeyword}
            title="인기 키워드 TOP 5"
          />
          <RankingCard
            onKeywordSelect={(keyword) => {
              setSelectedRisingKeyword(keyword);
              setSelectedTopKeyword(null);
              setSelectedResultKeyword(keyword);
            }}
            rising
            rows={keywordRanking.rising}
            selectedKeyword={selectedRisingKeyword}
            title="상승 키워드"
          />
        </div>
        {selectedResultKeyword && selectedKeywordReels ? (
          <KeywordReelResults keyword={selectedResultKeyword} reels={selectedKeywordReels} />
        ) : null}
        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-black text-ink">연관 해시태그</span>
            {hashtags.map((tag) => (
              <span className="rounded-full bg-violet-50 px-3 py-1 text-[11px] font-bold text-violet-700" key={tag}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section>
        <SectionHeader number="3" title="인스타 공략집" description="성장에 도움이 되는 실전 공략 콘텐츠를 확인하세요." action="더 보기" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {guides.map((guide) => (
            <GuideCard guide={guide} key={guide.title} />
          ))}
        </div>
        <div className="mt-4">
          <TrendTipBanner />
        </div>
      </section>
    </div>
  );
}
